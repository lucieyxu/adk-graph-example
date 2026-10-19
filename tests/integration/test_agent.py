# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Live end-to-end tests against the real model. These make Vertex AI calls."""

from dotenv import load_dotenv
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from company_health_analyst.agent import app

load_dotenv()


def _send(runner: Runner, session_id: str, message: types.Content) -> list:
    """Drives one turn against the live agent and returns its events."""
    return list(
        runner.run(
            new_message=message,
            user_id="test_user",
            session_id=session_id,
            run_config=RunConfig(streaming_mode=StreamingMode.SSE),
        )
    )


def _pending_interrupt_id(events: list) -> str | None:
    """Returns the interrupt ID of a HITL confirmation request, if one was raised."""
    for event in events:
        for part in event.content.parts if event.content and event.content.parts else []:
            if part.function_call and part.function_call.name == "adk_request_input":
                return part.function_call.args.get("interruptId")
    return None


def _confirm(interrupt_id: str) -> types.Content:
    """Builds the user turn for pressing Submit on the HITL form without editing it.

    This mirrors byte-for-byte what the ADK Web UI posts: every text field present and
    null, and every boolean present and False. A hand-written payload that merely
    *means* approval does not catch a field whose meaning the UI cannot express, which
    is exactly how an always-false `approved` flag slipped through once.
    """
    return types.Content(
        role="user",
        parts=[
            types.Part(
                function_response=types.FunctionResponse(
                    name="adk_request_input",
                    response={
                        "company_name": None,
                        "time_span": None,
                        "region": None,
                        "summary": None,
                        "cancel": False,
                    },
                    id=interrupt_id,
                )
            )
        ],
    )


def _assert_turn_healthy(events: list, label: str) -> None:
    """Fails when a turn errored or produced no model output at all."""
    assert len(events) > 0, f"Expected events on {label}"

    for event in events:
        assert getattr(event, "error_code", None) is None, (
            f"{label} failed with error_code={event.error_code}: "
            f"{getattr(event, 'error_message', '')}"
        )

    has_model_content = any(
        event.content
        and event.content.parts
        and any(
            bool(getattr(p, "text", None)) or bool(getattr(p, "function_call", None))
            for p in event.content.parts
        )
        for event in events
    )
    assert has_model_content, (
        f"{label} produced no model text or tool calls (silent empty response). "
        f"Emitted event actions: {[getattr(e, 'actions', None) for e in events]}"
    )


def test_agent_stream() -> None:
    """Integration test for the agent stream functionality.

    Tests that the agent returns valid streaming responses.
    """
    session_service = InMemorySessionService()

    session = session_service.create_session_sync(user_id="test_user", app_name="test")
    runner = Runner(app=app, session_service=session_service, app_name="test")

    message = types.Content(
        role="user",
        parts=[types.Part.from_text(text="Hello! What are your capabilities?")],
    )

    events = _send(runner, session.id, message)
    assert len(events) > 0, "Expected at least one message"

    has_text_content = False
    for event in events:
        if event.content and event.content.parts and any(part.text for part in event.content.parts):
            has_text_content = True
            break
    assert has_text_content, "Expected at least one message with text content"


def test_multi_turn_conversational_scenario() -> None:
    """End-to-end lifecycle driven by the coordinator agent with no intent classifier.

    Covers the scenario described in README.md:
    1. Greeting & capabilities explanation.
    2. Initial analysis request with missing parameters.
    3. Conversational recall question during intake.
    4. Historical reports query using archive inspection tools.
    5. Providing missing geographic region parameter.
    6. Providing the timeframe, which triggers the pipeline tool and its HITL gate.
    7. Confirming the validation form, producing the report.
    8. Post-report comparative strategic Q&A.
    9. Modifying parameters (changing region to Asia).
    10. Confirming the second validation form, regenerating the report.
    """
    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="test_app")
    runner = Runner(app=app, session_service=session_service, app_name="test_app")

    conversational_turns = [
        "Hello, what is this tool for?",
        "Analyze XYZ, it was founded in 2020 by John Doe",
        "Remind me when was the company founded again?",
        "Give me the summary of past reports on the company",
        "Europe",
    ]

    for i, user_text in enumerate(conversational_turns, 1):
        msg = types.Content(role="user", parts=[types.Part.from_text(text=user_text)])
        events = _send(runner, session.id, msg)
        _assert_turn_healthy(events, f"Turn {i} ('{user_text}')")

        # None of the conversational turns may start an analysis on their own.
        state = session_service.get_session_sync(
            app_name="test_app", user_id="test_user", session_id=session.id
        ).state
        assert state.get("is_report_created") is not True, (
            f"Turn {i} ('{user_text}') generated a report before parameters were complete."
        )

    # Turn 6: the last missing parameter arrives, so the coordinator calls the pipeline,
    # which must halt at the human validation gate before searching.
    events6 = _send(
        runner,
        session.id,
        types.Content(role="user", parts=[types.Part.from_text(text="ok, use 2026")]),
    )
    _assert_turn_healthy(events6, "Turn 6 (complete parameters)")

    interrupt_id = _pending_interrupt_id(events6)
    assert interrupt_id == "validate_captured_brief_1", (
        f"Expected the first HITL validation gate, got {interrupt_id!r}."
    )

    s6_pre = session_service.get_session_sync(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert s6_pre.state.get("is_report_created") is not True, (
        "Searches ran before the human confirmed the parameters."
    )

    # Turn 7: confirm the form, which resumes the graph inside the same tool call.
    events7 = _send(runner, session.id, _confirm(interrupt_id))
    _assert_turn_healthy(events7, "Turn 7 (confirm validation form)")

    s7 = session_service.get_session_sync(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert s7.state.get("is_report_created") is True
    brief7 = s7.state.get("company_brief", {})
    assert brief7.get("company_name") == "XYZ"
    assert "2026" in str(brief7.get("time_span"))
    assert "Europe" in str(brief7.get("region"))
    assert s7.state.get("report_markdown")
    assert s7.state.get("validation_cycles") == 1

    # Turn 8: analytical Q&A, answered by the coordinator without re-running anything.
    events8 = _send(
        runner,
        session.id,
        types.Content(
            role="user",
            parts=[types.Part.from_text(text="Compare this new report to past reports")],
        ),
    )
    _assert_turn_healthy(events8, "Turn 8 (comparative Q&A)")
    assert _pending_interrupt_id(events8) is None, "Q&A must not start a new analysis."

    # Turn 9: a modification, which must stop at a fresh validation gate.
    events9 = _send(
        runner,
        session.id,
        types.Content(
            role="user",
            parts=[types.Part.from_text(text="Change the region to Asia and rerun it")],
        ),
    )
    _assert_turn_healthy(events9, "Turn 9 (modify region)")

    interrupt_id2 = _pending_interrupt_id(events9)
    assert interrupt_id2 == "validate_captured_brief_2", (
        f"Expected a second, distinct HITL gate, got {interrupt_id2!r}."
    )

    # Turn 10: confirm the modified parameters and regenerate.
    events10 = _send(runner, session.id, _confirm(interrupt_id2))
    _assert_turn_healthy(events10, "Turn 10 (confirm modified parameters)")

    final_session = session_service.get_session_sync(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    final_brief = final_session.state.get("company_brief", {})
    assert final_brief.get("company_name") == "XYZ"
    assert "Asia" in str(final_brief.get("region"))
    assert final_session.state.get("is_report_created") is True
    assert final_session.state.get("report_markdown")
    assert final_session.state.get("validation_cycles") == 2
