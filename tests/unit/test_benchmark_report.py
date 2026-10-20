"""Unit tests for the benchmark's statistics, aggregation and accounting checks."""

import pytest

from benchmarks.instrumentation import LlmCall, SpanKind, SpanTiming, TokenUsage
from benchmarks.report import Stats, percentile, render_markdown, summarize
from benchmarks.results import RunResult, TurnKind, TurnResult

SECOND = 1_000_000_000


def _call(component: str, *, via_adk: bool = True, latency_s: float = 1.0) -> LlmCall:
    return LlmCall(
        component=component,
        via_adk=via_adk,
        model="m",
        streamed=via_adk,
        start_ns=0,
        latency_s=latency_s,
        ttft_s=0.2 if via_adk else None,
        tokens=TokenUsage(prompt=1000, cached=400, thinking=50, candidates=100, total=1150),
    )


def _span(kind: SpanKind, name: str, start_s: float, end_s: float) -> SpanTiming:
    return SpanTiming(
        kind=kind,
        name=name,
        start_ns=int(start_s * SECOND),
        end_ns=int(end_s * SECOND),
        duration_s=end_s - start_s,
    )


def _turn(
    label: str,
    *,
    step_index: int,
    e2e_s: float,
    calls: list[LlmCall],
    spans: list[SpanTiming] | None = None,
    kind: TurnKind = "message",
) -> TurnResult:
    return TurnResult(
        step_index=step_index,
        step=label.split(" ·")[0].split(" ›")[0],
        label=label,
        kind=kind,
        start_ns=0,
        end_ns=int(e2e_s * SECOND),
        e2e_s=e2e_s,
        ttft_s=0.5,
        llm_calls=calls,
        spans=spans or [],
        tool_calls=[],
        hitl_requests=[],
        reply="",
        errors=[],
    )


def _run(index: int, e2e_s: float, *, nudge: bool = False, warmup: bool = False) -> RunResult:
    turns = [
        _turn(
            "1 ask",
            step_index=0,
            e2e_s=e2e_s / 2,
            calls=[_call("intake_agent"), _call("router/classify", via_adk=False, latency_s=0.5)],
            spans=[_span("node", "router", 0.1, 0.4), _span("llm", "call_llm", 0.1, 0.3)],
        ),
    ]
    if nudge:
        turns.append(
            _turn("1 ask · nudge 1", step_index=0, e2e_s=1.0, calls=[], kind="nudge"),
        )
    turns.append(
        _turn(
            "1 ask › HITL approve",
            step_index=0,
            e2e_s=e2e_s / 2,
            calls=[_call("report_synthesizer_agent", latency_s=2.0)],
            spans=[
                _span("node", "run_web_search", 0.01, 0.02),
                _span("node", "join_search_results", 0.03, 0.04),
                _span("llm", "call_llm", 0.1, 0.3),
            ],
            kind="hitl",
        )
    )
    return RunResult(
        index=index,
        session_id=f"s{index}",
        warmup=warmup,
        turns=turns,
        checks={"1 ask: report generated": index != 2},
    )


@pytest.mark.parametrize(
    ("values", "pct", "expected"),
    [
        ([float(v) for v in range(1, 11)], 95, 9.55),
        ([float(v) for v in range(1, 11)], 50, 5.5),
        ([3.0, 1.0, 2.0], 100, 3.0),
        ([3.0, 1.0, 2.0], 0, 1.0),
        ([4.2], 95, 4.2),
    ],
)
def test_percentile_interpolates_linearly(values: list[float], pct: float, expected: float) -> None:
    assert percentile(values, pct) == pytest.approx(expected)


def test_percentile_rejects_invalid_input() -> None:
    with pytest.raises(ValueError):
        percentile([], 95)
    with pytest.raises(ValueError):
        percentile([1.0], 101)


def test_stats_of_sample_and_empty_sample() -> None:
    assert Stats.of([1.0, 2.0, 3.0, 10.0]) == Stats(
        n=4, avg=4.0, median=2.5, p95=pytest.approx(8.95)
    )
    assert Stats.of([]) is None


def test_summarize_excludes_warmup_and_failed_runs() -> None:
    failed = _run(3, 10.0)
    failed.error = "TimeoutError: 4 run: no answer within 300 s"
    runs = [_run(0, 99.0, warmup=True), _run(1, 10.0), _run(2, 20.0, nudge=True), failed]

    summary = summarize(runs, unattributed_requests=0, watched_nodes=("run_web_search",))

    assert summary.measured_runs == 3
    assert summary.ok_runs == 2
    assert summary.failures == {3: "TimeoutError: 4 run: no answer within 300 s"}
    e2e = summary.session["e2e_s"]
    assert e2e is not None and (e2e.avg, e2e.median) == (15.5, 15.5)
    calls = summary.session["llm_calls"]
    assert calls is not None and calls.avg == 3
    prompt = summary.session["prompt"]
    assert prompt is not None and prompt.avg == 3000
    assert summary.runs_with_nudges == 1
    assert summary.checks == {"1 ask: report generated": (1, 2)}


def test_turns_are_ordered_by_step_then_position() -> None:
    summary = summarize([_run(1, 10.0, nudge=True), _run(2, 10.0)], unattributed_requests=0)

    assert [t.label for t in summary.turns] == ["1 ask", "1 ask · nudge 1", "1 ask › HITL approve"]
    assert summary.turns[0].e2e_s.n == 2
    assert summary.turns[1].e2e_s.n == 1


def test_components_split_adk_and_direct_requests() -> None:
    summary = summarize([_run(1, 10.0), _run(2, 20.0)], unattributed_requests=0)

    components = {c.component: c for c in summary.components}
    assert components["router/classify"].via_adk is False
    assert components["router/classify"].calls_per_run == 1
    assert components["router/classify"].ttft_s is None
    assert components["report_synthesizer_agent"].latency_s.avg == 2.0


def test_accounting_reconciles_requests_and_spans() -> None:
    summary = summarize(
        [_run(1, 10.0), _run(2, 20.0)],
        unattributed_requests=0,
        watched_nodes=("run_web_search", "join_search_results"),
    )

    acc = summary.accounting
    assert acc.sdk_requests == 6
    assert acc.adk_requests == 4
    assert acc.adk_call_llm_spans == 4
    assert acc.direct_requests == {"router/classify": 2}
    assert acc.spans == 6
    assert acc.spans_outside_turn_window == 0
    assert acc.watched_nodes == {"run_web_search": 2, "join_search_results": 2}
    assert acc.watched_share_of_e2e == pytest.approx(0.04 / 30)


def test_span_escaping_its_turn_window_is_flagged() -> None:
    run = _run(1, 10.0)
    run.turns[-1].spans.append(_span("node", "run_internal_search", 4.0, 6.0))

    summary = summarize([run], unattributed_requests=0, watched_nodes=("run_internal_search",))

    assert summary.accounting.spans_outside_turn_window == 1
    assert summary.accounting.watched_outside_turn_window == 1
    span = next(s for s in summary.spans if s.name == "run_internal_search")
    assert span.outside_turn_window == 1


def test_render_markdown_has_every_section() -> None:
    summary = summarize(
        [_run(1, 10.0), _run(2, 20.0)], unattributed_requests=0, watched_nodes=("run_web_search",)
    )

    report = render_markdown("Benchmark", {"Model": "`m`"}, summary)

    for heading in (
        "# Benchmark",
        "## Session totals (per run)",
        "## Per turn",
        "## Gemini requests by component",
        "## Workflow nodes, agents and tools",
        "## Accounting checks",
        "## Scenario conformance",
    ):
        assert heading in report
    assert "| e2e latency (s) | 15.00 | 15.00 | 19.50 |" in report
    assert "`router/classify` ×2" in report
    assert "| 1 ask: report generated | 1/2 | ❌ |" in report
