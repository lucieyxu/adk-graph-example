"""Result records produced by the session benchmark: one per turn, one per run."""

from __future__ import annotations

import functools
import operator
from dataclasses import dataclass, field
from typing import Any, Literal

from benchmarks.instrumentation import LlmCall, SpanTiming, TokenUsage

type TurnKind = Literal["message", "hitl", "nudge"]


@dataclass(slots=True)
class TurnResult:
    """One user submission and everything the agent did until its event stream ended.

    Attributes:
        step_index: Position of the scenario step the turn belongs to.
        step: Label of that scenario step.
        label: Unique label of the turn within a run, e.g. ``4 ... > HITL approve``.
        kind: ``message`` for scripted text or files, ``hitl`` for a form submission answering
            a ``RequestInput``, ``nudge`` for a follow-up sent because the step stalled.
        start_ns: Wall-clock time the message was submitted, in ns since the epoch.
        end_ns: Wall-clock time the last event was received, in ns since the epoch.
        e2e_s: End-to-end turn latency: submission to the end of the agent's event stream.
        ttft_s: Time until the first model text reached the client, if any text was streamed.
        llm_calls: Every Gemini request issued during the turn.
        spans: Every ADK workflow, node, agent, tool and model-call span of the turn.
        tool_calls: Names of the tools the agents called.
        hitl_requests: Interrupt ids of the human-input forms the turn ended on.
        reply: Final model text shown to the user.
        errors: Error events emitted by the agent.
    """

    step_index: int
    step: str
    label: str
    kind: TurnKind
    start_ns: int
    end_ns: int
    e2e_s: float
    ttft_s: float | None
    llm_calls: list[LlmCall]
    spans: list[SpanTiming]
    tool_calls: list[str]
    hitl_requests: list[str]
    reply: str
    errors: list[str]

    @property
    def tokens(self) -> TokenUsage:
        """Token usage summed over the turn's Gemini requests."""
        return sum_tokens(self.llm_calls)

    def spans_outside_window(self) -> list[SpanTiming]:
        """Spans that started before submission or ended after the last event was received."""
        return [s for s in self.spans if s.start_ns < self.start_ns or s.end_ns > self.end_ns]

    def calls_outside_window(self) -> list[LlmCall]:
        """Gemini requests that started before submission or finished after the last event."""
        return [c for c in self.llm_calls if c.start_ns < self.start_ns or c.end_ns > self.end_ns]


@dataclass(slots=True)
class RunResult:
    """One full replay of the scenario in a fresh session.

    Attributes:
        index: 1-based run number.
        session_id: The ADK session the run used.
        warmup: Whether the run is a warm-up excluded from statistics.
        turns: Turns in submission order.
        checks: Scenario conformance checks, by description.
        final_brief: The ``company_brief`` session state after the last turn.
        error: Why the run aborted, if it did.
    """

    index: int
    session_id: str
    warmup: bool
    turns: list[TurnResult] = field(default_factory=list)
    checks: dict[str, bool] = field(default_factory=dict)
    final_brief: dict[str, Any] = field(default_factory=dict)
    error: str | None = None

    @property
    def ok(self) -> bool:
        """Whether the run completed without aborting or emitting error events."""
        return self.error is None and not any(turn.errors for turn in self.turns)

    @property
    def e2e_s(self) -> float:
        """Session latency: the sum of the turn latencies."""
        return sum(turn.e2e_s for turn in self.turns)

    @property
    def llm_calls(self) -> list[LlmCall]:
        """Every Gemini request of the run."""
        return [call for turn in self.turns for call in turn.llm_calls]

    @property
    def tokens(self) -> TokenUsage:
        """Token usage summed over the run."""
        return sum_tokens(self.llm_calls)


def sum_tokens(calls: list[LlmCall]) -> TokenUsage:
    """Sums the token usage of several Gemini requests."""
    return functools.reduce(operator.add, (call.tokens for call in calls), TokenUsage())
