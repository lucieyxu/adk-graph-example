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

from dotenv import load_dotenv
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from company_health_analyst.agent import app

load_dotenv()


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


def test_multi_turn_task_mode_scenario() -> None:
    """Integration test for end-to-end 10-turn task mode intake, Q&A, and rerun workflow.

    Tests the complete 10-step integration scenario described in README.md:
    1. Greeting & capabilities explanation.
    2. Initial analysis request with missing parameters.
    3. Conversational recall question during intake.
    4. Historical reports query using archive inspection tools.
    5. Providing missing geographic region parameter.
    6. Confirming timeframe and generating initial report.
    7. Post-report comparative strategic Q&A.
    8. Modifying parameters (changing region to Asia).
    9. Modifying timeframe (changing timeframe to 2025).
    10. Confirming parameters and regenerating report with updated parameters.
    """
    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="test_app")
    runner = Runner(app=app, session_service=session_service, app_name="test_app")

    turns = [
        # 1. Greeting & Explanation
        "Hello, what is this tool for?",
        # 2. Initial Analysis Request & Missing Parameter Detection
        "Analyze XYZ, it was founded in 2020 by John Doe",
        # 3. Conversational Question During Pause
        "Remind me when was the company founded again?",
        # 4. Historical Query During Pause
        "Give me the summary of past reports on the company",
        # 5. Providing Missing Parameter
        "Europe",
        # 6. Confirming & Generating Report
        "ok, use 2026",
        # 7. Post-Report Comparison Q&A
        "Compare this new report to past reports",
        # 8. Modifying a Parameter
        "Change the parameter to use Asia",
        # 9. Modifying Another Parameter
        "Also change the time span to 2025",
        # 10. Confirming Modified Parameters & Generating New Report
        "all good",
    ]

    for i, user_text in enumerate(turns, 1):
        msg = types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_text)],
        )
        events = list(
            runner.run(
                new_message=msg,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        )
        assert len(events) > 0, f"Expected events on Turn {i}"

        # Hardened check 1: Fail immediately if any event reported an error_code
        for event in events:
            assert getattr(event, "error_code", None) is None, (
                f"Turn {i} ('{user_text}') failed with error_code={event.error_code}: "
                f"{getattr(event, 'error_message', '')}"
            )

        # Hardened check 2: Fail immediately if the turn produced no model text or tool calls
        # (catches silent drops and empty STOP responses under StreamingMode.SSE)
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
            f"Turn {i} ('{user_text}') produced no model text or tool calls "
            f"(silent empty response). "
            f"Emitted event actions: {[getattr(e, 'actions', None) for e in events]}"
        )

        # Verification after initial report generation (Turn 6)
        if i == 6:
            s6 = session_service.get_session_sync(
                app_name="test_app", user_id="test_user", session_id=session.id
            )
            assert s6 is not None
            assert s6.state.get("is_report_created") is True
            brief6 = s6.state.get("company_brief", {})
            assert brief6.get("company_name") == "XYZ"
            assert "2026" in str(brief6.get("time_span"))
            assert s6.state.get("report_markdown") is not None

    # Verification after complete 10-turn lifecycle
    final_session = session_service.get_session_sync(
        app_name="test_app", user_id="test_user", session_id=session.id
    )
    assert final_session is not None
    assert final_session.state.get("is_report_created") is True
    final_brief = final_session.state.get("company_brief", {})
    assert final_brief.get("company_name") == "XYZ"
    assert "Asia" in str(final_brief.get("region"))
    assert "2025" in str(final_brief.get("time_span"))
    assert final_session.state.get("report_markdown") is not None
