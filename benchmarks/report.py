"""Aggregates benchmark runs into avg / median / p95 statistics and renders a Markdown report."""

from __future__ import annotations

import math
import statistics
from collections import Counter, defaultdict
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from typing import Self

from benchmarks.instrumentation import LlmCall, SpanTiming, TokenUsage
from benchmarks.results import RunResult, TurnResult

TOKEN_FIELDS = ("prompt", "cached", "thinking", "candidates", "total")


def percentile(values: Sequence[float], pct: float) -> float:
    """Returns the linearly interpolated percentile of ``values`` (NumPy's default method).

    Args:
        values: Non-empty sample.
        pct: Percentile in [0, 100].

    Returns:
        The interpolated percentile.

    Raises:
        ValueError: If ``values`` is empty or ``pct`` is outside [0, 100].
    """
    if not values:
        raise ValueError("percentile of an empty sample is undefined")
    if not 0 <= pct <= 100:
        raise ValueError(f"percentile must be within [0, 100], got {pct}")
    ordered = sorted(values)
    rank = (len(ordered) - 1) * pct / 100
    lower = math.floor(rank)
    upper = min(lower + 1, len(ordered) - 1)
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (rank - lower)


@dataclass(frozen=True, slots=True)
class Stats:
    """Summary statistics of a sample."""

    n: int
    avg: float
    median: float
    p95: float

    @classmethod
    def of(cls, values: Iterable[float]) -> Self | None:
        """Summarizes ``values``; returns None for an empty sample."""
        sample = list(values)
        if not sample:
            return None
        return cls(
            n=len(sample),
            avg=statistics.fmean(sample),
            median=statistics.median(sample),
            p95=percentile(sample, 95),
        )


type TokenStats = dict[str, Stats | None]


def token_stats(usages: Sequence[TokenUsage]) -> TokenStats:
    """Summarizes each token category over several usages."""
    return {name: Stats.of(getattr(usage, name) for usage in usages) for name in TOKEN_FIELDS}


@dataclass(frozen=True, slots=True)
class TurnSummary:
    """Statistics of one turn label across runs; tokens and calls are per turn."""

    label: str
    e2e_s: Stats
    ttft_s: Stats | None
    llm_calls: Stats
    tokens: TokenStats


@dataclass(frozen=True, slots=True)
class ComponentSummary:
    """Statistics of the Gemini requests one component issued; latency and tokens are per call."""

    component: str
    via_adk: bool
    calls: int
    calls_per_run: float
    errors: int
    latency_s: Stats
    ttft_s: Stats | None
    tokens: TokenStats


@dataclass(frozen=True, slots=True)
class SpanSummary:
    """Duration statistics of one workflow, node, agent or tool across all its executions."""

    kind: str
    name: str
    executions: int
    executions_per_run: float
    duration_ms: Stats
    outside_turn_window: int


@dataclass(frozen=True, slots=True)
class Accounting:
    """Cross-checks proving that every request and node is reflected in the reported totals.

    Attributes:
        sdk_requests: Gemini requests observed at the google-genai SDK boundary.
        adk_requests: Requests carrying ADK's agent label.
        adk_call_llm_spans: ADK ``call_llm`` spans; should equal ``adk_requests``.
        direct_requests: Requests that bypassed ADK, by component.
        unattributed_requests: Requests observed outside any run; should be 0.
        requests_outside_turn_window: Requests not contained in their turn's e2e window;
            should be 0.
        spans: ADK workflow, node, agent and tool spans observed.
        spans_outside_turn_window: Spans not contained in their turn's e2e window; should be 0.
        watched_nodes: Executions of the nodes the report highlights, by node.
        watched_outside_turn_window: Highlighted-node spans outside their turn's e2e window.
        watched_share_of_e2e: Summed highlighted-node duration over summed turn latency.
    """

    sdk_requests: int
    adk_requests: int
    adk_call_llm_spans: int
    direct_requests: dict[str, int]
    unattributed_requests: int
    requests_outside_turn_window: int
    spans: int
    spans_outside_turn_window: int
    watched_nodes: dict[str, int]
    watched_outside_turn_window: int
    watched_share_of_e2e: float


@dataclass(frozen=True, slots=True)
class BenchmarkSummary:
    """Everything the report shows, computed over the measured runs that completed."""

    measured_runs: int
    ok_runs: int
    session: dict[str, Stats | None]
    turns: list[TurnSummary]
    components: list[ComponentSummary]
    spans: list[SpanSummary]
    accounting: Accounting
    checks: dict[str, tuple[int, int]]
    runs_with_nudges: int
    failures: dict[int, str]


def summarize(
    runs: Sequence[RunResult],
    *,
    unattributed_requests: int,
    watched_nodes: Sequence[str] = (),
) -> BenchmarkSummary:
    """Aggregates the measured runs; warm-up runs are ignored and failed runs only listed.

    Args:
        runs: All runs of the benchmark.
        unattributed_requests: Gemini requests the instrumentation saw outside any run.
        watched_nodes: Graph nodes whose inclusion in the e2e latency is verified explicitly.

    Returns:
        The aggregated summary.
    """
    measured = [run for run in runs if not run.warmup]
    ok = [run for run in measured if run.ok]
    turns = [turn for run in ok for turn in run.turns]
    calls = [call for turn in turns for call in turn.llm_calls]
    session: dict[str, Stats | None] = {
        "e2e_s": Stats.of(run.e2e_s for run in ok),
        "turns": Stats.of(len(run.turns) for run in ok),
        "llm_calls": Stats.of(len(run.llm_calls) for run in ok),
    }
    session.update(token_stats([run.tokens for run in ok]))
    checks: dict[str, tuple[int, int]] = {}
    for run in ok:
        for name, passed in run.checks.items():
            hits, total = checks.get(name, (0, 0))
            checks[name] = (hits + passed, total + 1)
    return BenchmarkSummary(
        measured_runs=len(measured),
        ok_runs=len(ok),
        session=session,
        turns=_turn_summaries(ok),
        components=_component_summaries(calls, len(ok)),
        spans=_span_summaries(turns, len(ok)),
        accounting=_accounting(turns, unattributed_requests, watched_nodes),
        checks=checks,
        runs_with_nudges=sum(any(turn.kind == "nudge" for turn in run.turns) for run in ok),
        failures={
            run.index: run.error or "; ".join(e for turn in run.turns for e in turn.errors)
            for run in measured
            if not run.ok
        },
    )


def _turn_summaries(runs: Sequence[RunResult]) -> list[TurnSummary]:
    """Groups turns by label, ordered by step, then position within the step, then first seen."""
    by_label: dict[str, list[TurnResult]] = defaultdict(list)
    order: dict[str, tuple[int, int, int]] = {}
    for run in runs:
        positions: Counter[int] = Counter()
        for turn in run.turns:
            key = (turn.step_index, positions[turn.step_index], len(order))
            positions[turn.step_index] += 1
            order[turn.label] = min(order.get(turn.label, key), key)
            by_label[turn.label].append(turn)
    summaries = []
    for label in sorted(by_label, key=order.__getitem__):
        group = by_label[label]
        e2e = Stats.of(turn.e2e_s for turn in group)
        llm_calls = Stats.of(len(turn.llm_calls) for turn in group)
        if e2e is None or llm_calls is None:
            continue
        summaries.append(
            TurnSummary(
                label=label,
                e2e_s=e2e,
                ttft_s=Stats.of(t.ttft_s for t in group if t.ttft_s is not None),
                llm_calls=llm_calls,
                tokens=token_stats([turn.tokens for turn in group]),
            )
        )
    return summaries


def _component_summaries(calls: Sequence[LlmCall], runs: int) -> list[ComponentSummary]:
    by_component: dict[str, list[LlmCall]] = defaultdict(list)
    for call in calls:
        by_component[call.component].append(call)
    summaries = []
    for component, group in by_component.items():
        latency = Stats.of(call.latency_s for call in group)
        if latency is None:
            continue
        summaries.append(
            ComponentSummary(
                component=component,
                via_adk=group[0].via_adk,
                calls=len(group),
                calls_per_run=len(group) / max(runs, 1),
                errors=sum(call.error is not None for call in group),
                latency_s=latency,
                ttft_s=Stats.of(c.ttft_s for c in group if c.ttft_s is not None),
                tokens=token_stats([call.tokens for call in group]),
            )
        )
    return summaries


def _span_summaries(turns: Sequence[TurnResult], runs: int) -> list[SpanSummary]:
    by_span: dict[tuple[str, str], list[SpanTiming]] = defaultdict(list)
    outside: Counter[tuple[str, str]] = Counter()
    for turn in turns:
        escaped = {id(span) for span in turn.spans_outside_window()}
        for span in sorted(turn.spans, key=lambda s: s.start_ns):
            if span.kind == "llm":
                continue
            by_span[(span.kind, span.name)].append(span)
            outside[(span.kind, span.name)] += id(span) in escaped
    summaries = []
    for (kind, name), group in by_span.items():
        duration = Stats.of(span.duration_s * 1e3 for span in group)
        if duration is None:
            continue
        summaries.append(
            SpanSummary(
                kind=kind,
                name=name,
                executions=len(group),
                executions_per_run=len(group) / max(runs, 1),
                duration_ms=duration,
                outside_turn_window=outside[(kind, name)],
            )
        )
    return summaries


def _accounting(
    turns: Sequence[TurnResult], unattributed_requests: int, watched_nodes: Sequence[str]
) -> Accounting:
    calls = [call for turn in turns for call in turn.llm_calls]
    spans = [span for turn in turns for span in turn.spans]
    outside = [span for turn in turns for span in turn.spans_outside_window()]
    watched = [s for s in spans if s.kind == "node" and s.name in watched_nodes]
    watched_outside = [s for s in outside if s.kind == "node" and s.name in watched_nodes]
    total_e2e = sum(turn.e2e_s for turn in turns)
    return Accounting(
        sdk_requests=len(calls),
        adk_requests=sum(call.via_adk for call in calls),
        adk_call_llm_spans=sum(span.kind == "llm" for span in spans),
        direct_requests=dict(Counter(c.component for c in calls if not c.via_adk)),
        unattributed_requests=unattributed_requests,
        requests_outside_turn_window=sum(len(turn.calls_outside_window()) for turn in turns),
        spans=sum(span.kind != "llm" for span in spans),
        spans_outside_turn_window=sum(span.kind != "llm" for span in outside),
        watched_nodes={name: sum(s.name == name for s in watched) for name in watched_nodes},
        watched_outside_turn_window=len(watched_outside),
        watched_share_of_e2e=sum(s.duration_s for s in watched) / total_e2e if total_e2e else 0.0,
    )


# --- Markdown rendering ---------------------------------------------------------------------


def _seconds(value: float) -> str:
    return f"{value:.2f}"


def _millis(value: float) -> str:
    return f"{value:.3f}" if value < 10 else f"{value:,.1f}"


def _count(value: float) -> str:
    return f"{value:,.0f}"


def _avg_count(stats: Stats | None) -> str:
    return "—" if stats is None else _count(stats.avg)


def _table(headers: Sequence[str], rows: Iterable[Sequence[str]], align: str) -> str:
    rule = "|".join(":---" if a == "l" else "---:" for a in align)
    lines = ["| " + " | ".join(map(_cell, headers)) + " |", f"|{rule}|"]
    lines += ["| " + " | ".join(map(_cell, row)) + " |" for row in rows]
    return "\n".join(lines)


def _cell(value: str) -> str:
    """Escapes pipes, which would otherwise split a table cell (e.g. regex alternations)."""
    return value.replace("|", "\\|")


def _mark(ok: bool) -> str:
    return "✅" if ok else "❌"


def render_markdown(title: str, metadata: Mapping[str, str], summary: BenchmarkSummary) -> str:
    """Renders the summary as a Markdown report.

    Args:
        title: Report heading.
        metadata: Configuration rows shown under the heading, label to value.
        summary: The aggregated benchmark.

    Returns:
        The Markdown document.
    """
    sections = [
        f"# {title}",
        _table(("Setting", "Value"), metadata.items(), "ll"),
        "Latency is wall-clock time from submitting a turn until the agent's event stream ends; "
        "a session's latency is the sum of its turns. Tokens are the `usage_metadata` of every "
        "Gemini request, read at the google-genai SDK boundary, so requests that bypass ADK "
        "are included as well. Cached tokens are a subset of prompt tokens. "
        f"Statistics cover the {summary.ok_runs} of {summary.measured_runs} measured runs "
        "that completed.",
        "## Session totals (per run)",
        _session_table(summary),
        "## Per turn (latency in seconds, tokens averaged per turn)",
        _turn_table(summary.turns),
        "TTFT is the time until the first streamed model text; `—` means no text was streamed, "
        "e.g. the turn ended on a HITL form or the request was unary.",
        "## Gemini requests by component (per request)",
        _component_table(summary.components),
        "## Workflow nodes, agents and tools (ADK spans, ms)",
        _span_table(summary.spans),
        "## Accounting checks",
        _accounting_section(summary.accounting),
        "## Scenario conformance",
        _conformance_section(summary),
    ]
    return "\n\n".join(sections) + "\n"


def _session_table(summary: BenchmarkSummary) -> str:
    labels = {
        "e2e_s": "e2e latency (s)",
        "turns": "turns",
        "llm_calls": "Gemini requests",
        "prompt": "prompt tokens",
        "cached": "cached tokens",
        "thinking": "thinking tokens",
        "candidates": "candidate tokens",
        "total": "total tokens",
    }
    rows = []
    for key, label in labels.items():
        stats = summary.session.get(key)
        if stats is None:
            continue
        fmt = _seconds if key == "e2e_s" else _count
        rows.append((label, fmt(stats.avg), fmt(stats.median), fmt(stats.p95)))
    return _table(("Metric", "avg", "median", "p95"), rows, "lrrr")


def _turn_table(turns: Sequence[TurnSummary]) -> str:
    rows = [
        (
            turn.label,
            str(turn.e2e_s.n),
            _seconds(turn.e2e_s.avg),
            _seconds(turn.e2e_s.median),
            _seconds(turn.e2e_s.p95),
            "—" if turn.ttft_s is None else _seconds(turn.ttft_s.avg),
            f"{turn.llm_calls.avg:.1f}",
            *(_avg_count(turn.tokens[name]) for name in TOKEN_FIELDS[:-1]),
        )
        for turn in turns
    ]
    headers = (
        "Turn",
        "n",
        "e2e avg",
        "median",
        "p95",
        "TTFT avg",
        "requests",
        "prompt",
        "cached",
        "thinking",
        "candidates",
    )
    return _table(headers, rows, "lrrrrrrrrrr")


def _component_table(components: Sequence[ComponentSummary]) -> str:
    rows = [
        (
            f"`{c.component}`",
            "ADK agent" if c.via_adk else "direct SDK",
            f"{c.calls_per_run:.1f}",
            _seconds(c.latency_s.avg),
            _seconds(c.latency_s.median),
            _seconds(c.latency_s.p95),
            "—" if c.ttft_s is None else _seconds(c.ttft_s.avg),
            *(_avg_count(c.tokens[name]) for name in TOKEN_FIELDS[:-1]),
            str(c.errors),
        )
        for c in components
    ]
    headers = (
        "Component",
        "via",
        "requests/run",
        "latency avg (s)",
        "median",
        "p95",
        "TTFT avg",
        "prompt",
        "cached",
        "thinking",
        "candidates",
        "errors",
    )
    return _table(headers, rows, "llrrrrrrrrrr")


def _span_table(spans: Sequence[SpanSummary]) -> str:
    rows = [
        (
            s.kind,
            f"`{s.name}`",
            f"{s.executions_per_run:.1f}",
            _millis(s.duration_ms.avg),
            _millis(s.duration_ms.median),
            _millis(s.duration_ms.p95),
            _mark(s.outside_turn_window == 0),
        )
        for s in spans
    ]
    headers = ("Kind", "Name", "per session", "avg", "median", "p95", "inside turn e2e")
    return _table(headers, rows, "llrrrrl")


def _accounting_section(acc: Accounting) -> str:
    direct = ", ".join(f"`{name}` ×{count}" for name, count in acc.direct_requests.items())
    watched = ", ".join(f"`{name}` ×{count}" for name, count in acc.watched_nodes.items())
    lines = [
        f"- Gemini requests captured at the google-genai SDK boundary: **{acc.sdk_requests}** "
        f"({acc.adk_requests} from ADK agents, {acc.sdk_requests - acc.adk_requests} direct).",
        f"- ADK `call_llm` spans: {acc.adk_call_llm_spans} "
        f"{_mark(acc.adk_call_llm_spans == acc.adk_requests)} "
        f"(must equal the {acc.adk_requests} ADK requests).",
        f"- Direct SDK requests, invisible to ADK traces but counted here: {direct or 'none'}.",
        f"- Requests outside any run: {acc.unattributed_requests} "
        f"{_mark(acc.unattributed_requests == 0)}.",
        f"- Gemini requests inside their turn's e2e window: "
        f"{acc.sdk_requests - acc.requests_outside_turn_window}/{acc.sdk_requests} "
        f"{_mark(acc.requests_outside_turn_window == 0)}.",
        f"- ADK spans inside their turn's e2e window: "
        f"{acc.spans - acc.spans_outside_turn_window}/{acc.spans} "
        f"{_mark(acc.spans_outside_turn_window == 0)}.",
    ]
    if acc.watched_nodes:
        verified = acc.watched_outside_turn_window == 0 and all(acc.watched_nodes.values())
        detail = (
            "every execution lies inside its turn's e2e window, so the e2e latency includes "
            f"them; their summed duration is {acc.watched_share_of_e2e:.4%} of total e2e latency."
            if verified
            else f"{acc.watched_outside_turn_window} executions fall outside their turn's e2e "
            "window, or a node never ran."
        )
        lines.append(f"- Deterministic nodes {watched}: {_mark(verified)} {detail}")
    return "\n".join(lines)


def _conformance_section(summary: BenchmarkSummary) -> str:
    rows = [
        (name, f"{hits}/{total}", _mark(hits == total))
        for name, (hits, total) in summary.checks.items()
    ]
    lines = [
        _table(("Check", "passed", ""), rows, "lrl"),
        "",
        f"- Runs that needed a nudge to reach the expected step: "
        f"{summary.runs_with_nudges}/{summary.ok_runs}.",
    ]
    lines += [f"- Run {index} failed: {error}" for index, error in summary.failures.items()]
    return "\n".join(lines)
