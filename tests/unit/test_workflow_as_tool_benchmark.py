"""Offline end-to-end tests of the workflow-as-tool session benchmark against the real agent.

Gemini is replaced by a scripted fake at the google-genai SDK boundary, below the benchmark's
hooks, so ADK, the coordinator, the pipeline ``NodeTool``, the workflow graph and the
instrumentation all run unmodified without network access.
"""

import json
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import pytest
from google.genai import models as genai_models
from google.genai import types

from benchmarks.instrumentation import (
    ADK_AGENT_LABEL,
    BenchmarkInstrumentation,
    LlmCall,
    RunCollector,
    TokenUsage,
)
from benchmarks.report import render_markdown, summarize
from benchmarks.results import RunResult, TurnResult
from benchmarks.workflow_as_tool_benchmark import (
    DEFAULT_DOC,
    RESULTS_PREFIX,
    SCENARIO,
    WATCHED_NODES,
    SessionBenchmark,
    _attach_leftovers,
    form_submission,
    load_attachment,
    main,
)
from company_health_analyst.agent import app
from company_health_analyst.graph import PIPELINE_TOOL_NAME
from company_health_analyst.schemas import IntakeValidationResponse

COORDINATOR = "company_health_coordinator"
SYNTHESIZER = "report_synthesizer_agent"
TOKENS = {
    COORDINATOR: TokenUsage(prompt=1500, cached=500, thinking=60, candidates=90, total=1650),
    SYNTHESIZER: TokenUsage(prompt=700, cached=0, thinking=500, candidates=1300, total=2500),
}
# Heading of the attached brief; ADK hands text documents to the model as text parts.
BRIEF_MARKER = "company brief: xyz"
STEP_2 = "2 submit company brief (.md)"


class ScriptedGemini:
    """Answers like the coordinator and the synthesizer would, keyed on ADK's agent label.

    Args:
        confirm_first: When True, the coordinator asks for confirmation in chat the first time
            it sees each region instead of calling the pipeline tool, forcing a nudge.
        launch_on_upload: When True, the coordinator launches the pipeline with a guessed region
            as soon as the brief is uploaded, raising a form the benchmark must cancel.
    """

    def __init__(self, *, confirm_first: bool = False, launch_on_upload: bool = False) -> None:
        self._confirm_first = confirm_first
        self._launch_on_upload = launch_on_upload
        self._confirmed: set[str] = set()

    def install(self, monkeypatch: pytest.MonkeyPatch) -> None:
        async def generate_content(_: genai_models.AsyncModels, **kwargs: Any) -> Any:
            return self.respond(kwargs["contents"], kwargs.get("config"))

        async def generate_content_stream(_: genai_models.AsyncModels, **kwargs: Any) -> Any:
            response = self.respond(kwargs["contents"], kwargs.get("config"))

            async def chunks() -> AsyncIterator[types.GenerateContentResponse]:
                yield response

            return chunks()

        monkeypatch.setattr(genai_models.AsyncModels, "generate_content", generate_content)
        monkeypatch.setattr(
            genai_models.AsyncModels, "generate_content_stream", generate_content_stream
        )

    def respond(self, contents: Any, config: Any) -> types.GenerateContentResponse:
        agent = (getattr(config, "labels", None) or {})[ADK_AGENT_LABEL]
        if agent == SYNTHESIZER:
            return _reply(agent, text="# XYZ Company Health Report")
        parts = contents[-1].parts or []
        if any(part.function_response for part in parts):
            return _reply(agent, text="Compared with the 2024 report, margins improved to 26%.")
        text = " ".join(part.text for part in parts if part.text).lower()
        if BRIEF_MARKER in text:
            if self._launch_on_upload:
                return _reply(agent, call=_pipeline_call("Global"))
            return _reply(agent, text="Thanks for the XYZ brief. Which region and time period?")
        region = "Asia" if "asia" in text else "Europe" if "europe" in text else ""
        if region and self._confirm_first and region not in self._confirmed:
            self._confirmed.add(region)
            return _reply(agent, text=f"Shall I run XYZ for {region} 2026?")
        if region:
            return _reply(agent, call=_pipeline_call(region))
        if "compare" in text:
            call = types.FunctionCall(name="search_previous_reports", args={"query": "XYZ"})
            return _reply(agent, call=call)
        if "founded" in text:
            return _reply(agent, text="XYZ was founded in 2011 by John Doe.")
        return _reply(agent, text="I analyze company health. Which company should I look at?")


def _pipeline_call(region: str) -> types.FunctionCall:
    args = {"company_name": "XYZ", "time_span": "2026", "region": region}
    return types.FunctionCall(name=PIPELINE_TOOL_NAME, args=args)


def _reply(
    agent: str, *, text: str = "", call: types.FunctionCall | None = None
) -> types.GenerateContentResponse:
    part = types.Part(function_call=call) if call else types.Part(text=text)
    tokens = TOKENS[agent]
    return types.GenerateContentResponse(
        candidates=[
            types.Candidate(
                content=types.Content(role="model", parts=[part]),
                finish_reason=types.FinishReason.STOP,
            )
        ],
        usage_metadata=types.GenerateContentResponseUsageMetadata(
            prompt_token_count=tokens.prompt,
            cached_content_token_count=tokens.cached,
            thoughts_token_count=tokens.thinking,
            candidates_token_count=tokens.candidates,
            total_token_count=tokens.total,
        ),
    )


async def _benchmark(
    runs: int, gemini: ScriptedGemini, monkeypatch: pytest.MonkeyPatch
) -> tuple[list[RunResult], int]:
    gemini.install(monkeypatch)
    with BenchmarkInstrumentation() as instrumentation:
        benchmark = SessionBenchmark(app, attachment=load_attachment(DEFAULT_DOC))
        results = await benchmark.run(runs=runs)
    return results, instrumentation.unattributed_calls


def _labels(run: RunResult) -> list[str]:
    return [turn.label for turn in run.turns]


async def test_every_request_and_node_is_counted(monkeypatch: pytest.MonkeyPatch) -> None:
    runs, unattributed = await _benchmark(2, ScriptedGemini(), monkeypatch)

    assert unattributed == 0
    for run in runs:
        assert run.ok, run.error
        assert all(run.checks.values()), run.checks
        assert run.final_brief["region"] == "Asia"
        assert _labels(run) == [
            "1 capabilities",
            STEP_2,
            "3 founder question",
            "4 run europe 2026",
            "4 run europe 2026 › HITL approve",
            "5 compare with previous reports",
            "6 change region to asia",
            "6 change region to asia › HITL approve",
        ]
        components = [call.component for call in run.llm_calls]
        # One coordinator request per message, plus one after search_previous_reports returns;
        # none after the approved pipeline, whose report the coordinator does not re-narrate.
        assert components.count(COORDINATOR) == 7
        assert components.count(SYNTHESIZER) == 2
        assert all(call.via_adk for call in run.llm_calls)
        assert run.tokens == sum((TOKENS[c] for c in components), TokenUsage())
        for turn in run.turns:
            assert not turn.spans_outside_window()
            assert not turn.calls_outside_window()
        for label in ("4 run europe 2026 › HITL approve", "6 change region to asia › HITL approve"):
            turn = next(t for t in run.turns if t.label == label)
            spans = {(span.kind, span.name) for span in turn.spans}
            assert {("node", name) for name in WATCHED_NODES} <= spans
            assert {("tool", PIPELINE_TOOL_NAME), ("workflow", PIPELINE_TOOL_NAME)} <= spans
            assert turn.e2e_s >= max(span.duration_s for span in turn.spans)

    summary = summarize(runs, unattributed_requests=unattributed, watched_nodes=WATCHED_NODES)
    acc = summary.accounting
    assert acc.sdk_requests == acc.adk_requests == acc.adk_call_llm_spans == 18
    assert acc.direct_requests == {}
    assert acc.requests_outside_turn_window == 0
    assert acc.spans_outside_turn_window == 0
    assert acc.watched_nodes == {name: 4 for name in WATCHED_NODES}
    assert acc.watched_outside_turn_window == 0
    assert f"`{PIPELINE_TOOL_NAME}`" in render_markdown("t", {}, summary)


async def test_stalled_step_is_nudged_until_the_report_runs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    (run,), _ = await _benchmark(1, ScriptedGemini(confirm_first=True), monkeypatch)

    assert run.ok, run.error
    assert all(run.checks.values()), run.checks
    assert "4 run europe 2026 · nudge 1" in _labels(run)
    assert "4 run europe 2026 · nudge 1 › HITL approve" in _labels(run)
    assert "6 change region to asia · nudge 1 › HITL approve" in _labels(run)
    assert sum(turn.kind == "nudge" for turn in run.turns) == 2


async def test_form_from_an_unrequested_launch_is_cancelled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    (run,), _ = await _benchmark(1, ScriptedGemini(launch_on_upload=True), monkeypatch)

    assert run.ok, run.error
    assert run.checks[f"{STEP_2}: does not launch the analysis"] is False
    cancelled = next(t for t in run.turns if t.label == f"{STEP_2} › HITL cancel")
    assert not {span.name for span in cancelled.spans} & set(WATCHED_NODES)
    assert run.checks["4 run europe 2026: report generated"]
    assert run.checks["6 change region to asia: report generated"]
    assert run.final_brief["region"] == "Asia"


def test_scenario_matches_the_requested_conversation() -> None:
    assert [step.text for step in SCENARIO] == [
        "What can you do?",
        "",
        "When was the company founded and by who?",
        "Ok run for europe 2026",
        "Compare with previous reports",
        "Change parameter to Asia now",
    ]
    assert SCENARIO[1].attach_doc
    assert [bool(step.expected_brief) for step in SCENARIO] == [
        False,
        False,
        False,
        True,
        False,
        True,
    ]


def test_form_submission_mirrors_the_web_ui() -> None:
    (part,) = form_submission(["validate_captured_brief_1"]).parts or []

    response = part.function_response
    assert response is not None
    assert (response.name, response.id) == ("adk_request_input", "validate_captured_brief_1")
    assert response.response == {
        "company_name": None,
        "time_span": None,
        "region": None,
        "summary": None,
        "cancel": False,
    }
    assert set(response.response) == set(IntakeValidationResponse.model_fields)
    cancelled = form_submission(["a", "b"], cancel=True).parts or []
    assert [p.function_response.response for p in cancelled if p.function_response] == [
        {**response.response, "cancel": True}
    ] * 2


def test_load_attachment_reads_markdown_as_inline_data(tmp_path: Path) -> None:
    part = load_attachment(DEFAULT_DOC)
    assert part.inline_data is not None
    assert part.inline_data.mime_type == "text/markdown"
    assert part.inline_data.data == DEFAULT_DOC.read_bytes()

    with pytest.raises(FileNotFoundError):
        load_attachment(tmp_path / "missing.md")
    with pytest.raises(ValueError, match="not a regular file"):
        load_attachment(tmp_path)


@pytest.mark.parametrize("argv", [["--runs", "0"], ["--turn-timeout", "0"], ["--max-nudges", "-1"]])
def test_cli_rejects_invalid_values(argv: list[str]) -> None:
    with pytest.raises(SystemExit):
        main(argv)


def _turn(label: str, *, start_ns: int, end_ns: int) -> TurnResult:
    return TurnResult(
        step_index=0,
        step=label,
        label=label,
        kind="message",
        start_ns=start_ns,
        end_ns=end_ns,
        e2e_s=(end_ns - start_ns) / 1e9,
        ttft_s=None,
        llm_calls=[],
        spans=[],
        tool_calls=[],
        hitl_requests=[],
        reply="",
        errors=[],
    )


def test_work_finishing_after_the_last_turn_is_kept_and_flagged() -> None:
    late = LlmCall(
        component=COORDINATOR,
        via_adk=True,
        model="m",
        streamed=True,
        start_ns=5,
        end_ns=20,
        latency_s=15e-9,
        ttft_s=None,
        tokens=TOKENS[COORDINATOR],
    )
    completed = RunResult(index=1, session_id="s1", warmup=False)
    completed.turns.append(_turn("1", start_ns=0, end_ns=10))
    aborted = RunResult(index=2, session_id="s2", warmup=False, error="TimeoutError: 2: late")
    aborted.turns.append(_turn("1", start_ns=0, end_ns=10))

    for run in (completed, aborted):
        collector = RunCollector()
        collector.add_call(late)
        _attach_leftovers(run, collector, f"run {run.index}")
        assert collector.drain() == ([], [])

    assert completed.turns[-1].calls_outside_window() == [late]
    assert completed.tokens == TOKENS[COORDINATOR]
    assert aborted.llm_calls == []


def test_main_writes_report_and_results(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    ScriptedGemini().install(monkeypatch)

    exit_code = main(["--runs", "1", "--output-dir", str(tmp_path)])

    assert exit_code == 0
    (results,) = tmp_path.glob(f"{RESULTS_PREFIX}_*.json")
    payload = json.loads(results.read_text(encoding="utf-8"))
    assert payload["metadata"]["topology"] == "workflow_as_tool"
    assert payload["summary"]["ok_runs"] == 1
    assert payload["runs"][0]["tokens"]["total"] > 0
    assert results.with_suffix(".md").is_file()
    out = capsys.readouterr().out
    assert "# Session benchmark: company_health_analyst (workflow as tool)" in out
    assert "## Accounting checks" in out
