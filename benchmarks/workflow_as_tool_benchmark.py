"""Multi-turn latency and token benchmark for the workflow-as-tool company_health_analyst.

Topology under test: the root agent is the ``company_health_coordinator`` LlmAgent, and the
analysis pipeline (validation gate, parallel web and internal search, join, synthesis,
persistence) is a ``Workflow`` it calls through ``NodeTool`` as ``run_company_health_analysis``.

Replays a scripted conversation against the real agent (live Gemini on Vertex AI through
Application Default Credentials) in a fresh in-memory session per run, then reports:

* end-to-end latency (avg / median / p95) per session, per turn, per Gemini request and per
  workflow node, agent and tool;
* token usage (prompt, cached, thinking, candidates) per session, per turn and per component.

Every Gemini request is counted at the google-genai SDK boundary and reconciled with ADK's
``call_llm`` spans. The pipeline's deterministic ``run_web_search``, ``run_internal_search`` and
``join_search_results`` nodes run inside the tool call; their ``invoke_node`` spans are captured
from the tracer provider and verified to fall inside the measured turn latency. See
:mod:`benchmarks.instrumentation` for how.

Human-in-the-loop forms (``RequestInput``) are answered as their own turns with the payload the
ADK Web UI posts on Submit: approved when the step is meant to launch an analysis, cancelled
otherwise, as a user would decline an analysis they did not ask for. If a step that should
launch the analysis stalls, for example because the coordinator asks for confirmation instead
of calling the pipeline tool, a step-specific nudge is sent and reported.

Usage:
    uv run python -m benchmarks.workflow_as_tool_benchmark --runs 10
"""

from __future__ import annotations

import argparse
import asyncio
import importlib.metadata
import json
import logging
import mimetypes
import platform
import re
import time
from collections.abc import Sequence
from contextlib import aclosing
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.apps import App
from google.adk.events import Event
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from benchmarks.instrumentation import BenchmarkInstrumentation, RunCollector
from benchmarks.report import render_markdown, summarize
from benchmarks.results import RunResult, TurnKind, TurnResult
from company_health_analyst.agent import app as agent_app
from company_health_analyst.app_utils.config import (
    AGENT_MODEL,
    GCP_LOCATION,
    GCP_PROJECT_ID,
    THINKING_LEVEL,
)
from company_health_analyst.graph import PIPELINE_TOOL_NAME, root_agent
from company_health_analyst.schemas import IntakeValidationResponse

# Named explicitly: under `python -m`, __name__ is "__main__", which the "benchmarks" log level
# configured in main() would not reach, silencing the per-turn progress logs.
logger = logging.getLogger("benchmarks.workflow_as_tool_benchmark")

USER_ID = "benchmark-user"
# Function-call name ADK uses for RequestInput interrupts (REQUEST_INPUT_FUNCTION_CALL_NAME).
REQUEST_INPUT_FUNCTION = "adk_request_input"
# Graph node that persists a synthesized report; its execution marks a (re)generated report.
REPORT_NODE = "save_report_to_db"
# Deterministic graph nodes whose inclusion in the e2e latency is verified explicitly.
WATCHED_NODES = ("run_web_search", "run_internal_search", "join_search_results")
DEFAULT_DOC = Path("docs/Company Brief_ XYZ.md")
DEFAULT_OUTPUT_DIR = Path("benchmarks/results")
RESULTS_PREFIX = "workflow_as_tool_benchmark"
MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
# Upper bound on consecutive RequestInput forms answered for one submission.
MAX_HITL_ROUNDS = 3


@dataclass(frozen=True, slots=True)
class Step:
    """One scripted user submission and what it should achieve.

    Attributes:
        label: Short, numbered description used to group turns across runs.
        text: Message text; empty when the step only attaches the document.
        attach_doc: Whether to attach the company brief, as a playground file upload does.
        expected_brief: ``company_brief`` fields (case-insensitive substrings) the step must
            launch a report with. Steps with expectations get their HITL forms approved and are
            nudged when they stall; steps without must not launch the analysis at all.
        nudge: Follow-up message sent when the step did not produce the expected report.
        reply_mentions: Case-insensitive regular expressions the agent's reply must all match.
        expected_tool: Tool the coordinator should call during the step.
    """

    label: str
    text: str = ""
    attach_doc: bool = False
    expected_brief: dict[str, str] = field(default_factory=dict)
    nudge: str = ""
    reply_mentions: tuple[str, ...] = ()
    expected_tool: str = ""


SCENARIO: tuple[Step, ...] = (
    Step("1 capabilities", text="What can you do?"),
    Step(
        "2 submit company brief (.md)",
        attach_doc=True,
        reply_mentions=(r"region", r"year|time|period"),
    ),
    Step(
        "3 founder question",
        text="When was the company founded and by who?",
        reply_mentions=(r"2011", r"John Doe"),
    ),
    Step(
        "4 run europe 2026",
        text="Ok run for europe 2026",
        expected_brief={"region": "europe", "time_span": "2026"},
        nudge="Yes, please run the analysis for XYZ in Europe for 2026.",
    ),
    Step(
        "5 compare with previous reports",
        text="Compare with previous reports",
        expected_tool="search_previous_reports",
    ),
    Step(
        "6 change region to asia",
        text="Change parameter to Asia now",
        expected_brief={"region": "asia", "time_span": "2026"},
        nudge="Please regenerate the report for XYZ for 2026 with the region changed to Asia.",
    ),
)


def load_attachment(path: Path) -> types.Part:
    """Reads a local document into an inline-data part, as the playground's file upload does.

    Args:
        path: The document to attach.

    Returns:
        An inline-data part with the file's guessed MIME type.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the path is not a regular file or exceeds MAX_ATTACHMENT_BYTES.
    """
    resolved = path.resolve(strict=True)
    if not resolved.is_file():
        raise ValueError(f"Attachment {resolved} is not a regular file.")
    if (size := resolved.stat().st_size) > MAX_ATTACHMENT_BYTES:
        raise ValueError(f"Attachment {resolved} is {size} bytes; limit is {MAX_ATTACHMENT_BYTES}.")
    mime_type = mimetypes.guess_type(resolved.name)[0] or "text/plain"
    return types.Part.from_bytes(data=resolved.read_bytes(), mime_type=mime_type)


def form_submission(interrupt_ids: Sequence[str], *, cancel: bool = False) -> types.Content:
    """Builds the user turn the ADK Web UI posts when Submit is pressed on validation forms.

    The UI sends every field of the form's schema: text fields left blank arrive as null (keep
    the captured parameter) and checkboxes left unticked arrive as False. Mirroring that, rather
    than hand-writing a payload that merely means approval, exercises the same merge logic in
    ``validate_intake_node`` that a real submission does.

    Args:
        interrupt_ids: Interrupt ids of the pending ``RequestInput`` forms.
        cancel: Whether to tick ``cancel``, declining the analysis.

    Returns:
        A user message answering every form.
    """
    response: dict[str, Any] = {
        name: False if info.annotation is bool else None
        for name, info in IntakeValidationResponse.model_fields.items()
    }
    response["cancel"] = cancel
    return types.Content(
        role="user",
        parts=[
            types.Part(
                function_response=types.FunctionResponse(
                    name=REQUEST_INPUT_FUNCTION, id=interrupt_id, response=response
                )
            )
            for interrupt_id in interrupt_ids
        ],
    )


def _user_text(text: str) -> types.Content:
    return types.Content(role="user", parts=[types.Part.from_text(text=text)])


def _model_text(event: Event) -> str:
    """Returns the non-thought model text carried by an event."""
    if event.author == "user" or event.content is None or not event.content.parts:
        return ""
    return "".join(part.text for part in event.content.parts if part.text and not part.thought)


class SessionBenchmark:
    """Replays the scenario against an ADK app and records every turn of every run."""

    def __init__(
        self,
        app: App,
        *,
        attachment: types.Part,
        scenario: Sequence[Step] = SCENARIO,
        streaming: StreamingMode = StreamingMode.SSE,
        max_nudges: int = 2,
        turn_timeout_s: float = 300.0,
    ) -> None:
        """Initializes the benchmark.

        Args:
            app: The ADK app under test.
            attachment: The document attached by steps with ``attach_doc``.
            scenario: The scripted steps replayed in every run.
            streaming: ADK streaming mode used for every turn.
            max_nudges: Follow-ups allowed when a step does not launch the expected report.
            turn_timeout_s: Seconds before a turn is abandoned and its run fails.
        """
        self._app_name = app.name
        self._sessions = InMemorySessionService()
        self._runner = Runner(app=app, session_service=self._sessions)
        self._attachment = attachment
        self._scenario = tuple(scenario)
        self._run_config = RunConfig(streaming_mode=streaming)
        self._max_nudges = max_nudges
        self._turn_timeout_s = turn_timeout_s

    async def run(self, *, runs: int, warmup: int = 0, concurrency: int = 1) -> list[RunResult]:
        """Executes warm-up runs sequentially, then measured runs with bounded concurrency.

        Args:
            runs: Measured runs.
            warmup: Runs executed first and excluded from statistics.
            concurrency: Measured runs in flight at once. Values above 1 shorten the benchmark
                but let runs compete for quota, which inflates latency.

        Returns:
            Warm-up runs followed by measured runs, in index order.
        """
        results = [await self.run_session(i, warmup=True) for i in range(1, warmup + 1)]
        semaphore = asyncio.Semaphore(concurrency)

        async def bounded(index: int) -> RunResult:
            async with semaphore:
                return await self.run_session(index, warmup=False)

        results += await asyncio.gather(*(bounded(i) for i in range(1, runs + 1)))
        return results

    async def run_session(self, index: int, *, warmup: bool = False) -> RunResult:
        """Replays the whole scenario in a new session.

        A failed run is reported rather than retried: retrying would hide the failure and skew
        latency.

        Args:
            index: 1-based run number used in logs and results.
            warmup: Whether the run is excluded from statistics.

        Returns:
            The run's turns, conformance checks and final brief.
        """
        session = await self._sessions.create_session(app_name=self._app_name, user_id=USER_ID)
        run = RunResult(index=index, session_id=session.id, warmup=warmup)
        tag = f"{'warm-up' if warmup else 'run'} {index}"
        collector = RunCollector()
        with collector.activate():
            try:
                for step_index, step in enumerate(self._scenario):
                    await self._run_step(run, collector, step_index, step, tag)
            except Exception as exc:
                run.error = f"{type(exc).__name__}: {exc}"
                logger.exception("%s aborted (session %s).", tag, session.id)
        _attach_leftovers(run, collector, tag)
        run.final_brief = await self._brief(session.id)
        tokens = run.tokens
        logger.info(
            "%s finished in %.1f s: %d turns, %d Gemini requests, %s tokens, checks %d/%d.",
            tag,
            run.e2e_s,
            len(run.turns),
            len(run.llm_calls),
            f"{tokens.total:,}",
            sum(run.checks.values()),
            len(run.checks),
        )
        return run

    async def _run_step(
        self, run: RunResult, collector: RunCollector, step_index: int, step: Step, tag: str
    ) -> None:
        parts = [self._attachment] if step.attach_doc else []
        if step.text:
            parts.append(types.Part.from_text(text=step.text))
        exchange = _Exchange(run, collector, step_index, step, tag)
        await self._submit(exchange, step.label, "message", types.Content(role="user", parts=parts))
        nudges = 0
        while (
            step.expected_brief
            and step.nudge
            and not exchange.report_generated
            and nudges < self._max_nudges
        ):
            nudges += 1
            label = f"{step.label} · nudge {nudges}"
            await self._submit(exchange, label, "nudge", _user_text(step.nudge))
        await self._check(run, step, exchange.turns)

    async def _submit(
        self, exchange: _Exchange, label: str, kind: TurnKind, message: types.Content
    ) -> None:
        """Sends one user message, then answers every human-input form it ends on.

        Forms are approved when the step is meant to launch an analysis and cancelled otherwise.
        """
        turn = await self._turn(exchange, label, kind, message)
        cancel = not exchange.step.expected_brief
        action = "cancel" if cancel else "approve"
        for round_number in range(1, MAX_HITL_ROUNDS + 1):
            if not turn.hitl_requests:
                return
            suffix = "" if round_number == 1 else f" {round_number}"
            turn = await self._turn(
                exchange,
                f"{label} › HITL {action}{suffix}",
                "hitl",
                form_submission(turn.hitl_requests, cancel=cancel),
            )
        if turn.hitl_requests:
            raise RuntimeError(f"{label}: still awaiting input after {MAX_HITL_ROUNDS} forms.")

    async def _turn(
        self, exchange: _Exchange, label: str, kind: TurnKind, message: types.Content
    ) -> TurnResult:
        events: list[Event] = []
        ttft_s: float | None = None
        start_ns = time.time_ns()
        started = time.perf_counter()
        stream = self._runner.run_async(
            user_id=USER_ID,
            session_id=exchange.run.session_id,
            new_message=message,
            run_config=self._run_config,
        )
        try:
            async with asyncio.timeout(self._turn_timeout_s), aclosing(stream) as agent_events:
                async for event in agent_events:
                    if ttft_s is None and _model_text(event):
                        ttft_s = time.perf_counter() - started
                    events.append(event)
        except TimeoutError as exc:
            raise TimeoutError(f"{label}: no answer within {self._turn_timeout_s:.0f} s") from exc
        e2e_s = time.perf_counter() - started
        end_ns = time.time_ns()
        calls, spans = exchange.collector.drain()
        final = [event for event in events if not event.partial]
        function_calls = [call for event in final for call in event.get_function_calls()]
        turn = TurnResult(
            step_index=exchange.step_index,
            step=exchange.step.label,
            label=label,
            kind=kind,
            start_ns=start_ns,
            end_ns=end_ns,
            e2e_s=e2e_s,
            ttft_s=ttft_s,
            llm_calls=calls,
            spans=spans,
            tool_calls=[c.name or "" for c in function_calls if c.name != REQUEST_INPUT_FUNCTION],
            # ADK emits each RequestInput as a function call whose id is the interrupt id.
            hitl_requests=[
                c.id or "" for c in function_calls if c.name == REQUEST_INPUT_FUNCTION and c.id
            ],
            reply="\n".join(text for event in final if (text := _model_text(event))),
            errors=[f"{e.error_code}: {e.error_message}" for e in events if e.error_code],
        )
        exchange.add(turn)
        logger.info(
            "%s | %-48s | %6.2f s | %d Gemini requests | %s tokens",
            exchange.tag,
            label,
            e2e_s,
            len(calls),
            f"{turn.tokens.total:,}",
        )
        return turn

    async def _check(self, run: RunResult, step: Step, turns: Sequence[TurnResult]) -> None:
        """Records whether the step behaved as scripted; deviations skew per-turn comparisons."""
        tool_calls = {name for turn in turns for name in turn.tool_calls}
        if step.expected_brief:
            generated = any(_ran_report_node(turn) for turn in turns)
            brief = await self._brief(run.session_id)
            run.checks[f"{step.label}: report generated"] = generated
            run.checks[f"{step.label}: brief matches {step.expected_brief}"] = generated and all(
                value.lower() in str(brief.get(key, "")).lower()
                for key, value in step.expected_brief.items()
            )
        else:
            run.checks[f"{step.label}: does not launch the analysis"] = (
                PIPELINE_TOOL_NAME not in tool_calls
            )
        if step.reply_mentions:
            reply = "\n".join(turn.reply for turn in turns)
            run.checks[f"{step.label}: reply mentions {' and '.join(step.reply_mentions)}"] = all(
                re.search(pattern, reply, flags=re.IGNORECASE) for pattern in step.reply_mentions
            )
        if step.expected_tool:
            run.checks[f"{step.label}: calls {step.expected_tool}"] = (
                step.expected_tool in tool_calls
            )

    async def _brief(self, session_id: str) -> dict[str, Any]:
        session = await self._sessions.get_session(
            app_name=self._app_name, user_id=USER_ID, session_id=session_id
        )
        brief = session.state.get("company_brief") if session else None
        return dict(brief) if isinstance(brief, dict) else {}


def _ran_report_node(turn: TurnResult) -> bool:
    return any(span.kind == "node" and span.name == REPORT_NODE for span in turn.spans)


def _attach_leftovers(run: RunResult, collector: RunCollector, tag: str) -> None:
    """Attributes requests and spans that finished after the last turn was drained to that turn.

    Nothing should be left: work that outlives its turn is missing from the measured latency.
    Attaching it to the last turn keeps its tokens in the totals and makes the accounting checks
    flag it as outside the turn's e2e window, instead of silently dropping it. An aborted run's
    leftovers belong to the turn that never completed, and the run is excluded from statistics.

    Args:
        run: The finished run.
        collector: The run's collector, drained after every turn.
        tag: Run label used in logs.
    """
    calls, spans = collector.drain()
    if run.error is not None or not run.turns or not (calls or spans):
        return
    logger.warning(
        "%s: %d Gemini requests and %d spans finished after the last turn.",
        tag,
        len(calls),
        len(spans),
    )
    run.turns[-1].llm_calls.extend(calls)
    run.turns[-1].spans.extend(spans)


@dataclass(slots=True)
class _Exchange:
    """Turns submitted for one scenario step, including HITL answers and nudges."""

    run: RunResult
    collector: RunCollector
    step_index: int
    step: Step
    tag: str
    turns: list[TurnResult] = field(default_factory=list)

    @property
    def report_generated(self) -> bool:
        return any(_ran_report_node(turn) for turn in self.turns)

    def add(self, turn: TurnResult) -> None:
        self.turns.append(turn)
        self.run.turns.append(turn)


# --- CLI --------------------------------------------------------------------------------------


def _positive_int(value: str) -> int:
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError(f"expected a positive integer, got {value}")
    return number


def _non_negative_int(value: str) -> int:
    number = int(value)
    if number < 0:
        raise argparse.ArgumentTypeError(f"expected a non-negative integer, got {value}")
    return number


def _positive_float(value: str) -> float:
    number = float(value)
    if not number > 0:
        raise argparse.ArgumentTypeError(f"expected a positive number, got {value}")
    return number


def _parse_args(argv: Sequence[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="python -m benchmarks.workflow_as_tool_benchmark",
        description=(
            "Measure latency and token usage of the workflow-as-tool company_health_analyst."
        ),
    )
    parser.add_argument("--runs", type=_positive_int, default=10, help="measured runs (10)")
    parser.add_argument(
        "--warmup", type=_non_negative_int, default=0, help="unmeasured runs executed first (0)"
    )
    parser.add_argument(
        "--concurrency",
        type=_positive_int,
        default=1,
        help="measured runs in flight at once (1); higher values add quota contention",
    )
    parser.add_argument("--doc", type=Path, default=DEFAULT_DOC, help=f"brief ({DEFAULT_DOC})")
    parser.add_argument(
        "--streaming", choices=("sse", "none"), default="sse", help="ADK streaming mode (sse)"
    )
    parser.add_argument(
        "--max-nudges",
        type=_non_negative_int,
        default=2,
        help="follow-ups allowed when a step does not launch the expected report (2)",
    )
    parser.add_argument(
        "--turn-timeout",
        type=_positive_float,
        default=300.0,
        help="seconds before a turn fails (300)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"where the JSON results and Markdown report go ({DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument(
        "--log-level",
        choices=("DEBUG", "INFO", "WARNING", "ERROR"),
        default="INFO",
        help="benchmark log level (INFO)",
    )
    return parser.parse_args(argv)


async def _benchmark(
    args: argparse.Namespace, attachment: types.Part
) -> tuple[list[RunResult], int]:
    """Runs the benchmark under instrumentation.

    Returns:
        All runs, and the number of Gemini requests observed outside any run.
    """
    with BenchmarkInstrumentation() as instrumentation:
        benchmark = SessionBenchmark(
            agent_app,
            attachment=attachment,
            streaming=StreamingMode.SSE if args.streaming == "sse" else StreamingMode.NONE,
            max_nudges=args.max_nudges,
            turn_timeout_s=args.turn_timeout,
        )
        runs = await benchmark.run(runs=args.runs, warmup=args.warmup, concurrency=args.concurrency)
        return runs, instrumentation.unattributed_calls


def main(argv: Sequence[str] | None = None) -> int:
    """Runs the benchmark, prints the Markdown report and writes JSON and Markdown results.

    Args:
        argv: Command-line arguments; defaults to ``sys.argv[1:]``.

    Returns:
        0 when every measured run completed, 1 otherwise.
    """
    args = _parse_args(argv)
    logging.basicConfig(level=logging.WARNING, format="%(asctime)s %(levelname)s %(message)s")
    logging.getLogger("benchmarks").setLevel(args.log_level)

    attachment = load_attachment(args.doc)
    started = datetime.now(UTC)
    runs, unattributed = asyncio.run(_benchmark(args, attachment))
    finished = datetime.now(UTC)

    summary = summarize(runs, unattributed_requests=unattributed, watched_nodes=WATCHED_NODES)
    metadata: dict[str, Any] = {
        "agent": "company_health_analyst",
        "topology": "workflow_as_tool",
        "root_agent": root_agent.name,
        "pipeline_tool": PIPELINE_TOOL_NAME,
        "model": AGENT_MODEL,
        "thinking_level": THINKING_LEVEL.value,
        "streaming": args.streaming,
        "runs": args.runs,
        "warmup": args.warmup,
        "concurrency": args.concurrency,
        "max_nudges": args.max_nudges,
        "doc": str(args.doc),
        "project": GCP_PROJECT_ID,
        "location": GCP_LOCATION,
        "started_at": started.isoformat(),
        "finished_at": finished.isoformat(),
        "google_adk": importlib.metadata.version("google-adk"),
        "google_genai": importlib.metadata.version("google-genai"),
        "python": platform.python_version(),
    }
    report = render_markdown(
        "Session benchmark: company_health_analyst (workflow as tool)",
        {
            "Topology": f"`{root_agent.name}` LlmAgent calling the pipeline `Workflow` "
            f"through `NodeTool` as `{PIPELINE_TOOL_NAME}`",
            "Model": f"`{AGENT_MODEL}`, shared thinking level `{THINKING_LEVEL.value}`",
            "Runs": f"{summary.measured_runs} measured ({summary.ok_runs} completed), "
            f"{args.warmup} warm-up, concurrency {args.concurrency}",
            "Scenario": f"{len(SCENARIO)} scripted steps, HITL forms submitted as the ADK Web UI "
            "does (approved when the step should launch an analysis, cancelled otherwise), "
            f"up to {args.max_nudges} nudges per stalled step, streaming `{args.streaming}`",
            "Project / location": f"`{GCP_PROJECT_ID}` / `{GCP_LOCATION}`",
            "Started (UTC)": started.strftime("%Y-%m-%d %H:%M:%S"),
            "Versions": f"google-adk {metadata['google_adk']}, "
            f"google-genai {metadata['google_genai']}, Python {metadata['python']}",
        },
        summary,
    )

    args.output_dir.mkdir(parents=True, exist_ok=True)
    stem = args.output_dir / f"{RESULTS_PREFIX}_{started.strftime('%Y%m%dT%H%M%SZ')}"
    payload = {
        "metadata": metadata,
        "summary": asdict(summary),
        "runs": [
            {**asdict(run), "ok": run.ok, "e2e_s": run.e2e_s, "tokens": asdict(run.tokens)}
            for run in runs
        ],
    }
    stem.with_suffix(".json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    stem.with_suffix(".md").write_text(report, encoding="utf-8")
    print(report)
    logger.info("Results written to %s.json and %s.md", stem, stem)
    return 0 if summary.ok_runs == summary.measured_runs else 1


if __name__ == "__main__":
    raise SystemExit(main())
