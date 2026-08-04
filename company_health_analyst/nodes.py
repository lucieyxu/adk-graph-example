import logging
from collections.abc import AsyncGenerator
from typing import Any

from google.adk import Event
from google.adk.agents.context import Context
from google.adk.events.request_input import RequestInput
from google.adk.workflow import node

from company_health_analyst.subagents import (
    intent_classifier_agent,
    extractor_agent,
    explanation_agent,
)
from company_health_analyst.schemas import (
    CompanyBrief,
    ExtractorOutput,
    IntentCategory,
    IntentClassification,
    SearchResultItem,
)
from company_health_analyst.services import (
    DateNormalizationService,
    MockSearchService,
    MockInternalService,
)

logger = logging.getLogger(__name__)


def _recursive_merge(target: dict[str, Any], source: dict[str, Any]) -> dict[str, Any]:
    """Recursively merges source dict properties into target dict in-place."""
    for key, value in source.items():
        if isinstance(value, dict) and isinstance(target.get(key), dict):
            _recursive_merge(target[key], value)
        elif value is None:
            continue
        elif isinstance(value, (list, dict, str)) and not value:
            continue
        else:
            target[key] = value
    return target


def _extract_text_input(node_input: Any, ctx: Context) -> str:
    """Safely extracts a clean string from node_input, falling back to original_input in state."""
    if isinstance(node_input, Event):
        raw_msg = node_input.message or ctx.state.get("original_input", "")
        if isinstance(raw_msg, str):
            return raw_msg
        elif hasattr(raw_msg, "parts") and raw_msg.parts:
            return "".join(part.text for part in raw_msg.parts if getattr(part, "text", None))
    elif hasattr(node_input, "parts") and getattr(node_input, "parts", None):
        return "".join(part.text for part in node_input.parts if getattr(part, "text", None))
    return str(node_input) if node_input is not None else ctx.state.get("original_input", "")


def _is_brief_complete(brief: dict[str, Any]) -> bool:
    """O(1) check if brief contains all mandatory fields."""
    return bool(brief.get("company_name") and brief.get("time_span") and brief.get("region"))


def _is_brief_empty(brief: dict[str, Any]) -> bool:
    """Checks if the brief has no details captured yet."""
    return not (brief.get("company_name") or brief.get("time_span") or brief.get("region"))


@node
async def classify_and_route(node_input: Any, ctx: Context) -> AsyncGenerator[Event, None]:
    """Classifies user intent and routes execution dynamically."""
    input_text = _extract_text_input(node_input, ctx)
    ctx.state["original_input"] = input_text

    logger.info(f"classify_and_route received query: {input_text}")

    logger.info("Running LLM classifier on query.")
    inv_ctx = ctx.get_invocation_context()
    classification = None

    async for event in intent_classifier_agent.run_async(inv_ctx):
        if hasattr(event, "usage_metadata") and event.usage_metadata:
            yield Event(usage_metadata=event.usage_metadata)

        if event.is_final_response():
            raw = event.output
            if not raw and event.content:
                raw = "".join(part.text for part in event.content.parts if hasattr(part, "text"))
            if raw:
                try:
                    if isinstance(raw, str):
                        classification = IntentClassification.model_validate_json(raw)
                    elif isinstance(raw, dict):
                        classification = IntentClassification.model_validate(raw)
                except Exception as e:
                    logger.error(f"Failed to parse classification: {e}")
                    classification = None

    if not classification:
        logger.warning("Classifier failed. Defaulting to fallback.")
        yield Event(route="fallback")
        return

    intent = classification.intent
    logger.info(f"Classified intent: {intent.value}")

    is_report_created = ctx.state.get("is_report_created", False)

    # Custom guardrails or overrides
    if intent == IntentCategory.CONFIRM_REPORT and is_report_created:
        msg = "The report has already been created. You can ask follow-up questions about it."
        yield Event(message=msg)
        return

    # Route mappings
    route = intent.value
    state_delta = {}
    if intent in (IntentCategory.MODIFY, IntentCategory.GENERATE_REPORT):
        if intent == IntentCategory.MODIFY:
            # Route back to extraction node to let it parse and merge parameters
            route = "generate_report"
        state_delta["is_report_created"] = False

    yield Event(route=route, state=state_delta or None)


@node
async def extract_brief_and_validate(node_input: Any, ctx: Context) -> AsyncGenerator[Event, None]:
    """Extracts structured brief fields from inputs and validates completeness."""
    input_text = _extract_text_input(node_input, ctx)
    logger.info(f"extract_brief_and_validate received query: {input_text}")
    yield Event(message="Extracting information...")

    current_brief = ctx.state.get("company_brief", {})
    inv_ctx = ctx.get_invocation_context()
    extractor_output = None

    async for event in extractor_agent.run_async(inv_ctx):
        if hasattr(event, "usage_metadata") and event.usage_metadata:
            yield Event(usage_metadata=event.usage_metadata)

        if event.is_final_response():
            raw = event.output
            if not raw and event.content:
                raw = "".join(part.text for part in event.content.parts if hasattr(part, "text"))
            if raw:
                try:
                    if isinstance(raw, str):
                        extractor_output = ExtractorOutput.model_validate_json(raw)
                    elif isinstance(raw, dict):
                        extractor_output = ExtractorOutput.model_validate(raw)
                except Exception as e:
                    logger.error(f"Failed to parse extractor output: {e}")

    if not extractor_output or not extractor_output.company_brief:
        logger.warning("Extraction returned empty brief.")
        err_msg = (
            "I couldn't extract any company details. Please provide a company name, "
            "timeframe, or region."
        )
        yield Event(route="missing", state={"missing_prompt": err_msg})
        return

    # 1. Merge extracted parameters recursively into state
    extracted_dict = extractor_output.company_brief.model_dump(mode="json", exclude_unset=True)
    merged_brief = _recursive_merge(current_brief, extracted_dict)

    # 2. Normalize timeframe dates
    time_span = merged_brief.get("time_span")
    normalized_time, date_warning = DateNormalizationService.normalize_timespan(time_span)
    merged_brief["time_span"] = normalized_time

    # 3. Check for mandatory fields completeness
    missing_fields = []
    if not merged_brief.get("company_name"):
        missing_fields.append("company name")
    if not merged_brief.get("time_span"):
        missing_fields.append("time span (e.g. Q1 2026)")
    if not merged_brief.get("region"):
        missing_fields.append("region (e.g. Europe)")

    state_delta = {
        "company_brief": merged_brief,
        "date_warning": date_warning,
        "is_report_created": False,
    }

    if missing_fields:
        missing_str = ", ".join(missing_fields)
        missing_prompt = (
            f"I have captured some details, but I still need: {missing_str}. "
            "Could you please specify them?"
        )
        if len(missing_fields) == 3:
            missing_prompt = (
                "Please specify the company name, time span (e.g., last year), "
                "and region (e.g., US) you'd like to analyze."
            )
        elif merged_brief.get("company_name"):
            missing_prompt = (
                f"I have captured {merged_brief['company_name']}, but I still need: "
                f"{missing_str}. Could you please specify them?"
            )

        ctx.state["missing_prompt"] = missing_prompt
        state_delta["missing_prompt"] = missing_prompt
        yield Event(route="missing", state=state_delta)
    else:
        yield Event(route="complete", state=state_delta)


@node(rerun_on_resume=True)
async def prompt_user_for_missing_fields(
    node_input: Any, ctx: Context
) -> AsyncGenerator[Any, None]:
    """HITL node that pauses workflow to query missing parameters."""
    loop_count = ctx.state.get("missing_fields_loop_count", 0)
    interrupt_id = f"missing_fields_reply_{loop_count}"

    if interrupt_id in ctx.resume_inputs:
        reply = _extract_text_input(ctx.resume_inputs[interrupt_id], ctx)
        logger.info(f"HITL resumed in prompt_user_for_missing_fields: {reply}")
        ctx.state["missing_fields_loop_count"] = loop_count + 1
        yield Event(route="classify_and_route", state={"original_input": reply})
        return

    prompt = ctx.state.get("missing_prompt", "Please provide the missing analysis details.")
    logger.info(f"HITL pausing workflow in prompt_user_for_missing_fields: {prompt}")
    yield RequestInput(interrupt_id=interrupt_id, message=prompt)


@node(rerun_on_resume=True)
async def prompt_user_for_confirmation(node_input: Any, ctx: Context) -> AsyncGenerator[Any, None]:
    """HITL node that pauses workflow for final brief verification."""
    loop_count = ctx.state.get("confirmation_loop_count", 0)
    interrupt_id = f"confirmation_reply_{loop_count}"

    if interrupt_id in ctx.resume_inputs:
        reply = _extract_text_input(ctx.resume_inputs[interrupt_id], ctx)
        logger.info(f"HITL resumed in prompt_user_for_confirmation: {reply}")
        ctx.state["confirmation_loop_count"] = loop_count + 1
        yield Event(route="classify_and_route", state={"original_input": reply})
        return

    brief = CompanyBrief.model_validate(ctx.state.get("company_brief", {}))
    fluent_details = (
        f"Company: {brief.company_name}\nTime Span: {brief.time_span}\nRegion: {brief.region}"
    )

    message = (
        f"I've successfully captured the parameters for the analysis:\n\n"
        f"{fluent_details}\n\nDoes this look correct?"
    )
    logger.info(f"HITL pausing workflow in prompt_user_for_confirmation: {message}")
    yield RequestInput(interrupt_id=interrupt_id, message=message)


def confirm_brief_and_run_searches(ctx: Context) -> Event:
    """Pre-search transition node fanning out to parallel searches."""
    return Event(route="continue")


def run_web_search(ctx: Context) -> list[SearchResultItem]:
    """Deterministic node fetching public corporate filings/news."""
    brief = ctx.state.get("company_brief", {})
    results = MockSearchService.search_web(
        company=brief.get("company_name", ""),
        region=brief.get("region", ""),
        time_span=brief.get("time_span", ""),
    )
    logger.info(f"run_web_search returned {len(results)} items.")
    return results


def run_internal_search(ctx: Context) -> list[SearchResultItem]:
    """Deterministic node fetching internal company reports."""
    brief = ctx.state.get("company_brief", {})
    results = MockInternalService.search_internal(
        company=brief.get("company_name", ""),
        region=brief.get("region", ""),
        time_span=brief.get("time_span", ""),
    )
    logger.info(f"run_internal_search returned {len(results)} items.")
    return results


def format_search_inputs(node_input: dict[str, Any], ctx: Context) -> Event:
    """Formats parallel search outputs into a text prompt for the synthesizer."""
    web_items = node_input.get("run_web_search", [])
    internal_items = node_input.get("run_internal_search", [])

    # Store raw results in state for tools reference
    ctx.state["search_results"] = {
        "web": [item.model_dump() if hasattr(item, "model_dump") else item for item in web_items],
        "internal": [
            item.model_dump() if hasattr(item, "model_dump") else item for item in internal_items
        ],
    }

    # Format text prompt
    prompt_sections = []

    prompt_sections.append("### PUBLIC WEB SEARCH RESULTS:")
    for i, item in enumerate(web_items):
        prompt_sections.append(
            f"{i + 1}. **{item.title}**\n   {item.snippet}\n   URL: {item.url or 'N/A'}"
        )

    prompt_sections.append("\n### INTERNAL DATABASE SEARCH RESULTS:")
    for i, item in enumerate(internal_items):
        prompt_sections.append(f"{i + 1}. **{item.title}**\n   {item.snippet}")

    formatted_text = "\n".join(prompt_sections)
    return Event(output=formatted_text)


def save_report_to_db(node_input: Any, ctx: Context) -> str:
    """Saves the synthesized report to state/db and marks report as complete."""
    report_text = ""
    if isinstance(node_input, Event):
        report_text = node_input.output or ""
    else:
        report_text = str(node_input)

    ctx.state["report_markdown"] = report_text
    ctx.state["is_report_created"] = True

    logger.info("Report saved to state context successfully.")
    return report_text


@node(rerun_on_resume=True)
async def explain_and_notify(node_input: Any, ctx: Context) -> Any:
    """Performs post-report Strategic Q&A using the explanation agent."""
    query = _extract_text_input(node_input, ctx)
    logger.info(f"explain_and_notify received query: {query}")
    result = await ctx.run_node(explanation_agent, node_input=query, use_as_output=True)
    return result


def check_brief_status(ctx: Context) -> Event:
    """Checks the brief status and routes accordingly."""
    current_brief = ctx.state.get("company_brief", {})
    if not current_brief or not _is_brief_complete(current_brief):
        return Event(route="missing")

    if not ctx.state.get("is_report_created", False):
        return Event(route="prompt_confirmation")

    return Event()


def fallback(ctx: Context) -> Event:
    """Node fallback handler."""
    msg = (
        "I'm sorry, I encountered an issue routing your request. "
        "Could you please rephrase or specify what details you'd like to analyze?"
    )
    return Event(message=msg)
