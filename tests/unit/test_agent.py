import os
from unittest.mock import MagicMock

import pytest

# Set environment variables for Vertex AI before importing workflow modules
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "1"
os.environ["GOOGLE_CLOUD_PROJECT"] = "test-project"
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"


from google.adk import Event
from google.adk.agents import LlmAgent
from google.adk.agents.context import Context
from google.adk.events.request_input import RequestInput
from google.adk.tools._node_tool import NodeTool
from google.adk.tools.tool_context import ToolContext
from google.adk.workflow import START, Workflow

from company_health_analyst.graph import (
    PIPELINE_TOOL_NAME,
    company_health_pipeline,
    root_agent,
    skip_report_summarization,
)
from company_health_analyst.nodes import (
    REJECTED_STATUS,
    format_search_inputs,
    run_internal_search,
    run_web_search,
    save_report_to_db,
    validate_intake_node,
)
from company_health_analyst.prompts import PromptTemplate
from company_health_analyst.schemas import (
    IntakeValidationResponse,
    PipelineInput,
    SearchResultItem,
)


def _ctx(state: dict, resume_inputs: dict | None = None) -> Context:
    """Builds a mock workflow Context with the given state and resume inputs."""
    ctx = MagicMock(spec=Context)
    ctx.state = state
    ctx.resume_inputs = resume_inputs or {}
    return ctx


# --- Topology -----------------------------------------------------------------


def test_root_agent_is_conversational_coordinator():
    """Verify the root agent is an LlmAgent, not the workflow itself."""
    assert isinstance(root_agent, LlmAgent)
    assert root_agent.name == "company_health_coordinator"


def test_root_agent_exposes_pipeline_as_node_tool():
    """Verify the pipeline Workflow is attached to the root agent as a NodeTool."""
    pipeline_tools = [t for t in root_agent.tools if isinstance(t, NodeTool)]
    assert len(pipeline_tools) == 1

    tool = pipeline_tools[0]
    assert tool.name == PIPELINE_TOOL_NAME
    assert tool.node is company_health_pipeline
    # Long-running is what lets a HITL interrupt inside the graph pause the invocation.
    assert tool.is_long_running is True


def test_pipeline_tool_declaration_matches_pipeline_input():
    """Verify the tool declaration the model sees is derived from PipelineInput."""
    tool = next(t for t in root_agent.tools if isinstance(t, NodeTool))
    declaration = tool._get_declaration()
    assert declaration is not None

    schema = declaration.parameters_json_schema
    assert isinstance(schema, dict)
    assert set(schema["required"]) == {"company_name", "time_span", "region"}
    assert set(schema["properties"]) == {"company_name", "time_span", "region"}


def test_root_agent_exposes_context_tools():
    """Verify the coordinator can answer Q&A itself via the context lookup tools."""
    names = [getattr(t, "name", getattr(t, "__name__", "")) for t in root_agent.tools]
    assert "fetch_report_context" in names
    assert "search_previous_reports" in names


def test_pipeline_graph_structure():
    """Verify the pipeline is a Workflow entered at the HITL validation node."""
    assert isinstance(company_health_pipeline, Workflow)
    assert company_health_pipeline.name == PIPELINE_TOOL_NAME
    assert company_health_pipeline.input_schema is PipelineInput

    graph = company_health_pipeline.graph
    assert graph is not None
    entry_nodes = [e.to_node.name for e in graph.edges if e.from_node.name == START.name]
    assert entry_nodes == ["validate_intake_node"]

    # The searches only run on the route the HITL node emits once a human confirms.
    search_edges = [e for e in graph.edges if e.from_node.name == "validate_intake_node"]
    assert {e.to_node.name for e in search_edges} == {"run_web_search", "run_internal_search"}
    assert all(e.route == "searches" for e in search_edges)


# --- Report delivery ----------------------------------------------------------


@pytest.mark.asyncio
async def test_skip_report_summarization_applies_to_pipeline_tool():
    """Verify the coordinator is told not to re-narrate the streamed report."""
    tool = MagicMock()
    tool.name = PIPELINE_TOOL_NAME
    tool_context = MagicMock(spec=ToolContext)
    tool_context.actions = MagicMock()

    result = await skip_report_summarization(tool, {}, tool_context, {})

    assert result is None
    assert tool_context.actions.skip_summarization is True


@pytest.mark.asyncio
async def test_skip_report_summarization_leaves_other_tools_alone():
    """Verify ordinary Q&A tool results are still summarized by the coordinator."""
    tool = MagicMock()
    tool.name = "search_previous_reports"
    tool_context = MagicMock(spec=ToolContext)
    tool_context.actions = MagicMock()
    tool_context.actions.skip_summarization = None

    await skip_report_summarization(tool, {}, tool_context, {})

    assert tool_context.actions.skip_summarization is not True


# --- HITL validation node -----------------------------------------------------


@pytest.mark.asyncio
async def test_validate_intake_node_interrupts_on_pipeline_input():
    """Verify the entry node interrupts with the tool arguments the coordinator passed."""
    ctx = _ctx(state={})
    node_input = PipelineInput(company_name="Alphabet", time_span="Q1 2026", region="US")

    req = await validate_intake_node._func(node_input, ctx)

    assert isinstance(req, RequestInput)
    assert req.interrupt_id == "validate_captured_brief_1"
    assert req.response_schema == IntakeValidationResponse
    assert "Alphabet" in (req.message or "")


@pytest.mark.asyncio
async def test_validate_intake_node_resumes_and_routes_searches():
    """Verify the node routes to 'searches' and applies human overrides on resume."""
    ctx = _ctx(
        state={},
        resume_inputs={
            "validate_captured_brief_1": {
                "cancel": False,
                "region": "Europe",
            }
        },
    )
    node_input = PipelineInput(company_name="Alphabet", time_span="Q1 2026", region="US")

    event = await validate_intake_node._func(node_input, ctx)

    assert isinstance(event, Event)
    assert event.actions.route == "searches"
    assert ctx.state["company_brief"]["region"] == "Europe"
    assert ctx.state["company_brief"]["company_name"] == "Alphabet"


@pytest.mark.asyncio
async def test_validate_intake_node_accepts_the_exact_web_ui_submit_payload():
    """Verify pressing Submit untouched in the ADK Web UI proceeds with the analysis.

    Regression guard, reproducing a payload captured from a real UI session. The UI
    renders every boolean as an unticked checkbox and posts it on every submit,
    ignoring the field's declared default. An `approved: bool = True` field therefore
    arrived as False on every submission and cancelled every run.
    """
    web_ui_submit = {
        "company_name": None,
        "time_span": None,
        "region": None,
        "summary": None,
        "cancel": False,
    }
    ctx = _ctx(state={}, resume_inputs={"validate_captured_brief_1": web_ui_submit})
    node_input = PipelineInput(company_name="Alphabet", time_span="Q1 2026", region="US")

    event = await validate_intake_node._func(node_input, ctx)

    assert isinstance(event, Event)
    assert event.actions.route == "searches", (
        "Pressing Submit without editing the form must run the analysis."
    )
    assert ctx.state["company_brief"]["company_name"] == "Alphabet"


def test_validation_form_has_no_boolean_that_submit_cannot_express():
    """Verify no boolean on the form needs to be True for the happy path.

    The Web UI cannot post a ticked checkbox from an untouched form, so any boolean
    whose required value is True is unreachable by a plain Submit.
    """
    for name, field in IntakeValidationResponse.model_fields.items():
        if field.annotation is bool:
            assert field.default is False, (
                f"Boolean form field {name!r} defaults to {field.default!r}; the Web UI "
                "always submits False for it, so the default must be False."
            )


@pytest.mark.asyncio
async def test_validate_intake_node_blank_form_preserves_captured_values():
    """Verify blank form fields do not wipe the parameters the coordinator captured."""
    ctx = _ctx(
        state={},
        resume_inputs={
            "validate_captured_brief_1": {
                "cancel": False,
                "company_name": None,
                "time_span": "",
                "region": "   ",
                "summary": None,
            }
        },
    )
    node_input = PipelineInput(company_name="Alphabet", time_span="Q1 2026", region="US")

    event = await validate_intake_node._func(node_input, ctx)

    assert isinstance(event, Event)
    assert ctx.state["company_brief"]["company_name"] == "Alphabet"
    assert ctx.state["company_brief"]["time_span"] == "Q1 2026"
    assert ctx.state["company_brief"]["region"] == "US"


@pytest.mark.asyncio
async def test_validate_intake_node_confirmation_advances_cycle():
    """Verify confirming a run advances the cycle counter so the next run re-asks."""
    ctx = _ctx(
        state={},
        resume_inputs={"validate_captured_brief_1": {"cancel": False}},
    )
    node_input = PipelineInput(company_name="XYZ", time_span="2025", region="US")

    await validate_intake_node._func(node_input, ctx)
    assert ctx.state["validation_cycles"] == 1


@pytest.mark.asyncio
async def test_validate_intake_node_declined_run_does_not_search():
    """Verify declining the form aborts the run instead of analyzing anyway.

    `cancel` used to be dropped on the floor, so a cancellation still ran the
    full analysis.
    """
    ctx = _ctx(
        state={},
        resume_inputs={"validate_captured_brief_1": {"cancel": True}},
    )
    node_input = PipelineInput(company_name="XYZ", time_span="2025", region="US")

    event = await validate_intake_node._func(node_input, ctx)

    assert isinstance(event, Event)
    # No route means no outgoing edge matches, so the searches never trigger.
    assert event.actions.route is None
    assert isinstance(event.output, dict)
    assert event.output["status"] == REJECTED_STATUS
    assert event.output["rejected_parameters"]["company_name"] == "XYZ"

    # Declined parameters must not become the active brief.
    assert "company_brief" not in ctx.state


@pytest.mark.asyncio
async def test_validate_intake_node_declined_run_tells_the_user():
    """Verify the declined run speaks for itself.

    The coordinator is not invoked again when the pipeline ends at the gate, so
    without content on this event the turn would finish in silence.
    """
    ctx = _ctx(
        state={},
        resume_inputs={"validate_captured_brief_1": {"cancel": True}},
    )
    node_input = PipelineInput(company_name="XYZ", time_span="2025", region="US")

    event = await validate_intake_node._func(node_input, ctx)

    assert isinstance(event, Event)
    assert event.content is not None
    assert event.content.parts is not None
    assert any(p.text for p in event.content.parts)


@pytest.mark.asyncio
async def test_validate_intake_node_retry_after_decline_asks_again():
    """Verify a declined run's answer cannot auto-decline the retry.

    The decline must retire its cycle too. If only approvals advanced the counter,
    the retry would reuse interrupt ID 1, rediscover this same `cancel=True` in
    resume_inputs, and decline itself forever without asking the human.
    """
    ctx = _ctx(
        state={},
        resume_inputs={"validate_captured_brief_1": {"cancel": True}},
    )
    await validate_intake_node._func(
        PipelineInput(company_name="XYZ", time_span="2025", region="US"), ctx
    )
    assert ctx.state["validation_cycles"] == 1

    # The retry carries the earlier rejection along in resume_inputs.
    retry = await validate_intake_node._func(
        PipelineInput(company_name="XYZ", time_span="2025", region="Asia"), ctx
    )

    assert isinstance(retry, RequestInput)
    assert retry.interrupt_id == "validate_captured_brief_2"


@pytest.mark.asyncio
async def test_validate_intake_node_second_run_requires_fresh_confirmation():
    """Verify a stale answer from cycle 1 cannot auto-confirm cycle 2.

    This is the regression guard for reusing a static interrupt ID: the previous
    cycle's response stays in resume_inputs, and must not be mistaken for this one.
    """
    ctx = _ctx(
        state={"validation_cycles": 1},
        resume_inputs={"validate_captured_brief_1": {"cancel": False}},
    )
    node_input = PipelineInput(company_name="XYZ", time_span="2025", region="Asia")

    req = await validate_intake_node._func(node_input, ctx)

    assert isinstance(req, RequestInput)
    assert req.interrupt_id == "validate_captured_brief_2"


@pytest.mark.asyncio
async def test_validate_intake_node_falls_back_to_state_brief():
    """Verify the node still works when rerun without usable node input."""
    ctx = _ctx(
        state={"company_brief": {"company_name": "XYZ", "time_span": "2025", "region": "US"}}
    )

    req = await validate_intake_node._func(None, ctx)

    assert isinstance(req, RequestInput)
    assert "XYZ" in (req.message or "")


# --- Schemas ------------------------------------------------------------------


def test_pipeline_input_requires_all_three_parameters():
    """Verify PipelineInput makes the three analysis parameters mandatory."""
    payload = PipelineInput(company_name="Alphabet", time_span="Q1 2026", region="US")
    assert payload.company_name == "Alphabet"

    with pytest.raises(ValueError):
        PipelineInput.model_validate({"company_name": "Alphabet", "time_span": "Q1 2026"})


# --- Deterministic pipeline nodes ---------------------------------------------


def test_run_web_search():
    """Verify run_web_search fetches mock search snippets based on state brief."""
    ctx = _ctx(
        state={"company_brief": {"company_name": "XYZ", "region": "Europe", "time_span": "2025"}}
    )

    results = run_web_search(ctx)
    assert len(results) >= 1
    assert "XYZ" in results[0].title
    assert "europe" in results[0].title.lower()
    assert results[0].source_type == "web"


def test_run_internal_search():
    """Verify run_internal_search fetches mock internal logs based on state brief."""
    ctx = _ctx(
        state={"company_brief": {"company_name": "XYZ", "region": "Europe", "time_span": "2025"}}
    )

    results = run_internal_search(ctx)
    assert len(results) >= 1
    assert "XYZ Internal" in results[0].title
    assert results[0].source_type == "internal"


def test_format_search_inputs():
    """Verify format_search_inputs formats joined search outputs as a single text."""
    ctx = _ctx(state={})

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

    text = format_search_inputs(node_input, ctx)
    assert isinstance(text, str)

    assert "PUBLIC WEB SEARCH RESULTS" in text
    assert "INTERNAL DATABASE SEARCH RESULTS" in text
    assert "Web Title" in text
    assert "Internal Title" in text

    assert "search_results" in ctx.state
    assert len(ctx.state["search_results"]["web"]) == 1


def test_save_report_to_db():
    """Verify save_report_to_db stores markdown report in state and updates created indicator."""
    ctx = _ctx(
        state={"company_brief": {"company_name": "XYZ", "time_span": "2025", "region": "Europe"}}
    )

    report_md = "# Health Report for Nike"
    result = save_report_to_db(report_md, ctx)

    assert result == report_md
    assert ctx.state["report_markdown"] == report_md
    assert ctx.state["is_report_created"] is True


# --- Prompt constraints -------------------------------------------------------


def test_coordinator_prompt_covers_intake_and_qa():
    """Verify the merged coordinator prompt retains both intake and Q&A constraints."""
    prompt = PromptTemplate.COORDINATOR

    # Intake duties
    assert "company_name" in prompt
    assert "time_span" in prompt
    assert "region" in prompt
    assert PIPELINE_TOOL_NAME in prompt
    assert "never invent" in prompt.lower()

    # Q&A duties inherited from the former explanation agent
    assert "Do NOT greet" in prompt
    assert "search_previous_reports" in prompt
    assert "fetch_report_context" in prompt


def test_coordinator_prompt_defers_confirmation_to_the_pipeline():
    """Verify the coordinator is told the tool owns parameter confirmation."""
    prompt = PromptTemplate.COORDINATOR
    assert "do NOT ask the user to confirm" in prompt
    assert "Do not restate or summarize" in prompt
