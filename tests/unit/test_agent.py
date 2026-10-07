import os
from unittest.mock import AsyncMock, MagicMock

import pytest

# Set environment variables for Vertex AI before importing workflow modules
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "1"
os.environ["GOOGLE_CLOUD_PROJECT"] = "test-project"
os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"


from google.adk import Event
from google.adk.agents.context import Context
from google.adk.workflow import Workflow

from company_health_analyst.graph import root_agent
from company_health_analyst.nodes import (
    format_search_inputs,
    route_user_request,
    run_internal_search,
    run_web_search,
    save_report_to_db,
    validate_intake_node,
)
from company_health_analyst.schemas import (
    CompanyBrief,
    IntakeValidationResponse,
    IntentCategory,
    SearchResultItem,
)
from company_health_analyst.subagents import explanation_agent, intake_agent
from google.adk.events.request_input import RequestInput


def test_intake_agent_configuration():
    """Verify intake_agent is configured in task mode with CompanyBrief schema."""
    assert intake_agent.mode == "task"
    assert intake_agent.output_schema == CompanyBrief
    assert intake_agent.output_key == "company_brief"

    # In task mode, ADK automatically injects the finish_task tool
    tool_names = [getattr(t, "name", getattr(t, "__name__", str(t))) for t in intake_agent.tools]
    assert "finish_task" in tool_names


def test_workflow_graph_structure():
    """Verify the workflow topology uses route_user_request as the entry point."""
    assert isinstance(root_agent, Workflow)
    assert root_agent.name == "company_health_analyst_workflow"

    # Check edges exist and START connects to route_user_request
    assert root_agent.edges is not None
    assert len(root_agent.edges) > 0
    assert root_agent.edges[0][0] == "START"


@pytest.mark.asyncio
async def test_route_user_request_pre_report_conversational():
    """Verify route_user_request returns None when intake_agent is still conversing."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {"is_report_created": False}
    mock_ctx.run_node = AsyncMock(return_value=None)

    event = await route_user_request("Analyze Nike", mock_ctx)
    assert event is None
    mock_ctx.run_node.assert_called_once_with(
        intake_agent, node_input="Analyze Nike", use_as_output=True, run_id="intake_cycle_1"
    )


@pytest.mark.asyncio
async def test_route_user_request_pre_report_completed():
    """Verify route_user_request routes to 'validate_intake' when intake completes task."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {"is_report_created": False}
    completed_brief = {"company_name": "Nike", "region": "US", "time_span": "2025"}
    mock_ctx.run_node = AsyncMock(return_value=completed_brief)

    event = await route_user_request("US and 2025", mock_ctx)
    assert isinstance(event, Event)
    assert event.actions.route == "validate_intake"
    assert event.output == completed_brief
    assert mock_ctx.state["company_brief"] == completed_brief


@pytest.mark.asyncio
async def test_validate_intake_node_interrupts_when_not_resumed():
    """Verify validate_intake_node yields RequestInput if no resume input exists."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.resume_inputs = {}
    mock_ctx.state = {
        "company_brief": {"company_name": "Alphabet", "time_span": "Q1 2026", "region": "US"}
    }

    req = await validate_intake_node._func(None, mock_ctx)
    assert isinstance(req, RequestInput)
    assert req.interrupt_id == "validate_captured_brief_1"
    assert req.response_schema == IntakeValidationResponse
    assert "Alphabet" in req.message


@pytest.mark.asyncio
async def test_validate_intake_node_resumes_and_routes_searches():
    """Verify validate_intake_node routes to 'searches' and updates state on resume."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {
        "company_brief": {"company_name": "Alphabet", "time_span": "Q1 2026", "region": "US"}
    }
    mock_ctx.resume_inputs = {
        "validate_captured_brief_1": {
            "approved": True,
            "company_name": "Alphabet",
            "time_span": "Q1 2026",
            "region": "Europe",
        }
    }

    event = await validate_intake_node._func(None, mock_ctx)
    assert isinstance(event, Event)
    assert event.actions.route == "searches"
    assert mock_ctx.state["company_brief"]["region"] == "Europe"


@pytest.mark.asyncio
async def test_validate_intake_node_resumes_with_blank_form_preserves_captured():
    """Verify validate_intake_node preserves captured brief when form submitted blank (nulls)."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {
        "company_brief": {"company_name": "Alphabet", "time_span": "Q1 2026", "region": "US"}
    }
    mock_ctx.resume_inputs = {
        "validate_captured_brief_1": {
            "approved": True,
            "company_name": None,
            "time_span": None,
            "region": None,
            "summary": None,
        }
    }

    event = await validate_intake_node._func(None, mock_ctx)
    assert isinstance(event, Event)
    assert event.actions.route == "searches"
    assert mock_ctx.state["company_brief"]["company_name"] == "Alphabet"
    assert mock_ctx.state["company_brief"]["time_span"] == "Q1 2026"
    assert mock_ctx.state["company_brief"]["region"] == "US"


@pytest.mark.asyncio
async def test_route_user_request_post_report_explanation(monkeypatch):
    """Verify route_user_request runs explanation_agent for analytical Q&A on existing report."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {"is_report_created": True}
    mock_ctx.run_node = AsyncMock(return_value=None)

    monkeypatch.setattr(
        "company_health_analyst.nodes.classify_intent_async",
        AsyncMock(return_value=IntentCategory.ASK_EXPLANATION),
    )

    event = await route_user_request("explain in more details the risk factors", mock_ctx)
    assert event is None
    mock_ctx.run_node.assert_called_once_with(
        explanation_agent,
        node_input="explain in more details the risk factors",
        use_as_output=True,
    )


@pytest.mark.asyncio
async def test_route_user_request_post_report_modify(monkeypatch):
    """Verify route_user_request resets report flag and runs intake_agent on modify."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {"is_report_created": True}
    completed_brief = {"company_name": "Nike", "region": "Europe", "time_span": "2025"}
    mock_ctx.run_node = AsyncMock(return_value=completed_brief)

    monkeypatch.setattr(
        "company_health_analyst.nodes.classify_intent_async",
        AsyncMock(return_value=IntentCategory.MODIFY),
    )

    event = await route_user_request("change the analysis to Europe now", mock_ctx)
    assert isinstance(event, Event)
    assert event.actions.route == "validate_intake"
    assert mock_ctx.state["is_report_created"] is False
    assert mock_ctx.state["company_brief"] == completed_brief
    mock_ctx.run_node.assert_called_once_with(
        intake_agent,
        node_input="change the analysis to Europe now",
        use_as_output=True,
        run_id="intake_cycle_2",
    )


@pytest.mark.asyncio
async def test_route_user_request_multiple_modify_cycles(monkeypatch):
    """Verify route_user_request increments intake_cycle across repeated modifications."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {"is_report_created": True, "intake_cycle": 2}
    completed_brief = {"company_name": "Nike", "region": "Asia", "time_span": "2026"}
    mock_ctx.run_node = AsyncMock(return_value=completed_brief)

    monkeypatch.setattr(
        "company_health_analyst.nodes.classify_intent_async",
        AsyncMock(return_value=IntentCategory.MODIFY),
    )

    event = await route_user_request("change the analysis to Asia now", mock_ctx)
    assert isinstance(event, Event)
    assert mock_ctx.state["intake_cycle"] == 3
    mock_ctx.run_node.assert_called_once_with(
        intake_agent,
        node_input="change the analysis to Asia now",
        use_as_output=True,
        run_id="intake_cycle_3",
    )


def test_company_brief_schema_validation():
    """Verify CompanyBrief requires mandatory parameters for task completion."""
    brief = CompanyBrief(company_name="Alphabet", time_span="Q1 2026", region="US")
    assert brief.company_name == "Alphabet"
    assert brief.time_span == "Q1 2026"
    assert brief.region == "US"
    assert brief.summary is None


def test_run_web_search():
    """Verify run_web_search fetches mock search snippets based on state brief."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {
        "company_brief": {"company_name": "XYZ", "region": "Europe", "time_span": "2025"}
    }

    results = run_web_search(mock_ctx)
    assert len(results) >= 1
    assert "XYZ" in results[0].title
    assert "europe" in results[0].title.lower()
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

    text = format_search_inputs(node_input, mock_ctx)
    assert isinstance(text, str)

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


def test_explanation_agent_config():
    """Verify explanation_agent has include_contents='default' to retain history."""
    assert explanation_agent.include_contents == "default"
    assert "include_contents" in explanation_agent.model_fields_set
