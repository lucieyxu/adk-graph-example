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

"""Unit tests for the self-healing ReflectAndRetryToolPlugin and task-mode error recovery."""

from typing import Any

import pytest
from google.adk.agents.invocation_context import InvocationContext
from google.adk.flows.llm_flows.tools import _caller
from google.adk.plugins import ReflectAndRetryToolPlugin
from google.adk.plugins.plugin_manager import PluginManager
from google.adk.sessions import InMemorySessionService
from google.adk.sessions.session import Session
from google.genai import types

from company_health_analyst.agent import app
from company_health_analyst.prompts import PromptTemplate
from company_health_analyst.subagents import intake_agent


def test_plugin_registered_on_adk_app() -> None:
    """Verifies that ReflectAndRetryToolPlugin is mounted on the global ADK App."""
    assert app.plugins is not None
    assert len(app.plugins) > 0
    plugin = app.plugins[0]
    assert isinstance(plugin, ReflectAndRetryToolPlugin)
    assert plugin.name == "intake_tool_retry_plugin"
    assert plugin.max_retries == 2
    assert plugin.throw_exception_if_retry_exceeded is False


def test_intake_agent_prompt_configuration() -> None:
    """Verifies that PromptTemplate.INTAKE_AGENT specifies parameters and task guidelines."""
    prompt = PromptTemplate.INTAKE_AGENT
    assert "company_name" in prompt
    assert "time_span" in prompt
    assert "region" in prompt
    assert "finish_task" in prompt
    assert "Conversational Behavior" in prompt


@pytest.mark.asyncio
async def test_e2e_prepared_call_dispatcher_with_hallucinated_readline() -> None:
    """Verifies full ADK tool caller pipeline handles hallucinated readLine with self-healing."""
    plugin = ReflectAndRetryToolPlugin(
        name="intake_tool_retry_plugin",
        max_retries=2,
        throw_exception_if_retry_exceeded=False,
    )
    pm = PluginManager(plugins=[plugin])
    session = Session(id="s1", user_id="u1", app_name="company_health_analyst")
    ic = InvocationContext(
        invocation_id="inv_e2e",
        agent=intake_agent,
        session=session,
        session_service=InMemorySessionService(),
        plugin_manager=pm,
    )

    fc = types.FunctionCall(name="readLine", args={}, id="call_test_readline")

    prepared = await _caller._prepare_single(ic, fc, {}, intake_agent)
    event = await _caller._execute_single_prepared_call_async(ic, prepared, intake_agent)

    assert event is not None
    assert event.content is not None
    assert len(event.content.parts) == 1

    function_resp: Any = event.content.parts[0].function_response
    assert function_resp is not None
    assert function_resp.name == "readLine"
    response_payload = function_resp.response
    assert response_payload["error_type"] == "ValueError"
    assert "readLine" in response_payload["reflection_guidance"]
    assert "Wrong Function Name" in response_payload["reflection_guidance"]
