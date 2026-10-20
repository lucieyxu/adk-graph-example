"""Unit tests for the google-genai hooks and the ADK span router used by the benchmark."""

from collections.abc import AsyncIterator, Iterator
from typing import Any

import pytest
from google import genai
from google.genai import models as genai_models
from google.genai import types
from opentelemetry import trace

from benchmarks.instrumentation import (
    ADK_AGENT_LABEL,
    BenchmarkInstrumentation,
    RunCollector,
    TokenUsage,
    parse_span_name,
)

USAGE = types.GenerateContentResponseUsageMetadata(
    prompt_token_count=1200,
    cached_content_token_count=800,
    thoughts_token_count=64,
    candidates_token_count=40,
    total_token_count=1304,
)


def _response(text: str, usage: types.GenerateContentResponseUsageMetadata | None = None) -> Any:
    return types.GenerateContentResponse(
        candidates=[
            types.Candidate(content=types.Content(role="model", parts=[types.Part(text=text)]))
        ],
        usage_metadata=usage,
    )


@pytest.fixture
def client() -> genai.Client:
    return genai.Client(vertexai=True, project="test-project", location="global")


@pytest.fixture
def fake_unary(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, Any]]:
    """Replaces the SDK's unary transport; returns the recorded request kwargs."""
    requests: list[dict[str, Any]] = []

    async def generate_content(self: genai_models.AsyncModels, **kwargs: Any) -> Any:
        requests.append(kwargs)
        if kwargs["contents"] == "fail":
            raise RuntimeError("quota exhausted")
        return _response("ok", USAGE)

    monkeypatch.setattr(genai_models.AsyncModels, "generate_content", generate_content)
    return requests


@pytest.fixture
def fake_stream(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replaces the SDK's streaming transport with three chunks; usage arrives with the last."""

    async def generate_content_stream(self: genai_models.AsyncModels, **kwargs: Any) -> Any:
        async def chunks() -> AsyncIterator[types.GenerateContentResponse]:
            yield _response("Hel")
            yield _response("lo", types.GenerateContentResponseUsageMetadata(prompt_token_count=1))
            yield _response("!", USAGE)

        return chunks()

    monkeypatch.setattr(
        genai_models.AsyncModels, "generate_content_stream", generate_content_stream
    )


def test_token_usage_treats_missing_counts_as_zero() -> None:
    usage = TokenUsage.from_metadata(
        types.GenerateContentResponseUsageMetadata(prompt_token_count=7)
    )

    assert usage == TokenUsage(prompt=7)
    assert TokenUsage.from_metadata(None) == TokenUsage()
    assert usage + TokenUsage(prompt=1, cached=2) == TokenUsage(prompt=8, cached=2)


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("invoke_node run_web_search", ("node", "run_web_search")),
        ("invoke_agent intake_agent", ("agent", "intake_agent")),
        ("invoke_workflow wf", ("workflow", "wf")),
        ("execute_tool finish_task", ("tool", "finish_task")),
        ("call_llm", ("llm", "call_llm")),
        ("generate_content gemini-3.8-flash", None),
        ("execute_tool (merged)", None),
        ("invocation", None),
    ],
)
def test_parse_span_name(name: str, expected: tuple[str, str] | None) -> None:
    assert parse_span_name(name) == expected


async def test_adk_request_is_attributed_to_its_agent_label(
    client: genai.Client, fake_unary: list[dict[str, Any]]
) -> None:
    run = RunCollector()
    config = types.GenerateContentConfig(labels={ADK_AGENT_LABEL: "intake_agent"})

    with BenchmarkInstrumentation(), run.activate():
        await client.aio.models.generate_content(model="m", contents="hi", config=config)

    calls, _ = run.drain()
    assert len(calls) == 1
    assert calls[0].component == "intake_agent"
    assert calls[0].via_adk is True
    assert calls[0].streamed is False
    assert calls[0].tokens == TokenUsage(
        prompt=1200, cached=800, thinking=64, candidates=40, total=1304
    )
    assert fake_unary[0]["config"] is config


async def test_direct_request_is_named_after_enclosing_node_and_caller(
    client: genai.Client, fake_unary: list[dict[str, Any]]
) -> None:
    async def classify_probe() -> None:
        await client.aio.models.generate_content(model="m", contents="classify")

    run = RunCollector()
    with BenchmarkInstrumentation(), run.activate():
        tracer = trace.get_tracer(__name__)
        with tracer.start_as_current_span("invoke_node route_user_request"):
            with tracer.start_as_current_span("unrelated child span"):
                await classify_probe()

    calls, spans = run.drain()
    assert len(calls) == 1
    assert calls[0].via_adk is False
    assert calls[0].component.startswith("route_user_request/")
    assert calls[0].component.endswith("classify_probe")
    assert [(s.kind, s.name) for s in spans] == [("node", "route_user_request")]


async def test_stream_records_first_chunk_latency_and_final_usage(
    client: genai.Client, fake_stream: None
) -> None:
    run = RunCollector()
    with BenchmarkInstrumentation(), run.activate():
        stream = await client.aio.models.generate_content_stream(model="m", contents="hi")
        text = "".join([chunk.text or "" async for chunk in stream])

    (call,), _ = run.drain()
    assert text == "Hello!"
    assert call.streamed is True
    assert call.ttft_s is not None and 0 <= call.ttft_s <= call.latency_s
    assert call.tokens.total == 1304


async def test_failed_request_is_recorded_with_its_error(
    client: genai.Client, fake_unary: list[dict[str, Any]]
) -> None:
    run = RunCollector()
    with BenchmarkInstrumentation(), run.activate():
        with pytest.raises(RuntimeError, match="quota exhausted"):
            await client.aio.models.generate_content(model="m", contents="fail")

    (call,), _ = run.drain()
    assert call.error == "RuntimeError: quota exhausted"
    assert call.tokens == TokenUsage()


def test_sync_stream_is_recorded(client: genai.Client, monkeypatch: pytest.MonkeyPatch) -> None:
    def generate_content_stream(self: genai_models.Models, **kwargs: Any) -> Iterator[Any]:
        yield _response("a")
        yield _response("b", USAGE)

    monkeypatch.setattr(genai_models.Models, "generate_content_stream", generate_content_stream)
    run = RunCollector()
    with BenchmarkInstrumentation(), run.activate():
        chunks = list(client.models.generate_content_stream(model="m", contents="hi"))

    (call,), _ = run.drain()
    assert len(chunks) == 2
    assert call.streamed is True
    assert call.tokens.candidates == 40


async def test_request_outside_a_run_is_counted_as_unattributed(
    client: genai.Client, fake_unary: list[dict[str, Any]]
) -> None:
    with BenchmarkInstrumentation() as instrumentation:
        await client.aio.models.generate_content(model="m", contents="hi")

    assert instrumentation.unattributed_calls == 1


def test_spans_are_routed_only_to_the_run_active_when_they_started() -> None:
    run = RunCollector()
    with BenchmarkInstrumentation():
        tracer = trace.get_tracer(__name__)
        with run.activate(), tracer.start_as_current_span("invoke_node inside"):
            pass
        with tracer.start_as_current_span("invoke_node outside"):
            pass

    _, spans = run.drain()
    assert [span.name for span in spans] == ["inside"]
    assert spans[0].duration_s >= 0


def test_exit_restores_the_sdk_methods() -> None:
    originals = (genai_models.AsyncModels.generate_content, genai_models.Models.generate_content)

    with BenchmarkInstrumentation():
        assert genai_models.AsyncModels.generate_content is not originals[0]

    assert (
        genai_models.AsyncModels.generate_content,
        genai_models.Models.generate_content,
    ) == originals


def test_constants_match_adk() -> None:
    """Guards the copies of ADK's private constants against upstream renames."""
    from google.adk.flows.llm_flows.core._model_call import ADK_AGENT_NAME_LABEL_KEY
    from google.adk.workflow.utils._workflow_hitl_utils import REQUEST_INPUT_FUNCTION_CALL_NAME

    from benchmarks.session_benchmark import REQUEST_INPUT_FUNCTION

    assert ADK_AGENT_LABEL == ADK_AGENT_NAME_LABEL_KEY
    assert REQUEST_INPUT_FUNCTION == REQUEST_INPUT_FUNCTION_CALL_NAME
