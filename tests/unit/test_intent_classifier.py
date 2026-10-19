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

"""Unit tests for the out-of-band intent classifier's request config and retry policy."""

import logging
from collections.abc import Awaitable, Callable
from typing import Any, Protocol, cast
from unittest.mock import AsyncMock, MagicMock

import pytest
from google.adk.agents.context import Context
from google.genai import errors, types
from tenacity import wait_none

from company_health_analyst.nodes import (
    _is_transient_api_error,
    classify_intent_async,
    route_user_request,
)
from company_health_analyst.schemas import IntentCategory, IntentClassification
from company_health_analyst.subagents import explanation_agent

QUERY = "Change the region to Asia"


class _RetryConfigurable(Protocol):
    """Tenacity attaches ``retry_with`` to every function it decorates."""

    def retry_with(self, **kwargs: Any) -> Callable[[str], Awaitable[IntentCategory]]: ...


def _api_error(error_cls: type[errors.APIError], code: int) -> errors.APIError:
    """Builds a genai APIError shaped like a Vertex AI error payload."""
    return error_cls(code, {"error": {"code": code, "message": "simulated", "status": "SIMULATED"}})


def _classified(intent: IntentCategory) -> MagicMock:
    """Builds a generate_content response whose parsed payload is the given intent."""
    return MagicMock(parsed=IntentClassification(intent=intent, explanation="test"))


def _mock_generate_content(monkeypatch: pytest.MonkeyPatch, side_effect: list[Any]) -> AsyncMock:
    """Replaces the Vertex AI client and returns its mocked generate_content coroutine."""
    generate_content = AsyncMock(side_effect=side_effect)
    client = MagicMock()
    client.aio.models.generate_content = generate_content
    monkeypatch.setattr("company_health_analyst.nodes._get_genai_client", lambda: client)
    return generate_content


def _classify_without_backoff() -> Callable[[str], Awaitable[IntentCategory]]:
    """Returns classify_intent_async with its production retry policy minus the sleeps."""
    return cast(_RetryConfigurable, classify_intent_async).retry_with(wait=wait_none())


@pytest.mark.asyncio
async def test_classifier_uses_low_thinking_level(monkeypatch: pytest.MonkeyPatch) -> None:
    """Verifies the classifier requests LOW thinking; gemini-3.8-flash rejects MINIMAL."""
    generate_content = _mock_generate_content(monkeypatch, [_classified(IntentCategory.MODIFY)])

    intent = await classify_intent_async(QUERY)

    assert intent == IntentCategory.MODIFY
    assert generate_content.await_args is not None
    config = generate_content.await_args.kwargs["config"]
    assert config.thinking_config.thinking_level == types.ThinkingLevel.LOW


@pytest.mark.parametrize(
    ("code", "expected"),
    [
        (408, True),
        (429, True),
        (500, True),
        (502, True),
        (503, True),
        (504, True),
        (400, False),
        (401, False),
        (403, False),
        (404, False),
        (501, False),
    ],
)
def test_is_transient_api_error_by_status_code(code: int, expected: bool) -> None:
    """Verifies only timeouts, quota limits and server faults are treated as retryable."""
    error_cls = errors.ServerError if code >= 500 else errors.ClientError
    assert _is_transient_api_error(_api_error(error_cls, code)) is expected


def test_is_transient_api_error_ignores_non_api_errors() -> None:
    """Verifies local failures, such as malformed classifier JSON, are never retried."""
    assert _is_transient_api_error(ValueError("malformed classifier JSON")) is False


@pytest.mark.asyncio
async def test_classifier_fails_fast_on_non_transient_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verifies a 400, such as an unsupported config, raises on the first attempt."""
    generate_content = _mock_generate_content(monkeypatch, [_api_error(errors.ClientError, 400)])

    with pytest.raises(errors.ClientError):
        await _classify_without_backoff()(QUERY)

    assert generate_content.await_count == 1


@pytest.mark.asyncio
async def test_classifier_retries_transient_errors_then_succeeds(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verifies 503 and 429 responses are retried until the call succeeds."""
    generate_content = _mock_generate_content(
        monkeypatch,
        [
            _api_error(errors.ServerError, 503),
            _api_error(errors.ClientError, 429),
            _classified(IntentCategory.MODIFY),
        ],
    )

    intent = await _classify_without_backoff()(QUERY)

    assert intent == IntentCategory.MODIFY
    assert generate_content.await_count == 3


@pytest.mark.asyncio
async def test_classifier_reraises_after_exhausting_retries(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verifies a persistent transient error surfaces after the third attempt."""
    generate_content = _mock_generate_content(
        monkeypatch, [_api_error(errors.ServerError, 503) for _ in range(3)]
    )

    with pytest.raises(errors.ServerError):
        await _classify_without_backoff()(QUERY)

    assert generate_content.await_count == 3


@pytest.mark.asyncio
async def test_route_user_request_logs_classifier_failure_and_falls_back(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    """Verifies a classifier failure is logged at ERROR with a traceback, then falls back."""
    mock_ctx = MagicMock(spec=Context)
    mock_ctx.state = {"is_report_created": True}
    mock_ctx.run_node = AsyncMock(return_value=None)
    monkeypatch.setattr(
        "company_health_analyst.nodes.classify_intent_async",
        AsyncMock(side_effect=_api_error(errors.ClientError, 400)),
    )

    with caplog.at_level(logging.ERROR, logger="company_health_analyst.nodes"):
        event = await route_user_request(QUERY, mock_ctx)

    assert event is None
    mock_ctx.run_node.assert_called_once_with(
        explanation_agent, node_input=QUERY, use_as_output=True
    )
    error_records = [record for record in caplog.records if record.levelno == logging.ERROR]
    assert len(error_records) == 1
    assert error_records[0].exc_info is not None
