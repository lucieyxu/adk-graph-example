import logging
from typing import Any

from google.adk import Event
from google.adk.agents.context import Context
from google.adk.events.event_actions import EventActions
from google.adk.events.request_input import RequestInput
from google.adk.workflow import node
from google.genai import types
from pydantic import BaseModel

from company_health_analyst.schemas import (
    IntakeValidationResponse,
    SearchResultItem,
)
from company_health_analyst.services import (
    MockInternalService,
    MockSearchService,
)

logger = logging.getLogger(__name__)

REJECTED_STATUS = "rejected_by_user"
"""Marks a pipeline run the human declined at the validation gate.

Returned as the tool result so a later coordinator turn can see the analysis did not
run, rather than answering follow-ups about a report that does not exist.
"""

REJECTED_MESSAGE = (
    "You cancelled this analysis at the confirmation step, so nothing was searched and "
    "no report was produced. Tell me what to change and I will set it up again."
)
"""Shown to the user when they cancel from the validation form."""


@node(name="validate_intake_node", rerun_on_resume=True)
async def validate_intake_node(node_input: Any, ctx: Context) -> Event | RequestInput | None:
    """Validates the requested parameters with a human before any searching begins.

    This is the pipeline's entry node: ``node_input`` is the validated
    :class:`~company_health_analyst.schemas.PipelineInput` the coordinator agent passed
    when it called the pipeline tool.

    Args:
        node_input: The PipelineInput (or equivalent mapping) for this analysis run.
        ctx: The ADK workflow context.

    Returns:
        RequestInput when awaiting human approval/edits; an Event routed to 'searches'
        with the confirmed brief when the human approves; or an unrouted Event carrying
        REJECTED_STATUS when the human declines, which ends the run without searching.
    """
    brief_data = node_input
    if isinstance(brief_data, BaseModel):
        brief_data = brief_data.model_dump()
    elif not isinstance(brief_data, dict):
        brief_data = ctx.state.get("company_brief") or {}

    # Cycle-scoped interrupt IDs keep each pipeline invocation asking for its own
    # confirmation. A static ID would find the previous cycle's answer already present
    # in ctx.resume_inputs and silently skip the HITL step with stale parameters.
    #
    # `validation_cycles` counts gates the human has ANSWERED, approved or declined,
    # and is only advanced on the resume pass. That keeps the ID stable across this
    # node's interrupt/resume pair (it reruns on resume) while still advancing between
    # runs. Counting approvals only would let a declined run reuse its own ID on the
    # retry, rediscover its own rejection in resume_inputs, and decline again without
    # ever asking the human.
    cycle = ctx.state.get("validation_cycles", 0) + 1
    interrupt_id = f"validate_captured_brief_{cycle}"

    # Step 1: Interrupt if human input is not yet received
    if not ctx.resume_inputs or interrupt_id not in ctx.resume_inputs:
        msg = (
            "Please review and confirm the captured company parameters before analysis begins:\n"
            f"- Company Name: {brief_data.get('company_name', '')}\n"
            f"- Timeframe: {brief_data.get('time_span', '')}\n"
            f"- Region: {brief_data.get('region', '')}"
        )
        return RequestInput(
            interrupt_id=interrupt_id,
            message=msg,
            payload=brief_data,
            response_schema=IntakeValidationResponse,
        )

    # Step 2: Resume with human validation input
    resume_data = ctx.resume_inputs[interrupt_id]
    if isinstance(resume_data, IntakeValidationResponse):
        validated = resume_data
    elif isinstance(resume_data, dict):
        # Filter out empty or null values so blank form fields in the UI
        # do not overwrite the parameters the coordinator captured.
        overrides = {
            k: v
            for k, v in resume_data.items()
            if v is not None and (not isinstance(v, str) or v.strip() != "")
        }
        validated = IntakeValidationResponse(**{**brief_data, **overrides})
    else:
        validated = IntakeValidationResponse(**brief_data)

    # The gate is now answered either way, so retire this cycle before branching.
    ctx.state["validation_cycles"] = cycle

    if validated.cancel:
        logger.info("Intake cancelled by human (cycle %d): %s", cycle, brief_data)
        # The coordinator is not re-invoked once this tool resumes, so the node has to
        # address the user itself or the turn ends in silence. `content` is what the
        # client renders; `output` is what the tool call returns.
        #
        # No route either: every outgoing edge of this node is gated on 'searches', so
        # an unrouted event ends the workflow here without searching. The declined
        # parameters are deliberately not written to company_brief.
        return Event(
            content=types.Content(
                role="model",
                parts=[types.Part.from_text(text=REJECTED_MESSAGE)],
            ),
            output={
                "status": REJECTED_STATUS,
                "rejected_parameters": brief_data,
                "message": REJECTED_MESSAGE,
            },
        )

    confirmed_brief = validated.model_dump(exclude={"cancel"})
    ctx.state["company_brief"] = confirmed_brief
    logger.info("Intake validated by human (cycle %d): %s", cycle, confirmed_brief)

    return Event(output=confirmed_brief, actions=EventActions(route="searches"))


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
        report_text = str(node_input.output or "")
    elif isinstance(node_input, types.Content):
        parts = node_input.parts or []
        report_text = "".join(part.text or "" for part in parts if getattr(part, "text", None))
    elif hasattr(node_input, "parts"):
        parts_list = getattr(node_input, "parts") or []
        report_text = "".join(
            getattr(part, "text", "") or "" for part in parts_list if getattr(part, "text", None)
        )
    else:
        report_text = str(node_input)

    ctx.state["report_markdown"] = report_text
    ctx.state["is_report_created"] = True

    logger.info("Report saved to state context successfully.")
    return report_text
