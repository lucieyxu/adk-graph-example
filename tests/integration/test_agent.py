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

import os
from pathlib import Path

# Load environment variables from .env if present before initializing Vertex AI
# We run integ tests with real LLM calls
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip())

from google.adk.agents.run_config import RunConfig, StreamingMode  # noqa: E402
from google.adk.runners import Runner  # noqa: E402
from google.adk.sessions import InMemorySessionService  # noqa: E402
from google.genai import types  # noqa: E402

from company_health_analyst.agent import root_agent  # noqa: E402


def test_agent_stream() -> None:
    """
    Integration test for the agent stream functionality.
    Tests that the agent returns valid streaming responses.
    """

    session_service = InMemorySessionService()

    session = session_service.create_session_sync(user_id="test_user", app_name="test")
    runner = Runner(agent=root_agent, session_service=session_service, app_name="test")

    message = types.Content(role="user", parts=[types.Part.from_text(text="Why is the sky blue?")])

    events = list(
        runner.run(
            new_message=message,
            user_id="test_user",
            session_id=session.id,
            run_config=RunConfig(streaming_mode=StreamingMode.SSE),
        )
    )
    assert len(events) > 0, "Expected at least one message"

    has_text_content = False
    for event in events:
        if event.content and event.content.parts and any(part.text for part in event.content.parts):
            has_text_content = True
            break
    assert has_text_content, "Expected at least one message with text content"


def _make_user_response(interrupt_id: str, text: str) -> types.Content:
    """Helper to create a user Content with FunctionResponse for HITL interrupt."""
    return types.Content(
        role="user",
        parts=[
            types.Part(
                function_response=types.FunctionResponse(
                    name="adk_request_input",
                    response={"result": text},
                    id=interrupt_id,
                )
            )
        ],
    )


def test_multi_turn_hitl_scenario() -> None:
    """
    Integration test for end-to-end multi-turn HITL workflow without mocking LLM calls.
    """
    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="test_app")
    runner = Runner(agent=root_agent, session_service=session_service, app_name="test_app")

    # Turn 1: User: "Hello, what is this tool for?"
    msg1 = types.Content(
        role="user",
        parts=[types.Part.from_text(text="Hello, what is this tool for?")],
    )
    events1 = list(
        runner.run(
            new_message=msg1,
            user_id="test_user",
            session_id=session.id,
            run_config=RunConfig(streaming_mode=StreamingMode.SSE),
        )
    )
    assert len(events1) > 0, "Expected events on Turn 1"
    has_text_content = any(
        (event.content and event.content.parts and any(part.text for part in event.content.parts))
        for event in events1
    )
    assert has_text_content, "Expected explanation assistant reply on Turn 1"

    # Turn 2: User: "Analyze XYZ, it was founded in 2020 by John Doe"
    msg2 = types.Content(
        role="user",
        parts=[types.Part.from_text(text="Analyze XYZ, it was founded in 2020 by John Doe")],
    )
    list(
        runner.run(
            new_message=msg2,
            user_id="test_user",
            session_id=session.id,
            run_config=RunConfig(streaming_mode=StreamingMode.SSE),
        )
    )
    updated_session = session_service.get_session_sync(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    brief = updated_session.state.get("company_brief", {})
    assert brief.get("company_name") == "XYZ", f"Expected company_name 'XYZ', got {brief}"
    assert not brief.get("region"), f"Expected missing region, got {brief.get('region')}"

    # Turn 3: User: In HITL "Remind me when was the company founded again?"
    msg3 = _make_user_response(
        "missing_fields_reply_0", "Remind me when was the company founded again?"
    )
    events3 = list(
        runner.run(
            new_message=msg3,
            user_id="test_user",
            session_id=session.id,
            run_config=RunConfig(streaming_mode=StreamingMode.SSE),
        )
    )
    has_2020 = any(
        (
            event.content
            and event.content.parts
            and any("2020" in (part.text or "") for part in event.content.parts)
        )
        for event in events3
    )
    assert has_2020, "Expected explanation subagent to reply with '2020'"
    updated_session = session_service.get_session_sync(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert updated_session.state.get("missing_fields_loop_count") == 1, (
        "Expected to re-ask HITL for missing fields"
    )

    # Turn 4: User: In HITL "Give me the summary of past reports on the company"
    msg4 = _make_user_response(
        "missing_fields_reply_1", "Give me the summary of past reports on the company"
    )
    events4 = list(
        runner.run(
            new_message=msg4,
            user_id="test_user",
            session_id=session.id,
            run_config=RunConfig(streaming_mode=StreamingMode.SSE),
        )
    )
    has_past_reports_reply = any(
        (event.content and event.content.parts and any(part.text for part in event.content.parts))
        for event in events4
    )
    assert has_past_reports_reply, "Expected explanation subagent reply for past reports"
    updated_session = session_service.get_session_sync(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert updated_session.state.get("missing_fields_loop_count") == 2, (
        "Expected to re-ask HITL again for missing region"
    )

    # Turn 5: User: In HITL "Europe"
    msg5 = _make_user_response("missing_fields_reply_2", "Europe")
    list(
        runner.run(
            new_message=msg5,
            user_id="test_user",
            session_id=session.id,
            run_config=RunConfig(streaming_mode=StreamingMode.SSE),
        )
    )
    updated_session = session_service.get_session_sync(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    brief = updated_session.state.get("company_brief", {})
    assert brief.get("region") == "Europe", f"Expected region 'Europe', got {brief}"
    assert updated_session.state.get("is_report_created") is False, (
        "Expected report not created yet, waiting for confirmation"
    )

    # Turn 6: User: in HITL "ok"
    msg6 = _make_user_response("confirmation_reply_0", "ok")
    list(
        runner.run(
            new_message=msg6,
            user_id="test_user",
            session_id=session.id,
            run_config=RunConfig(streaming_mode=StreamingMode.SSE),
        )
    )
    updated_session = session_service.get_session_sync(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert updated_session.state.get("is_report_created") is True, (
        "Expected report to be created after ok"
    )
    assert updated_session.state.get("report_markdown"), "Expected report markdown in state"

    # Turn 7: User: "Compare this new report to past reports"
    msg7 = types.Content(
        role="user",
        parts=[types.Part.from_text(text="Compare this new report to past reports")],
    )
    events7 = list(
        runner.run(
            new_message=msg7,
            user_id="test_user",
            session_id=session.id,
            run_config=RunConfig(streaming_mode=StreamingMode.SSE),
        )
    )
    has_comparison = any(
        (event.content and event.content.parts and any(part.text for part in event.content.parts))
        for event in events7
    )
    assert has_comparison, "Expected comparison report from explanation agent"

    # Turn 8: User: "Change the parameter to use Asia"
    msg8 = types.Content(
        role="user",
        parts=[types.Part.from_text(text="Change the parameter to use Asia")],
    )
    list(
        runner.run(
            new_message=msg8,
            user_id="test_user",
            session_id=session.id,
            run_config=RunConfig(streaming_mode=StreamingMode.SSE),
        )
    )
    updated_session = session_service.get_session_sync(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    brief = updated_session.state.get("company_brief", {})
    assert brief.get("region") == "Asia", f"Expected region 'Asia', got {brief}"
    assert updated_session.state.get("is_report_created") is False, (
        "Expected report created to be False after modifying region"
    )

    # Turn 9: User: "Also change the time span to 2025"
    # Note: after Turn 8, the workflow paused for confirmation (confirmation_reply_1)
    msg9 = _make_user_response("confirmation_reply_1", "Also change the time span to 2025")
    list(
        runner.run(
            new_message=msg9,
            user_id="test_user",
            session_id=session.id,
            run_config=RunConfig(streaming_mode=StreamingMode.SSE),
        )
    )
    updated_session = session_service.get_session_sync(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    brief = updated_session.state.get("company_brief", {})
    assert brief.get("time_span") == "2025", f"Expected time_span '2025', got {brief}"
    assert updated_session.state.get("is_report_created") is False, (
        "Expected report created to be False"
    )

    # Turn 10: User: in HITL: "all good"
    msg10 = _make_user_response("confirmation_reply_2", "all good")
    list(
        runner.run(
            new_message=msg10,
            user_id="test_user",
            session_id=session.id,
            run_config=RunConfig(streaming_mode=StreamingMode.SSE),
        )
    )
    updated_session = session_service.get_session_sync(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert updated_session.state.get("is_report_created") is True, (
        "Expected new report to be created"
    )
    assert updated_session.state.get("report_markdown"), "Expected new report markdown in state"
    assert "XYZ" in updated_session.state.get("report_markdown", "")
