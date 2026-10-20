"""Process-wide hooks that attribute every Gemini request and every ADK span to a benchmark run.

Two complementary sources are captured, both routed to the active run through a ContextVar so
that concurrent runs stay separated:

* **google-genai SDK hooks.** The public ``generate_content`` and ``generate_content_stream``
  methods of ``Models`` and ``AsyncModels`` are wrapped at class level. Every Gemini request in
  the process passes through them: ADK agents (via ``google.adk.models.Gemini``) as well as any
  out-of-band call that bypasses ADK and therefore never appears in ADK telemetry. Token usage
  is read from each response's ``usage_metadata``.
* **ADK OpenTelemetry spans.** A span processor records ADK's ``invoke_workflow``,
  ``invoke_node``, ``invoke_agent``, ``execute_tool`` and ``call_llm`` spans, including those of
  a workflow running inside a ``NodeTool``. This covers the deterministic graph nodes
  (``run_web_search``, ``run_internal_search``, ``join_search_results``): ADK emits an
  ``invoke_node`` span for each of them, and they are read here straight from the tracer
  provider, independently of what the playground's trace view shows.
"""

from __future__ import annotations

import contextvars
import functools
import inspect
import logging
import threading
import time
from collections.abc import (
    AsyncGenerator,
    AsyncIterator,
    Awaitable,
    Callable,
    Generator,
    Iterator,
)
from contextlib import contextmanager
from dataclasses import dataclass
from types import TracebackType
from typing import Any, Literal, Self

from google.genai import models as genai_models
from google.genai import types
from opentelemetry import context as otel_context
from opentelemetry import trace
from opentelemetry.sdk.trace import ReadableSpan, Span, SpanProcessor, TracerProvider

logger = logging.getLogger(__name__)

# Label ADK stamps on every model request it issues (ADK_AGENT_NAME_LABEL_KEY in
# google.adk.flows.llm_flows.core._model_call). Requests without it bypassed ADK.
ADK_AGENT_LABEL = "adk_agent_name"

type SpanKind = Literal["workflow", "node", "agent", "tool", "llm"]
type _Usage = types.GenerateContentResponseUsageMetadata

_SPAN_PREFIXES: tuple[tuple[str, SpanKind], ...] = (
    ("invoke_workflow ", "workflow"),
    ("invoke_node ", "node"),
    ("invoke_agent ", "agent"),
    ("execute_tool ", "tool"),
)
_ADK_MODEL_CALL_SPAN = "call_llm"
# Wrapper ADK opens around parallel tool calls; each call also gets its own execute_tool span.
_ADK_TOOL_BATCH_SPAN = "execute_tool (merged)"

# Frames from these modules are skipped when naming the function behind an out-of-band request.
_PLUMBING_MODULES = ("google.genai", "tenacity", "asyncio", "contextlib", "functools", __name__)


def parse_span_name(name: str) -> tuple[SpanKind, str] | None:
    """Maps an ADK span name to its kind and subject, e.g. ``invoke_node x`` -> ``("node", "x")``.

    Args:
        name: The OpenTelemetry span name.

    Returns:
        The span kind and the name of the node, agent or tool it covers, or None for spans that
        are not part of ADK's workflow, agent, tool or model-call telemetry, and for the wrapper
        around parallel tool calls, whose calls are reported individually.
    """
    if name == _ADK_MODEL_CALL_SPAN:
        return "llm", name
    if name == _ADK_TOOL_BATCH_SPAN:
        return None
    for prefix, kind in _SPAN_PREFIXES:
        if name.startswith(prefix):
            return kind, name.removeprefix(prefix)
    return None


@dataclass(frozen=True, slots=True)
class TokenUsage:
    """Token counts Gemini reported for one request, or summed over several.

    Attributes:
        prompt: Input tokens, including the cached ones.
        cached: Input tokens served from the context cache (a subset of ``prompt``).
        thinking: Reasoning tokens.
        candidates: Response tokens.
        total: Total billed tokens as reported by the API.
    """

    prompt: int = 0
    cached: int = 0
    thinking: int = 0
    candidates: int = 0
    total: int = 0

    @classmethod
    def from_metadata(cls, usage: _Usage | None) -> Self:
        """Reads token counts from a response's usage metadata; absent fields count as 0."""
        if usage is None:
            return cls()
        return cls(
            prompt=usage.prompt_token_count or 0,
            cached=usage.cached_content_token_count or 0,
            thinking=usage.thoughts_token_count or 0,
            candidates=usage.candidates_token_count or 0,
            total=usage.total_token_count or 0,
        )

    def __add__(self, other: TokenUsage) -> TokenUsage:
        return TokenUsage(
            prompt=self.prompt + other.prompt,
            cached=self.cached + other.cached,
            thinking=self.thinking + other.thinking,
            candidates=self.candidates + other.candidates,
            total=self.total + other.total,
        )


@dataclass(frozen=True, slots=True)
class LlmCall:
    """One Gemini request observed at the google-genai SDK boundary.

    Attributes:
        component: The ADK agent that issued the request or, for out-of-band requests,
            ``<innermost ADK node or agent>/<calling function>`` (e.g.
            ``validate_intake_node/summarize_brief``).
        via_adk: Whether ADK issued the request; False for direct google-genai calls.
        model: The requested model.
        streamed: Whether the request used ``generate_content_stream``.
        start_ns: Wall-clock start (``time.time_ns``), comparable with span timestamps.
        end_ns: Wall-clock time the response, or the stream, finished (``time.time_ns``).
        latency_s: Seconds until the response, or the final stream chunk, arrived.
        ttft_s: Seconds until the first stream chunk arrived; None for unary requests.
        tokens: Token usage reported in the response.
        error: The exception raised by the request, if it failed.
    """

    component: str
    via_adk: bool
    model: str
    streamed: bool
    start_ns: int
    end_ns: int
    latency_s: float
    ttft_s: float | None
    tokens: TokenUsage
    error: str | None = None


@dataclass(frozen=True, slots=True)
class SpanTiming:
    """Timing of one ADK workflow, node, agent, tool or model-call span.

    Attributes:
        kind: What the span covers.
        name: The workflow, node, agent or tool name (``call_llm`` for model calls).
        start_ns: Wall-clock start in nanoseconds since the epoch.
        end_ns: Wall-clock end in nanoseconds since the epoch.
        duration_s: Span duration in seconds.
    """

    kind: SpanKind
    name: str
    start_ns: int
    end_ns: int
    duration_s: float

    @classmethod
    def from_span(cls, span: ReadableSpan) -> Self | None:
        """Builds a timing from a finished span, or None if it is not an ADK span of interest."""
        parsed = parse_span_name(span.name)
        if parsed is None or span.start_time is None or span.end_time is None:
            return None
        kind, name = parsed
        return cls(
            kind=kind,
            name=name,
            start_ns=span.start_time,
            end_ns=span.end_time,
            duration_s=(span.end_time - span.start_time) / 1e9,
        )


class RunCollector:
    """Buffers the requests and spans attributed to one benchmark run until they are drained."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._calls: list[LlmCall] = []
        self._spans: list[SpanTiming] = []

    @contextmanager
    def activate(self) -> Iterator[Self]:
        """Attributes all requests and spans started in this context, and its tasks, to the run.

        Yields:
            This collector.
        """
        token = _ACTIVE_RUN.set(self)
        try:
            yield self
        finally:
            _ACTIVE_RUN.reset(token)

    def add_call(self, call: LlmCall) -> None:
        """Records a finished Gemini request."""
        with self._lock:
            self._calls.append(call)

    def add_span(self, span: SpanTiming) -> None:
        """Records a finished ADK span."""
        with self._lock:
            self._spans.append(span)

    def drain(self) -> tuple[list[LlmCall], list[SpanTiming]]:
        """Returns and clears everything recorded since the previous drain."""
        with self._lock:
            calls, self._calls = self._calls, []
            spans, self._spans = self._spans, []
        return calls, spans


_ACTIVE_RUN: contextvars.ContextVar[RunCollector | None] = contextvars.ContextVar(
    "benchmark_active_run", default=None
)


def _span_id(span: ReadableSpan) -> int | None:
    span_context = span.get_span_context()
    return span_context.span_id if span_context is not None else None


class _SpanRouter(SpanProcessor):
    """Routes finished ADK spans to the run that was active when each span started."""

    def __init__(self) -> None:
        self.enabled = True
        self._open: dict[int, ReadableSpan] = {}
        self._owners: dict[int, RunCollector] = {}

    def on_start(self, span: Span, parent_context: otel_context.Context | None = None) -> None:
        span_id = _span_id(span)
        if not self.enabled or span_id is None:
            return
        self._open[span_id] = span
        if (run := _ACTIVE_RUN.get()) is not None:
            self._owners[span_id] = run

    def on_end(self, span: ReadableSpan) -> None:
        span_id = _span_id(span)
        if span_id is None:
            return
        self._open.pop(span_id, None)
        run = self._owners.pop(span_id, None)
        if run is not None and (timing := SpanTiming.from_span(span)) is not None:
            run.add_span(timing)

    def enclosing_component(self) -> str | None:
        """Names the innermost open ADK node or agent span of the current context, if any."""
        span_id: int | None = trace.get_current_span().get_span_context().span_id
        while span_id is not None and (span := self._open.get(span_id)) is not None:
            parsed = parse_span_name(span.name)
            if parsed is not None and parsed[0] in ("node", "agent"):
                return parsed[1]
            span_id = span.parent.span_id if span.parent is not None else None
        return None


def _adk_agent(config: Any) -> str | None:
    """Returns the ADK agent label of a request config, given as a model or a dict."""
    labels = config.get("labels") if isinstance(config, dict) else getattr(config, "labels", None)
    agent = labels.get(ADK_AGENT_LABEL) if isinstance(labels, dict) else None
    return agent if isinstance(agent, str) else None


def _calling_function() -> str | None:
    """Returns the qualified name of the innermost frame outside SDK, retry and asyncio plumbing."""
    frame = inspect.currentframe()
    try:
        while frame is not None:
            if not str(frame.f_globals.get("__name__", "")).startswith(_PLUMBING_MODULES):
                return frame.f_code.co_qualname
            frame = frame.f_back
        return None
    finally:
        del frame


class _PendingCall:
    """Clock for one in-flight request; ``finish`` turns it into an :class:`LlmCall`."""

    def __init__(
        self,
        *,
        sink: Callable[[LlmCall], None],
        component: str,
        via_adk: bool,
        model: str,
        streamed: bool,
    ) -> None:
        self._sink = sink
        self._component = component
        self._via_adk = via_adk
        self._model = model
        self._streamed = streamed
        self._start_ns = time.time_ns()
        self._started = time.perf_counter()
        self._first_chunk: float | None = None

    def first_chunk(self) -> None:
        """Marks the arrival of a stream chunk; only the first one is kept."""
        if self._first_chunk is None:
            self._first_chunk = time.perf_counter()

    def finish(self, usage: _Usage | None, error: BaseException | None) -> None:
        """Records the request with its final usage metadata and outcome."""
        ttft_s = None if self._first_chunk is None else self._first_chunk - self._started
        self._sink(
            LlmCall(
                component=self._component,
                via_adk=self._via_adk,
                model=self._model,
                streamed=self._streamed,
                start_ns=self._start_ns,
                end_ns=time.time_ns(),
                latency_s=time.perf_counter() - self._started,
                ttft_s=ttft_s,
                tokens=TokenUsage.from_metadata(usage),
                error=None if error is None else f"{type(error).__name__}: {error}",
            )
        )


async def _observe_async_stream(
    stream: AsyncIterator[types.GenerateContentResponse], call: _PendingCall
) -> AsyncIterator[types.GenerateContentResponse]:
    usage: _Usage | None = None
    error: BaseException | None = None
    try:
        async for chunk in stream:
            call.first_chunk()
            if chunk.usage_metadata is not None:
                usage = chunk.usage_metadata
            yield chunk
    except BaseException as exc:
        # GeneratorExit means the consumer stopped reading early, which is not a failure.
        error = None if isinstance(exc, GeneratorExit) else exc
        raise
    finally:
        call.finish(usage, error)
        if isinstance(stream, AsyncGenerator):
            await stream.aclose()


def _observe_sync_stream(
    stream: Iterator[types.GenerateContentResponse], call: _PendingCall
) -> Iterator[types.GenerateContentResponse]:
    usage: _Usage | None = None
    error: BaseException | None = None
    try:
        for chunk in stream:
            call.first_chunk()
            if chunk.usage_metadata is not None:
                usage = chunk.usage_metadata
            yield chunk
    except BaseException as exc:
        error = None if isinstance(exc, GeneratorExit) else exc
        raise
    finally:
        call.finish(usage, error)
        if isinstance(stream, Generator):
            stream.close()


class BenchmarkInstrumentation:
    """Installs the google-genai hooks and the ADK span router for the duration of a ``with``.

    The SDK methods are restored on exit. The span processor cannot be removed from the tracer
    provider, so it is disabled instead.

    Attributes:
        unattributed_calls: Gemini requests observed while no run was active. Anything above
            zero means model traffic escaped attribution and the reported totals are incomplete.
    """

    def __init__(self) -> None:
        self.unattributed_calls = 0
        self._lock = threading.Lock()
        self._router = _SpanRouter()
        self._originals: dict[tuple[type[Any], str], Any] = {}

    def __enter__(self) -> Self:
        provider = trace.get_tracer_provider()
        if not isinstance(provider, TracerProvider):
            provider = TracerProvider()
            trace.set_tracer_provider(provider)
            if trace.get_tracer_provider() is not provider:
                logger.warning("A non-SDK tracer provider is set; ADK spans are not captured.")
        provider.add_span_processor(self._router)
        self._patch(genai_models.AsyncModels, "generate_content", self._wrap_async_unary)
        self._patch(genai_models.AsyncModels, "generate_content_stream", self._wrap_async_stream)
        self._patch(genai_models.Models, "generate_content", self._wrap_sync_unary)
        self._patch(genai_models.Models, "generate_content_stream", self._wrap_sync_stream)
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        for (owner, name), original in self._originals.items():
            setattr(owner, name, original)
        self._originals.clear()
        self._router.enabled = False

    def _patch(
        self,
        owner: type[Any],
        name: str,
        wrap: Callable[[Callable[..., Any]], Callable[..., Any]],
    ) -> None:
        original = getattr(owner, name)
        self._originals[(owner, name)] = original
        setattr(owner, name, wrap(original))

    def _begin(self, kwargs: dict[str, Any], *, streamed: bool) -> _PendingCall:
        agent = _adk_agent(kwargs.get("config"))
        run = _ACTIVE_RUN.get()
        return _PendingCall(
            sink=run.add_call if run is not None else self._count_unattributed,
            component=agent or self._out_of_band_component(),
            via_adk=agent is not None,
            model=str(kwargs.get("model", "")),
            streamed=streamed,
        )

    def _out_of_band_component(self) -> str:
        parts = (self._router.enclosing_component(), _calling_function())
        return "/".join(part for part in parts if part) or "unknown"

    def _count_unattributed(self, call: LlmCall) -> None:
        with self._lock:
            self.unattributed_calls += 1
        logger.warning("Gemini request from %s happened outside any benchmark run.", call.component)

    def _wrap_async_unary(
        self, original: Callable[..., Awaitable[types.GenerateContentResponse]]
    ) -> Callable[..., Awaitable[types.GenerateContentResponse]]:
        @functools.wraps(original)
        async def generate_content(
            models: genai_models.AsyncModels, /, *args: Any, **kwargs: Any
        ) -> types.GenerateContentResponse:
            call = self._begin(kwargs, streamed=False)
            try:
                response = await original(models, *args, **kwargs)
            except BaseException as exc:
                call.finish(None, exc)
                raise
            call.finish(response.usage_metadata, None)
            return response

        return generate_content

    def _wrap_async_stream(
        self, original: Callable[..., Awaitable[AsyncIterator[types.GenerateContentResponse]]]
    ) -> Callable[..., Awaitable[AsyncIterator[types.GenerateContentResponse]]]:
        @functools.wraps(original)
        async def generate_content_stream(
            models: genai_models.AsyncModels, /, *args: Any, **kwargs: Any
        ) -> AsyncIterator[types.GenerateContentResponse]:
            call = self._begin(kwargs, streamed=True)
            try:
                stream = await original(models, *args, **kwargs)
            except BaseException as exc:
                call.finish(None, exc)
                raise
            return _observe_async_stream(stream, call)

        return generate_content_stream

    def _wrap_sync_unary(
        self, original: Callable[..., types.GenerateContentResponse]
    ) -> Callable[..., types.GenerateContentResponse]:
        @functools.wraps(original)
        def generate_content(
            models: genai_models.Models, /, *args: Any, **kwargs: Any
        ) -> types.GenerateContentResponse:
            call = self._begin(kwargs, streamed=False)
            try:
                response = original(models, *args, **kwargs)
            except BaseException as exc:
                call.finish(None, exc)
                raise
            call.finish(response.usage_metadata, None)
            return response

        return generate_content

    def _wrap_sync_stream(
        self, original: Callable[..., Iterator[types.GenerateContentResponse]]
    ) -> Callable[..., Iterator[types.GenerateContentResponse]]:
        @functools.wraps(original)
        def generate_content_stream(
            models: genai_models.Models, /, *args: Any, **kwargs: Any
        ) -> Iterator[types.GenerateContentResponse]:
            call = self._begin(kwargs, streamed=True)
            try:
                stream = original(models, *args, **kwargs)
            except BaseException as exc:
                call.finish(None, exc)
                raise
            return _observe_sync_stream(stream, call)

        return generate_content_stream
