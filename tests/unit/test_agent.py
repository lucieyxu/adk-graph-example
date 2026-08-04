from unittest.mock import MagicMock, patch
import pytest
from google.adk import Event
from google.adk.agents.context import Context

# Set environment variables for Vertex AI before importing workflow modules
import os

os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "1"
os.environ["GOOGLE_CLOUD_PROJECT"] = "test-project"
os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"

from company_health_analyst.schemas import CompanyBrief, ExtractorOutput
from company_health_analyst.nodes import (
    classify_and_route,
    extract_brief_and_validate,
    prompt_user_for_missing_fields,
    prompt_user_for_confirmation,
    run_web_search,
    run_internal_search,
    format_search_inputs,
    save_report_to_db,
    check_brief_status,
)


@pytest.mark.asyncio
async def test_classify_and_route_turn_1():
    """Verify classify_and_route runs LLM classification on turn-1 incomplete brief."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {"company_brief": {}}
    mock_ctx.get_invocation_context.return_value = MagicMock()

    mock_agent = MagicMock()
    mock_event = MagicMock(spec=Event)
    mock_event.is_final_response.return_value = True
    mock_event.output = '{"intent": "generate_report", "explanation": "New report"}'

    async def mock_run_async(*args, **kwargs):
        yield mock_event

    mock_agent.run_async.side_effect = mock_run_async

    with patch("company_health_analyst.nodes.intent_classifier_agent", mock_agent):
        events = [event async for event in classify_and_route._func("Analyze XYZ", mock_ctx)]
        result = events[-1]

        assert isinstance(result, Event)
        assert result.actions.route == "generate_report"
        assert mock_ctx.state["original_input"] == "Analyze XYZ"


@pytest.mark.asyncio
async def test_classify_and_route_slow_path_confirm():
    """Verify classify_and_route runs LLM classifier when brief is complete and user confirms."""
    mock_ctx = MagicMock(spec=Context)
    # Complete brief
    mock_ctx.state = {
        "company_brief": {"company_name": "XYZ", "time_span": "2025", "region": "Europe"}
    }
    mock_ctx.get_invocation_context.return_value = MagicMock()

    # Mock intent_classifier_agent
    mock_agent = MagicMock()
    mock_event = MagicMock(spec=Event)
    mock_event.is_final_response.return_value = True
    mock_event.output = '{"intent": "confirm_report", "explanation": "User confirmed"}'

    async def mock_run_async(*args, **kwargs):
        yield mock_event

    mock_agent.run_async.side_effect = mock_run_async

    with patch("company_health_analyst.nodes.intent_classifier_agent", mock_agent):
        events = [event async for event in classify_and_route._func("Looks good", mock_ctx)]
        result = events[-1]

        assert isinstance(result, Event)
        assert result.actions.route == "confirm_report"


@pytest.mark.asyncio
async def test_extract_brief_and_validate_success():
    """Verify extract_brief_and_validate runs extractor and merges parameters recursively."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.get_invocation_context.return_value = MagicMock()
    # Existing state has company name
    mock_ctx.state = {"company_brief": {"company_name": "XYZ"}}

    # Mock extractor_agent output containing region & timeframe
    mock_agent = MagicMock()
    mock_event = MagicMock(spec=Event)
    mock_event.is_final_response.return_value = True

    extracted = ExtractorOutput(
        company_brief=CompanyBrief(time_span="last year", region="Europe"), conflicts=[]
    )
    # Serialize to dictionary so the node can parse it correctly
    mock_event.output = extracted.model_dump()

    async def mock_run_async(*args, **kwargs):
        yield mock_event

    mock_agent.run_async.side_effect = mock_run_async

    with patch("company_health_analyst.nodes.extractor_agent", mock_agent):
        events = [
            event
            async for event in extract_brief_and_validate._func("in Europe for last year", mock_ctx)
        ]
        result = events[-1]

        assert isinstance(result, Event)
        assert result.actions.route == "complete"  # All 3 fields present after merge

        merged_brief = mock_ctx.state["company_brief"]
        assert merged_brief["company_name"] == "XYZ"
        assert merged_brief["region"] == "Europe"
        # normalized "last year" to "2025"
        assert merged_brief["time_span"] == "2025"


@pytest.mark.asyncio
async def test_prompt_user_for_missing_fields_resume():
    """Verify prompt_user_for_missing_fields resumes directly and routes to classify_and_route."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {}
    mock_ctx.resume_inputs = {"missing_fields_reply_0": "last year"}

    events = [event async for event in prompt_user_for_missing_fields._func(None, mock_ctx)]
    assert len(events) == 1
    result = events[0]

    assert isinstance(result, Event)
    assert result.actions.route == "classify_and_route"
    assert result.actions.state_delta["original_input"] == "last year"


@pytest.mark.asyncio
async def test_prompt_user_for_confirmation_resume():
    """Verify prompt_user_for_confirmation resumes and routes to classify_and_route."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {}
    mock_ctx.resume_inputs = {"confirmation_reply_0": "yes, go ahead"}

    events = [event async for event in prompt_user_for_confirmation._func(None, mock_ctx)]
    assert len(events) == 1
    result = events[0]

    assert isinstance(result, Event)
    assert result.actions.route == "classify_and_route"
    assert result.actions.state_delta["original_input"] == "yes, go ahead"


def test_run_web_search():
    """Verify run_web_search fetches mock search snippets based on state brief."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {
        "company_brief": {"company_name": "XYZ", "region": "Europe", "time_span": "2025"}
    }

    results = run_web_search(mock_ctx)
    assert len(results) >= 1
    assert "XYZ" in results[0].title
    assert "europe" in results[0].title.lower()  # Case-insensitive check
    assert results[0].source_type == "web"


def test_run_internal_search():
    """Verify run_internal_search fetches mock internal logs based on state brief."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {
        "company_brief": {"company_name": "XYZ", "region": "Europe", "time_span": "2025"}
    }

    results = run_internal_search(mock_ctx)
    assert len(results) >= 1
    assert "XYZ Internal" in results[0].title
    assert results[0].source_type == "internal"


def test_format_search_inputs():
    """Verify format_search_inputs formats joined search outputs as a single text."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {}

    # Predecessor outputs dict
    from company_health_analyst.schemas import SearchResultItem

    node_input = {
        "run_web_search": [
            SearchResultItem(title="Web Title", snippet="Web Snippet", source_type="web")
        ],
        "run_internal_search": [
            SearchResultItem(
                title="Internal Title",
                snippet="Internal Snippet",
                source_type="internal",
            )
        ],
    }

    event = format_search_inputs(node_input, mock_ctx)
    assert isinstance(event, Event)
    text = event.output

    assert "PUBLIC WEB SEARCH RESULTS" in text
    assert "INTERNAL DATABASE SEARCH RESULTS" in text
    assert "Web Title" in text
    assert "Internal Title" in text

    # State should contain raw results dict
    assert "search_results" in mock_ctx.state
    assert len(mock_ctx.state["search_results"]["web"]) == 1


def test_save_report_to_db():
    """Verify save_report_to_db stores markdown report in state and updates created indicator."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {
        "company_brief": {"company_name": "XYZ", "time_span": "2025", "region": "Europe"}
    }

    report_md = "# Health Report for Nike"
    result = save_report_to_db(report_md, mock_ctx)

    assert result == report_md
    assert mock_ctx.state["report_markdown"] == report_md
    assert mock_ctx.state["is_report_created"] is True
    event = check_brief_status(mock_ctx)
    assert event.actions.route is None


def test_explanation_agent_config():
    """Verify explanation_agent has include_contents='default' to retain history."""
    from company_health_analyst.subagents import explanation_agent

    assert explanation_agent.include_contents == "default"
    assert "include_contents" in explanation_agent.model_fields_set
