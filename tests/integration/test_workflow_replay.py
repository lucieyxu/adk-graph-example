"""Tests for workflow replay and HITL multi-turn conversations."""

from collections.abc import AsyncGenerator
from unittest.mock import patch
import pytest

from google.adk import Event
from google.adk.agents import LlmAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from company_health_analyst.graph import root_agent
from company_health_analyst.schemas import (
    CompanyBrief,
    ExtractorOutput,
    IntentCategory,
    IntentClassification,
)


def _make_llm_event(output_obj: object) -> Event:
    """Helper to create a mock Event with JSON output."""
    raw = (
        output_obj.model_dump_json() if hasattr(output_obj, "model_dump_json") else str(output_obj)
    )
    return Event(
        output=raw,
        content=types.Content(
            role="model",
            parts=[types.Part.from_text(text=raw)],
        ),
    )


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


@pytest.mark.asyncio
async def test_workflow_modify_and_confirm_replay():
    """Reproduces conversation where modify and confirm causes replay divergence."""
    session_service = InMemorySessionService()
    session = session_service.create_session_sync(user_id="test_user", app_name="test_app")
    runner = Runner(agent=root_agent, session_service=session_service, app_name="test_app")

    intent_responses = [
        _make_llm_event(
            IntentClassification(intent=IntentCategory.GENERATE_REPORT, explanation="Turn 1")
        ),
        _make_llm_event(
            IntentClassification(intent=IntentCategory.ASK_EXPLANATION, explanation="Explain")
        ),
        _make_llm_event(
            IntentClassification(intent=IntentCategory.ASK_EXPLANATION, explanation="Explain")
        ),
        _make_llm_event(
            IntentClassification(intent=IntentCategory.GENERATE_REPORT, explanation="Report")
        ),
        _make_llm_event(
            IntentClassification(intent=IntentCategory.CONFIRM_REPORT, explanation="Confirm")
        ),
        _make_llm_event(
            IntentClassification(intent=IntentCategory.ASK_EXPLANATION, explanation="Explain")
        ),
        _make_llm_event(IntentClassification(intent=IntentCategory.MODIFY, explanation="Modify")),
        _make_llm_event(IntentClassification(intent=IntentCategory.MODIFY, explanation="Modify 2")),
        _make_llm_event(
            IntentClassification(intent=IntentCategory.CONFIRM_REPORT, explanation="Confirm 2")
        ),
    ]
    intent_iter = iter(intent_responses)

    extractor_responses = [
        _make_llm_event(
            ExtractorOutput(company_brief=CompanyBrief(company_name="XYZ"), conflicts=[])
        ),
        _make_llm_event(
            ExtractorOutput(
                company_brief=CompanyBrief(time_span="last year", region="Europe"), conflicts=[]
            )
        ),
        _make_llm_event(ExtractorOutput(company_brief=CompanyBrief(region="US"), conflicts=[])),
        _make_llm_event(ExtractorOutput(company_brief=CompanyBrief(region="Asia"), conflicts=[])),
    ]
    extractor_iter = iter(extractor_responses)

    async def fake_run_async_impl(
        self: LlmAgent, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        if self.name == "intent_classifier_agent":
            ev = next(intent_iter)
            print("INTENT CLASSIFIER CALLED ->", ev.output)
            yield ev
        elif self.name == "extractor_agent":
            yield next(extractor_iter)
        elif self.name == "explanation_agent":
            yield Event(
                output="Explanation response",
                content=types.Content(
                    role="model",
                    parts=[types.Part.from_text(text="Explanation response")],
                ),
            )
        elif self.name == "report_synthesizer_agent":
            yield Event(
                output="# Company Health Report for XYZ",
                content=types.Content(
                    role="model",
                    parts=[types.Part.from_text(text="# Company Health Report for XYZ")],
                ),
            )
        else:
            raise ValueError(f"Unexpected LlmAgent call: {self.name}")

    with patch.object(LlmAgent, "_run_async_impl", fake_run_async_impl):
        # Turn 1: Initial query
        msg1 = types.Content(
            role="user",
            parts=[
                types.Part.from_text(text="Analyze XYZ, the company was founded in 2000 by Mr John")
            ],
        )
        list(
            runner.run(
                new_message=msg1,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        )

        # Turn 2: Ask explanation
        msg2 = _make_user_response("missing_fields_reply_0", "remind me when was it founded again?")
        list(
            runner.run(
                new_message=msg2,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        )

        # Turn 3: Ask another explanation
        msg3 = _make_user_response("missing_fields_reply_1", "and by whom was it founded?")
        list(
            runner.run(
                new_message=msg3,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        )

        # Turn 4: Provide Europe
        msg4 = _make_user_response("missing_fields_reply_2", "europe")
        list(
            runner.run(
                new_message=msg4,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        )

        # Turn 5: Confirm report
        msg5 = _make_user_response("confirmation_reply_0", "all good")
        list(
            runner.run(
                new_message=msg5,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        )

        # Turn 6: Ask explanation after report
        msg6 = types.Content(
            role="user",
            parts=[types.Part.from_text(text="remind me when was the company founded")],
        )
        list(
            runner.run(
                new_message=msg6,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        )

        # Turn 7: Modify region to US
        msg7 = types.Content(
            role="user",
            parts=[types.Part.from_text(text="now change the region to be US")],
        )
        list(
            runner.run(
                new_message=msg7,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        )

        # Turn 8: Change mind and set asia
        msg8 = _make_user_response("confirmation_reply_1", "asia")
        list(
            runner.run(
                new_message=msg8,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        )

        # Turn 9: Confirm new report after modifying parameters
        msg9 = _make_user_response("confirmation_reply_2", "all good")
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
        assert updated_session.state.get("is_report_created") is True
        assert updated_session.state.get("report_markdown") == "# Company Health Report for XYZ"
