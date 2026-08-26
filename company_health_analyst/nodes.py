import json
import logging
from typing import Any

from google import genai
from google.adk import Event
from google.adk.agents.context import Context
from google.genai import types
from pydantic import BaseModel

from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from company_health_analyst.app_utils.config import AGENT_MODEL
from company_health_analyst.prompts import PromptTemplate
from company_health_analyst.schemas import (
    IntentCategory,
    IntentClassification,
    SearchResultItem,
)
from company_health_analyst.services import (
    MockInternalService,
    MockSearchService,
)
from company_health_analyst.subagents import (
    explanation_agent,
    intake_agent,
)

logger = logging.getLogger(__name__)

_genai_client: genai.Client | None = None


def _get_genai_client() -> genai.Client:
    """Returns a singleton genai.Client initialized from environment ADC."""
    global _genai_client
    if _genai_client is None:
        _genai_client = genai.Client()
    return _genai_client


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=False,
)
async def classify_intent_async(query: str) -> IntentCategory:
    """Classifies user query intent using Vertex AI without mutating session event history.

    Args:
        query: The raw string query from the user.

    Returns:
        The classified IntentCategory enum.
    """
    client = _get_genai_client()
    response = await client.aio.models.generate_content(
        model=AGENT_MODEL,
        contents=f"Classify user query: {query}",
        config=types.GenerateContentConfig(
            system_instruction=PromptTemplate.INTENT_CLASSIFIER,
            response_mime_type="application/json",
            response_schema=IntentClassification,
            temperature=0.0,
        ),
    )
    if response.parsed and isinstance(response.parsed, IntentClassification):
        return response.parsed.intent

    if response.text:
        data = json.loads(response.text)
        return IntentCategory(data.get("intent", IntentCategory.FALLBACK.value))

    return IntentCategory.FALLBACK


async def route_user_request(node_input: Any, ctx: Context) -> Event | None:
    """Routes incoming user requests to subagents and triggers searches on task completion.

    Args:
        node_input: The incoming user message from START.
        ctx: The ADK workflow context.

    Returns:
        Event with route='searches' and output=CompanyBrief when intake completes its task,
        or None when the turn is conversational and awaiting further user input.
    """
    is_report_created = ctx.state.get("is_report_created", False)
    query = _extract_text_input(node_input, ctx)

    if is_report_created:
        try:
            intent = await classify_intent_async(query)
        except Exception as exc:
            logger.warning("Intent classification failed: %s. Falling back to explanation.", exc)
            intent = IntentCategory.FALLBACK

        logger.info("Classified post-report intent as: %s for query: '%s'", intent, query)
        if intent in (IntentCategory.GENERATE_REPORT, IntentCategory.MODIFY):
            ctx.state["is_report_created"] = False
            res = await ctx.run_node(intake_agent, node_input=query, use_as_output=True)
            if res is not None:
                brief = res.model_dump() if isinstance(res, BaseModel) else res
                ctx.state["company_brief"] = brief
                return Event(output=brief, route="searches")
            return None
        else:
            await ctx.run_node(explanation_agent, node_input=query, use_as_output=True)
            return None
    else:
        res = await ctx.run_node(intake_agent, node_input=query, use_as_output=True)
        if res is not None:
            brief = res.model_dump() if isinstance(res, BaseModel) else res
            ctx.state["company_brief"] = brief
            return Event(output=brief, route="searches")
        return None


def _extract_text_input(node_input: Any, ctx: Context) -> str:
    """Safely extracts a clean string from node_input, falling back to original_input in state.

    Args:
        node_input: Input passed to the node.
        ctx: The ADK workflow context.

    Returns:
        Extracted string query.
    """
    if isinstance(node_input, Event):
        raw_msg = node_input.message or ctx.state.get("original_input", "")
        if isinstance(raw_msg, str):
            return raw_msg
        elif hasattr(raw_msg, "parts") and raw_msg.parts:
            return "".join(part.text for part in raw_msg.parts if getattr(part, "text", None))
    elif hasattr(node_input, "parts") and getattr(node_input, "parts", None):
        return "".join(part.text for part in node_input.parts if getattr(part, "text", None))
    return str(node_input) if node_input is not None else ctx.state.get("original_input", "")


def run_web_search(ctx: Context) -> list[SearchResultItem]:
    """Deterministic node fetching public corporate filings and news.

    Args:
        ctx: The ADK workflow context.

    Returns:
        List of web search result items.
    """
    brief = ctx.state.get("company_brief", {})
    if isinstance(brief, BaseModel):
        brief = brief.model_dump()

    company = brief.get("company_name", "")
    region = brief.get("region", "")
    time_span = brief.get("time_span", "")

    results = MockSearchService.search_web(
        company=company,
        region=region,
        time_span=time_span,
    )
    logger.info("run_web_search returned %d items for company '%s'.", len(results), company)
    return results


def run_internal_search(ctx: Context) -> list[SearchResultItem]:
    """Deterministic node fetching internal company reports and financial archives.

    Args:
        ctx: The ADK workflow context.

    Returns:
        List of internal database search result items.
    """
    brief = ctx.state.get("company_brief", {})
    if isinstance(brief, BaseModel):
        brief = brief.model_dump()

    company = brief.get("company_name", "")
    region = brief.get("region", "")
    time_span = brief.get("time_span", "")

    results = MockInternalService.search_internal(
        company=company,
        region=region,
        time_span=time_span,
    )
    logger.info(
        "run_internal_search returned %d items for company '%s'.",
        len(results),
        company,
    )
    return results


def format_search_inputs(node_input: dict[str, Any], ctx: Context) -> str:
    """Formats parallel search outputs into a text prompt for the synthesizer.

    Args:
        node_input: Dictionary of outputs from upstream search nodes keyed by node name.
        ctx: The ADK workflow context.

    Returns:
        Formatted text string of search results for the synthesizer agent.
    """
    web_items: list[Any] = node_input.get("run_web_search", [])
    internal_items: list[Any] = node_input.get("run_internal_search", [])

    ctx.state["search_results"] = {
        "web": [item.model_dump() if hasattr(item, "model_dump") else item for item in web_items],
        "internal": [
            item.model_dump() if hasattr(item, "model_dump") else item for item in internal_items
        ],
    }

    prompt_sections: list[str] = ["### PUBLIC WEB SEARCH RESULTS:"]
    for i, item in enumerate(web_items):
        title = getattr(item, "title", str(item))
        snippet = getattr(item, "snippet", "")
        url = getattr(item, "url", "N/A") or "N/A"
        prompt_sections.append(f"{i + 1}. **{title}**\n   {snippet}\n   URL: {url}")

    prompt_sections.append("\n### INTERNAL DATABASE SEARCH RESULTS:")
    for i, item in enumerate(internal_items):
        title = getattr(item, "title", str(item))
        snippet = getattr(item, "snippet", "")
        prompt_sections.append(f"{i + 1}. **{title}**\n   {snippet}")

    formatted_text = "\n".join(prompt_sections)
    return formatted_text


def save_report_to_db(node_input: Any, ctx: Context) -> str:
    """Saves the synthesized report to state/db and marks report as complete.

    Args:
        node_input: Output from report_synthesizer_agent (Event, types.Content, or str).
        ctx: The ADK workflow context.

    Returns:
        The markdown string of the synthesized report.
    """
    report_text = ""
    if isinstance(node_input, Event):
        report_text = node_input.output or ""
    elif isinstance(node_input, types.Content):
        report_text = "".join(part.text for part in node_input.parts if getattr(part, "text", None))
    elif hasattr(node_input, "parts") and getattr(node_input, "parts", None):
        report_text = "".join(part.text for part in node_input.parts if getattr(part, "text", None))
    else:
        report_text = str(node_input)

    ctx.state["report_markdown"] = report_text
    ctx.state["is_report_created"] = True

    logger.info("Report saved to state context successfully.")
    return report_text
