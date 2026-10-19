"""Replay tests for the coordinator agent driving the pipeline workflow as a tool.

The coordinator's model is replaced with a scripted fake so the real ADK flow runs:
the function call it emits is genuinely dispatched to the pipeline ``NodeTool``, the
graph executes, and its human-in-the-loop interrupt propagates back out through the
tool boundary. Only the two model calls are faked, never the orchestration.
"""

from collections.abc import AsyncGenerator
from typing import Any
from unittest.mock import patch

import pytest
from google.adk.agents import LlmAgent
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.models.base_llm import BaseLlm
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from company_health_analyst.agent import app
from company_health_analyst.graph import PIPELINE_TOOL_NAME

REPORT_TEXT = "# Comprehensive Company Health Report for Alphabet"


class ScriptedLlm(BaseLlm):
    """A fake model that replays a per-agent script of responses.

    Attributes:
        coordinator_script: Responses for the coordinator, consumed one per model call.
        synthesizer_text: The report text the synthesizer node "writes".
        calls: Names of the agents whose model was invoked, in order.
    """

    coordinator_script: list[types.Content] = []
    synthesizer_text: str = REPORT_TEXT
    calls: list[str] = []

    async def generate_content_async(
        self, llm_request: LlmRequest, stream: bool = False
    ) -> AsyncGenerator[LlmResponse, None]:
        """Yields the next scripted response for the requesting agent."""
        agent_name = ""
        if llm_request.config and llm_request.config.system_instruction:
            instruction = str(llm_request.config.system_instruction)
            if "Senior Corporate Health Analyst" in instruction:
                agent_name = "report_synthesizer_agent"
            else:
                agent_name = "company_health_coordinator"
        self.calls.append(agent_name)

        if agent_name == "report_synthesizer_agent":
            yield LlmResponse(
                content=types.Content(
                    role="model", parts=[types.Part.from_text(text=self.synthesizer_text)]
                )
            )
            return

        if not self.coordinator_script:
            raise AssertionError("Coordinator model called more times than the script allows.")
        yield LlmResponse(content=self.coordinator_script.pop(0))


def _text(text: str) -> types.Content:
    """Builds a model turn that only replies conversationally."""
    return types.Content(role="model", parts=[types.Part.from_text(text=text)])


def _pipeline_call(call_id: str, company_name: str, time_span: str, region: str) -> types.Content:
    """Builds a model turn that invokes the pipeline tool."""
    return types.Content(
        role="model",
        parts=[
            types.Part(
                function_call=types.FunctionCall(
                    name=PIPELINE_TOOL_NAME,
                    args={
                        "company_name": company_name,
                        "time_span": time_span,
                        "region": region,
                    },
                    id=call_id,
                )
            )
        ],
    )


def _hitl_response(interrupt_id: str, **fields: Any) -> types.Content:
    """Builds the user turn that answers a pending HITL interrupt."""
    return types.Content(
        role="user",
        parts=[
            types.Part(
                function_response=types.FunctionResponse(
                    name="adk_request_input",
                    response=fields,
                    id=interrupt_id,
                )
            )
        ],
    )


async def _run(runner: Runner, session_id: str, message: types.Content) -> list:
    """Drives one turn and returns its events."""
    return [
        event
        async for event in runner.run_async(
            new_message=message,
            user_id="test_user",
            session_id=session_id,
            run_config=RunConfig(streaming_mode=StreamingMode.SSE),
        )
    ]


def _interrupt_ids(events: list) -> list[str]:
    """Extracts the interrupt IDs of any HITL requests emitted in these events."""
    ids = []
    for event in events:
        for part in event.content.parts if event.content and event.content.parts else []:
            if part.function_call and part.function_call.name == "adk_request_input":
                ids.append(part.function_call.args.get("interruptId"))
    return ids


def _texts(events: list) -> str:
    """Concatenates all model text emitted in these events."""
    return " ".join(
        part.text
        for event in events
        for part in (event.content.parts if event.content and event.content.parts else [])
        if part.text
    )


@pytest.fixture(name="harness")
def _harness():
    """Provides a runner, session service and the scripted model, with the model patched in."""
    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="test_app")
    runner = Runner(app=app, session_service=session_service, app_name="test_app")
    fake = ScriptedLlm(model="fake-model", coordinator_script=[], calls=[])

    with patch.object(LlmAgent, "canonical_model", property(lambda self: fake)):
        yield runner, session_service, session, fake


@pytest.mark.asyncio
async def test_coordinator_converses_then_invokes_pipeline(harness):
    """Verifies conversational intake, tool invocation, HITL gating, and report creation."""
    runner, session_service, session, fake = harness
    fake.coordinator_script = [
        _text("Hello! I can analyze company financial health. Which company?"),
        _text("Captured Alphabet. What timeframe and region should I focus on?"),
        _pipeline_call("call_1", "Alphabet", "Q1 2026", "US"),
    ]

    events1 = await _run(runner, session.id, _text("Hi! What can you do?"))
    assert "analyze company financial health" in _texts(events1)

    events2 = await _run(runner, session.id, _text("Analyze Alphabet"))
    assert "Captured Alphabet" in _texts(events2)

    # Nothing has run yet: no searches, no report.
    mid = await session_service.get_session(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert mid.state.get("is_report_created") is not True

    # Third turn supplies the rest, so the coordinator calls the pipeline, which halts
    # at the human validation gate before doing any work.
    events3 = await _run(runner, session.id, _text("US, for Q1 2026"))
    assert _interrupt_ids(events3) == ["validate_captured_brief_1"]

    pre = await session_service.get_session(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert pre.state.get("is_report_created") is not True
    assert pre.state.get("search_results") is None

    # Human confirms: the graph resumes inside the same tool call and runs to completion.
    events4 = await _run(
        runner, session.id, _hitl_response("validate_captured_brief_1", cancel=False)
    )
    assert REPORT_TEXT in _texts(events4)

    final = await session_service.get_session(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert final.state["is_report_created"] is True
    assert final.state["company_brief"]["company_name"] == "Alphabet"
    assert final.state["company_brief"]["region"] == "US"
    assert final.state["validation_cycles"] == 1
    assert final.state["report_markdown"] == REPORT_TEXT
    assert final.state["search_results"]["web"]
    assert final.state["search_results"]["internal"]


@pytest.mark.asyncio
async def test_hitl_field_edits_override_captured_parameters(harness):
    """Verifies edits typed into the validation form win over the coordinator's arguments."""
    runner, session_service, session, fake = harness
    fake.coordinator_script = [_pipeline_call("call_1", "Alphabet", "Q1 2026", "US")]

    events = await _run(runner, session.id, _text("Analyze Alphabet in US for Q1 2026"))
    assert _interrupt_ids(events) == ["validate_captured_brief_1"]

    await _run(
        runner,
        session.id,
        _hitl_response(
            "validate_captured_brief_1", cancel=False, region="Europe", time_span="FY2025"
        ),
    )

    final = await session_service.get_session(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert final.state["company_brief"]["region"] == "Europe"
    assert final.state["company_brief"]["time_span"] == "FY2025"
    assert final.state["company_brief"]["company_name"] == "Alphabet"
    assert final.state["is_report_created"] is True


@pytest.mark.asyncio
async def test_hitl_blank_form_submission_preserves_captured_parameters(harness):
    """Verifies submitting the validation form untouched keeps the captured parameters."""
    runner, session_service, session, fake = harness
    fake.coordinator_script = [_pipeline_call("call_1", "Alphabet", "Q1 2026", "US")]

    await _run(runner, session.id, _text("Analyze Alphabet in US for Q1 2026"))
    await _run(
        runner,
        session.id,
        _hitl_response(
            "validate_captured_brief_1",
            cancel=False,
            company_name=None,
            time_span=None,
            region=None,
            summary=None,
        ),
    )

    final = await session_service.get_session(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert final.state["company_brief"]["company_name"] == "Alphabet"
    assert final.state["company_brief"]["time_span"] == "Q1 2026"
    assert final.state["company_brief"]["region"] == "US"
    assert final.state["is_report_created"] is True


@pytest.mark.asyncio
async def test_rerun_requires_a_fresh_confirmation(harness):
    """Verifies a second analysis re-asks for confirmation under a new interrupt ID.

    Guards the stale-resume hazard: cycle 1's answer is still in resume_inputs, and
    must not silently approve cycle 2's parameters.
    """
    runner, session_service, session, fake = harness
    fake.coordinator_script = [
        _pipeline_call("call_1", "Alphabet", "Q1 2026", "US"),
        _pipeline_call("call_2", "Alphabet", "Q1 2026", "Asia"),
    ]

    await _run(runner, session.id, _text("Analyze Alphabet in US for Q1 2026"))
    await _run(runner, session.id, _hitl_response("validate_captured_brief_1", cancel=False))

    after_first = await session_service.get_session(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert after_first.state["company_brief"]["region"] == "US"
    assert after_first.state["validation_cycles"] == 1

    # Modification: the pipeline must stop at a *new* gate rather than reuse cycle 1's answer.
    events = await _run(runner, session.id, _text("Change the region to Asia"))
    assert _interrupt_ids(events) == ["validate_captured_brief_2"]

    stalled = await session_service.get_session(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert stalled.state["company_brief"]["region"] == "US"

    await _run(runner, session.id, _hitl_response("validate_captured_brief_2", cancel=False))

    final = await session_service.get_session(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert final.state["company_brief"]["region"] == "Asia"
    assert final.state["validation_cycles"] == 2


@pytest.mark.asyncio
async def test_declining_the_form_aborts_the_run_and_allows_a_retry(harness):
    """Verifies declining the validation form blocks the analysis, then permits a retry.

    Covers the whole decline path: no searching, nothing written to the brief, the user
    is actually told, and the retry opens a fresh gate instead of replaying the refusal.
    """
    runner, session_service, session, fake = harness
    fake.coordinator_script = [
        _pipeline_call("call_1", "Alphabet", "Q1 2026", "US"),
        _pipeline_call("call_2", "Alphabet", "Q1 2026", "Europe"),
    ]

    events = await _run(runner, session.id, _text("Analyze Alphabet in US for Q1 2026"))
    assert _interrupt_ids(events) == ["validate_captured_brief_1"]

    declined = await _run(
        runner, session.id, _hitl_response("validate_captured_brief_1", cancel=True)
    )

    # The user must hear about it: the coordinator is not re-invoked on this path, so
    # the graph node itself has to speak.
    assert "cancelled" in _texts(declined).lower()

    after_decline = await session_service.get_session(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert after_decline.state.get("is_report_created") is not True
    assert after_decline.state.get("report_markdown") is None
    assert after_decline.state.get("search_results") is None
    # Declined parameters must not be adopted as the active brief.
    assert after_decline.state.get("company_brief") is None
    assert after_decline.state["validation_cycles"] == 1

    # Retrying must open a new gate rather than rediscovering the refusal.
    retry = await _run(runner, session.id, _text("Use Europe instead"))
    assert _interrupt_ids(retry) == ["validate_captured_brief_2"]

    await _run(runner, session.id, _hitl_response("validate_captured_brief_2", cancel=False))

    final = await session_service.get_session(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert final.state["is_report_created"] is True
    assert final.state["company_brief"]["region"] == "Europe"
    assert final.state["validation_cycles"] == 2


@pytest.mark.asyncio
async def test_coordinator_answers_questions_without_running_the_pipeline(harness):
    """Verifies analytical Q&A is handled by the coordinator, leaving the report untouched."""
    runner, session_service, session, fake = harness
    fake.coordinator_script = [
        _pipeline_call("call_1", "Alphabet", "Q1 2026", "US"),
        _text("The primary risk factors are EU antitrust compliance and data center capex."),
    ]

    await _run(runner, session.id, _text("Analyze Alphabet in US for Q1 2026"))
    await _run(runner, session.id, _hitl_response("validate_captured_brief_1", cancel=False))

    events = await _run(runner, session.id, _text("Explain the risk factors in more detail"))

    assert "antitrust" in _texts(events)
    assert _interrupt_ids(events) == []

    final = await session_service.get_session(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    # The Q&A turn must not have started another analysis cycle.
    assert final.state["validation_cycles"] == 1
    assert final.state["report_markdown"] == REPORT_TEXT
