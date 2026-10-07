"""Tests for workflow execution with task-mode intake agent."""

from collections.abc import AsyncGenerator
from unittest.mock import patch
import pytest

from google.adk import Event
from google.adk.agents import LlmAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.agents.llm.task._finish_task_tool import FINISH_TASK_SUCCESS_RESULT
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from company_health_analyst.graph import root_agent
from company_health_analyst.schemas import IntentCategory


@pytest.mark.asyncio
async def test_workflow_task_mode_conversation_and_report_generation():
    """Verifies that intake_agent has multi-turn dialog and advances only on finish_task."""
    session_service = InMemorySessionService()
    session = await session_service.create_session(user_id="test_user", app_name="test_app")
    runner = Runner(agent=root_agent, session_service=session_service, app_name="test_app")

    turn = 0
    modify_called = False

    async def fake_run_async_impl(
        self: LlmAgent, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        nonlocal turn, modify_called
        if self.name == "intake_agent":
            if turn == 0:
                turn += 1
                yield Event(
                    content=types.Content(
                        role="model",
                        parts=[
                            types.Part.from_text(
                                text=(
                                    "Hello! I can help you analyze company financial health. "
                                    "What company would you like to analyze?"
                                )
                            )
                        ],
                    )
                )
            elif turn == 1:
                turn += 1
                yield Event(
                    content=types.Content(
                        role="model",
                        parts=[
                            types.Part.from_text(
                                text=(
                                    "I have captured Alphabet. "
                                    "What timeframe and region should I focus on?"
                                )
                            )
                        ],
                    )
                )
            elif not modify_called:
                # Initial brief completion
                fc = types.FunctionCall(
                    name="finish_task",
                    args={"company_name": "Alphabet", "time_span": "Q1 2026", "region": "US"},
                    id="call_finish_task_1",
                )
                yield Event(
                    content=types.Content(
                        role="model",
                        parts=[
                            types.Part.from_text(text="Analyzing Alphabet in US for Q1 2026..."),
                            types.Part(function_call=fc),
                        ],
                    )
                )
                fr = types.FunctionResponse(
                    name="finish_task",
                    response={"result": FINISH_TASK_SUCCESS_RESULT},
                    id="call_finish_task_1",
                )
                yield Event(
                    content=types.Content(
                        role="user",
                        parts=[types.Part(function_response=fr)],
                    )
                )
            else:
                # Modified brief completion
                fc = types.FunctionCall(
                    name="finish_task",
                    args={"company_name": "Alphabet", "time_span": "Q1 2026", "region": "Europe"},
                    id="call_finish_task_2",
                )
                yield Event(
                    content=types.Content(
                        role="model",
                        parts=[
                            types.Part.from_text(
                                text="Updating region to Europe and regenerating report..."
                            ),
                            types.Part(function_call=fc),
                        ],
                    )
                )
                fr = types.FunctionResponse(
                    name="finish_task",
                    response={"result": FINISH_TASK_SUCCESS_RESULT},
                    id="call_finish_task_2",
                )
                yield Event(
                    content=types.Content(
                        role="user",
                        parts=[types.Part(function_response=fr)],
                    )
                )
        elif self.name == "intent_classifier_agent":
            # Check user query in session events
            last_user_text = ""
            if ctx.session and ctx.session.events:
                for ev in reversed(ctx.session.events):
                    if ev.author == "user" and ev.content and ev.content.parts:
                        last_user_text = "".join(p.text or "" for p in ev.content.parts)
                        if last_user_text:
                            break
            if "explain" in last_user_text.lower():
                yield Event(
                    output={"intent": "ask_explanation", "explanation": "Explaining report"}
                )
            else:
                modify_called = True
                yield Event(
                    output={"intent": "modify", "explanation": "Modifying report parameter"}
                )
        elif self.name == "explanation_agent":
            yield Event(
                output=(
                    "Detailed Risk Factors Analysis: The primary risk factors are "
                    "regulatory antitrust compliance in the EU and data center capex."
                ),
                content=types.Content(
                    role="model",
                    parts=[
                        types.Part.from_text(
                            text=(
                                "Detailed Risk Factors Analysis: The primary risk factors are "
                                "regulatory antitrust compliance in the EU and data center capex."
                            )
                        )
                    ],
                ),
            )
        elif self.name == "report_synthesizer_agent":
            if not modify_called:
                yield Event(
                    output="# Comprehensive Company Health Report for Alphabet",
                    content=types.Content(
                        role="model",
                        parts=[
                            types.Part.from_text(
                                text="# Comprehensive Company Health Report for Alphabet"
                            )
                        ],
                    ),
                )
            else:
                yield Event(
                    output="# Comprehensive Company Health Report for Alphabet in Europe",
                    content=types.Content(
                        role="model",
                        parts=[
                            types.Part.from_text(
                                text="# Comprehensive Company Health Report for Alphabet in Europe"
                            )
                        ],
                    ),
                )
        else:
            raise ValueError(f"Unexpected LlmAgent call: {self.name}")

    async def fake_classify_intent(query: str) -> IntentCategory:
        nonlocal modify_called
        if "explain" in query.lower():
            return IntentCategory.ASK_EXPLANATION
        modify_called = True
        return IntentCategory.MODIFY

    with (
        patch.object(LlmAgent, "_run_async_impl", fake_run_async_impl),
        patch(
            "company_health_analyst.nodes.classify_intent_async",
            side_effect=fake_classify_intent,
        ),
    ):
        # Turn 1: User greets and asks what tool is for

        msg1 = types.Content(
            role="user",
            parts=[types.Part.from_text(text="Hi! What can you do?")],
        )
        events1 = [
            event
            async for event in runner.run_async(
                new_message=msg1,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        ]
        assert len(events1) > 0
        has_intro = any(
            event.content
            and event.content.parts
            and any("analyze company" in (p.text or "") for p in event.content.parts)
            for event in events1
        )
        assert has_intro

        # Check that the workflow has NOT run searches or created report yet
        s1 = await session_service.get_session(
            app_name="test_app", user_id="test_user", session_id=session.id
        )
        assert s1.state.get("is_report_created") is not True

        # Turn 2: User provides partial information
        msg2 = types.Content(
            role="user",
            parts=[types.Part.from_text(text="I want to analyze Alphabet")],
        )
        events2 = [
            event
            async for event in runner.run_async(
                new_message=msg2,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        ]
        assert len(events2) > 0
        has_followup = any(
            event.content
            and event.content.parts
            and any("Alphabet" in (p.text or "") for p in event.content.parts)
            for event in events2
        )
        assert has_followup

        s2 = await session_service.get_session(
            app_name="test_app", user_id="test_user", session_id=session.id
        )
        assert s2.state.get("is_report_created") is not True

        # Turn 3: User provides missing timeframe and region
        # Intake agent calls finish_task -> workflow halts at validate_intake_node
        msg3 = types.Content(
            role="user",
            parts=[types.Part.from_text(text="For Q1 2026 in US")],
        )
        events3 = [
            event
            async for event in runner.run_async(
                new_message=msg3,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        ]
        assert len(events3) > 0

        # Verify HITL validation request is emitted and report is NOT created yet
        has_hitl_request = any(
            event.content
            and event.content.parts
            and any(
                getattr(p, "function_call", None) is not None
                and p.function_call.id == "validate_captured_brief_1"
                for p in event.content.parts
            )
            for event in events3
        )
        assert has_hitl_request, "Expected HITL validation interrupt request on Turn 3."

        s3_pre = await session_service.get_session(
            app_name="test_app", user_id="test_user", session_id=session.id
        )
        assert s3_pre.state.get("is_report_created") is not True

        # Turn 3b: Human confirms captured brief -> workflow resumes and generates report
        hitl_fr = types.FunctionResponse(
            name="adk_request_input",
            response={
                "approved": True,
                "company_name": "Alphabet",
                "time_span": "Q1 2026",
                "region": "US",
            },
            id="validate_captured_brief_1",
        )
        msg3b = types.Content(role="user", parts=[types.Part(function_response=hitl_fr)])
        events3b = [
            event
            async for event in runner.run_async(
                new_message=msg3b,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        ]
        assert len(events3b) > 0

        s3_post = await session_service.get_session(
            app_name="test_app", user_id="test_user", session_id=session.id
        )
        assert s3_post.state.get("is_report_created") is True
        assert (
            s3_post.state.get("report_markdown")
            == "# Comprehensive Company Health Report for Alphabet"
        )

        # Turn 4: Follow-up explanation question on existing report -> routes to explanation_agent
        msg4 = types.Content(
            role="user",
            parts=[types.Part.from_text(text="explain in more details the risk factors")],
        )
        events4 = [
            event
            async for event in runner.run_async(
                new_message=msg4,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        ]
        assert len(events4) > 0
        has_risk_explanation = any(
            event.content
            and event.content.parts
            and any("risk factors" in (p.text or "").lower() for p in event.content.parts)
            for event in events4
        )
        assert has_risk_explanation

        # Turn 5: Modification -> routes to intake_agent then halts at validate_intake_node
        msg5 = types.Content(
            role="user",
            parts=[types.Part.from_text(text="change the analysis to Europe now")],
        )
        events5 = [
            event
            async for event in runner.run_async(
                new_message=msg5,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        ]
        assert len(events5) > 0
        has_modify_hitl = any(
            event.content
            and event.content.parts
            and any(
                getattr(p, "function_call", None) is not None
                and p.function_call.id == "validate_captured_brief_2"
                for p in event.content.parts
            )
            for event in events5
        )
        assert has_modify_hitl, "Expected HITL validation interrupt on Turn 5 modification."

        # Turn 5b: Human confirms modified brief -> workflow resumes and regenerates report
        hitl_fr5 = types.FunctionResponse(
            name="adk_request_input",
            response={
                "approved": True,
                "company_name": "Alphabet",
                "time_span": "Q1 2026",
                "region": "Europe",
            },
            id="validate_captured_brief_2",
        )
        msg5b = types.Content(role="user", parts=[types.Part(function_response=hitl_fr5)])
        events5b = [
            event
            async for event in runner.run_async(
                new_message=msg5b,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        ]
        assert len(events5b) > 0

        s5 = await session_service.get_session(
            app_name="test_app", user_id="test_user", session_id=session.id
        )
        assert s5.state.get("company_brief") == {
            "company_name": "Alphabet",
            "time_span": "Q1 2026",
            "region": "Europe",
            "summary": None,
        }
        assert s5.state.get("is_report_created") is True
        assert (
            s5.state.get("report_markdown")
            == "# Comprehensive Company Health Report for Alphabet in Europe"
        )


@pytest.mark.asyncio
async def test_workflow_hitl_validation_with_field_edits():
    """Verifies that human can correct/override parameters during the HITL validation step."""
    session_service = InMemorySessionService()
    session = await session_service.create_session(user_id="test_user", app_name="test_app")
    runner = Runner(agent=root_agent, session_service=session_service, app_name="test_app")

    async def fake_run_async_impl(
        self: LlmAgent, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        if self.name == "intake_agent":
            # Initial brief completion with US
            fc = types.FunctionCall(
                name="finish_task",
                args={"company_name": "Alphabet", "time_span": "Q1 2026", "region": "US"},
                id="call_finish_task_1",
            )
            yield Event(
                content=types.Content(
                    role="model",
                    parts=[
                        types.Part.from_text(text="Captured Alphabet in US..."),
                        types.Part(function_call=fc),
                    ],
                )
            )
            fr = types.FunctionResponse(
                name="finish_task",
                response={"result": FINISH_TASK_SUCCESS_RESULT},
                id="call_finish_task_1",
            )
            yield Event(
                content=types.Content(
                    role="user",
                    parts=[types.Part(function_response=fr)],
                )
            )
        elif self.name == "report_synthesizer_agent":
            yield Event(
                output="# Comprehensive Company Health Report for Alphabet in Asia",
                content=types.Content(
                    role="model",
                    parts=[
                        types.Part.from_text(
                            text="# Comprehensive Company Health Report for Alphabet in Asia"
                        )
                    ],
                ),
            )
        else:
            raise ValueError(f"Unexpected LlmAgent call: {self.name}")

    with patch.object(LlmAgent, "_run_async_impl", fake_run_async_impl):
        # Step 1: Intake captures parameters
        msg1 = types.Content(
            role="user",
            parts=[types.Part.from_text(text="Analyze Alphabet for Q1 2026 in US")],
        )
        events1 = [
            event
            async for event in runner.run_async(
                new_message=msg1,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        ]
        assert len(events1) > 0

        # Step 2: Human overrides region from US to Asia during HITL validation
        hitl_edit_fr = types.FunctionResponse(
            name="adk_request_input",
            response={
                "approved": True,
                "company_name": "Alphabet",
                "time_span": "Q1 2026",
                "region": "Asia",
            },
            id="validate_captured_brief_1",
        )
        msg2 = types.Content(role="user", parts=[types.Part(function_response=hitl_edit_fr)])
        events2 = [
            event
            async for event in runner.run_async(
                new_message=msg2,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        ]
        assert len(events2) > 0

        s_final = await session_service.get_session(
            app_name="test_app", user_id="test_user", session_id=session.id
        )
        assert s_final.state.get("company_brief") == {
            "company_name": "Alphabet",
            "time_span": "Q1 2026",
            "region": "Asia",
            "summary": None,
        }
        assert s_final.state.get("is_report_created") is True
        assert (
            s_final.state.get("report_markdown")
            == "# Comprehensive Company Health Report for Alphabet in Asia"
        )


@pytest.mark.asyncio
async def test_workflow_hitl_validation_with_blank_form_submission():
    """Verifies that submitting blank form (nulls) retains the captured parameters."""
    session_service = InMemorySessionService()
    session = await session_service.create_session(user_id="test_user", app_name="test_app")
    runner = Runner(agent=root_agent, session_service=session_service, app_name="test_app")

    async def fake_run_async_impl(
        self: LlmAgent, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        if self.name == "intake_agent":
            fc = types.FunctionCall(
                name="finish_task",
                args={"company_name": "Alphabet", "time_span": "Q1 2026", "region": "US"},
                id="call_finish_task_1",
            )
            yield Event(
                content=types.Content(
                    role="model",
                    parts=[
                        types.Part.from_text(text="Captured Alphabet in US..."),
                        types.Part(function_call=fc),
                    ],
                )
            )
            fr = types.FunctionResponse(
                name="finish_task",
                response={"result": FINISH_TASK_SUCCESS_RESULT},
                id="call_finish_task_1",
            )
            yield Event(
                content=types.Content(
                    role="user",
                    parts=[types.Part(function_response=fr)],
                )
            )
        elif self.name == "report_synthesizer_agent":
            yield Event(
                output="# Comprehensive Company Health Report for Alphabet",
                content=types.Content(
                    role="model",
                    parts=[
                        types.Part.from_text(
                            text="# Comprehensive Company Health Report for Alphabet"
                        )
                    ],
                ),
            )
        else:
            raise ValueError(f"Unexpected LlmAgent call: {self.name}")

    with patch.object(LlmAgent, "_run_async_impl", fake_run_async_impl):
        # Step 1: Intake captures parameters
        msg1 = types.Content(
            role="user",
            parts=[types.Part.from_text(text="Analyze Alphabet for Q1 2026 in US")],
        )
        events1 = [
            event
            async for event in runner.run_async(
                new_message=msg1,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        ]
        assert len(events1) > 0

        # Step 2: Human submits form blank (UI sends nulls for empty text fields)
        hitl_blank_fr = types.FunctionResponse(
            name="adk_request_input",
            response={
                "approved": True,
                "company_name": None,
                "time_span": None,
                "region": None,
                "summary": None,
            },
            id="validate_captured_brief_1",
        )
        msg2 = types.Content(role="user", parts=[types.Part(function_response=hitl_blank_fr)])
        events2 = [
            event
            async for event in runner.run_async(
                new_message=msg2,
                user_id="test_user",
                session_id=session.id,
                run_config=RunConfig(streaming_mode=StreamingMode.SSE),
            )
        ]
        assert len(events2) > 0

        s_final = await session_service.get_session(
            app_name="test_app", user_id="test_user", session_id=session.id
        )
        assert s_final.state.get("company_brief") == {
            "company_name": "Alphabet",
            "time_span": "Q1 2026",
            "region": "US",
            "summary": None,
        }
        assert s_final.state.get("is_report_created") is True
        assert (
            s_final.state.get("report_markdown")
            == "# Comprehensive Company Health Report for Alphabet"
        )
