"""Offline end-to-end tests of the session benchmark against the real workflow.

Gemini is replaced by a scripted fake at the google-genai SDK boundary, below the benchmark's
hooks, so ADK, the workflow graph, the intent classifier and the instrumentation all run
unmodified without network access.
"""

import json
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import pytest
from google.genai import models as genai_models
from google.genai import types

from benchmarks.instrumentation import ADK_AGENT_LABEL, BenchmarkInstrumentation, TokenUsage
from benchmarks.report import render_markdown, summarize
from benchmarks.results import RunResult
from benchmarks.session_benchmark import (
    DEFAULT_DOC,
    SCENARIO,
    WATCHED_NODES,
    SessionBenchmark,
    load_attachment,
    main,
)
from company_health_analyst.agent import app

CLASSIFIER = "route_user_request/classify_intent_async"
TOKENS = {
    "intake_agent": TokenUsage(prompt=900, cached=300, thinking=40, candidates=60, total=1000),
    "explanation_agent": TokenUsage(
        prompt=2000, cached=0, thinking=150, candidates=350, total=2500
    ),
    "report_synthesizer_agent": TokenUsage(
        prompt=700, cached=0, thinking=500, candidates=1300, total=2500
    ),
    "classifier": TokenUsage(prompt=400, cached=0, thinking=20, candidates=30, total=450),
}


class ScriptedGemini:
    """Answers like the agent's models would, keyed on ADK's agent label and the user text.

    Args:
        confirm_first: When True, the intake agent asks for confirmation the first time it sees
            each region instead of finishing intake, which forces the benchmark to nudge.
    """

    def __init__(self, *, confirm_first: bool = False) -> None:
        self._confirm_first = confirm_first
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
        labels = getattr(config, "labels", None) or {}
        agent = labels.get(ADK_AGENT_LABEL, "classifier")
        text = _last_user_text(contents).lower()
        answered_tool = _ends_with_function_response(contents)
        if agent == "classifier":
            intent = "modify" if "asia" in text else "ask_explanation"
            return _reply(agent, text=json.dumps({"intent": intent, "explanation": "scripted"}))
        if agent == "intake_agent":
            region = "Asia" if "asia" in text else "Europe" if "europe" in text else ""
            if region and (not self._confirm_first or region in self._confirmed):
                args = {"company_name": "XYZ", "time_span": "2026", "region": region}
                return _reply(agent, call=types.FunctionCall(name="finish_task", args=args))
            if region:
                self._confirmed.add(region)
                return _reply(agent, text=f"Shall I run XYZ for {region} 2026?")
            if "founded" in text:
                return _reply(agent, text="XYZ was founded in 2011 by John Doe.")
            return _reply(agent, text="I analyze company health. Which region and year?")
        if agent == "explanation_agent" and not answered_tool:
            call = types.FunctionCall(name="search_previous_reports", args={"query": "XYZ"})
            return _reply(agent, call=call)
        return _reply(agent, text=f"{agent} answer")


def _last_user_text(contents: Any) -> str:
    if isinstance(contents, str):
        return contents
    for content in reversed(contents):
        texts = [part.text for part in content.parts or [] if part.text]
        if content.role == "user" and texts:
            return " ".join(texts)
    return ""


def _ends_with_function_response(contents: Any) -> bool:
    if isinstance(contents, str) or not contents:
        return False
    return any(part.function_response for part in contents[-1].parts or [])


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


async def _benchmark(runs: int, *, confirm_first: bool, monkeypatch: pytest.MonkeyPatch) -> Any:
    ScriptedGemini(confirm_first=confirm_first).install(monkeypatch)
    with BenchmarkInstrumentation() as instrumentation:
        benchmark = SessionBenchmark(app, attachment=load_attachment(DEFAULT_DOC))
        results = await benchmark.run(runs=runs)
    return results, instrumentation.unattributed_calls


def _labels(run: RunResult) -> list[str]:
    return [turn.label for turn in run.turns]


async def test_every_request_and_node_is_counted(monkeypatch: pytest.MonkeyPatch) -> None:
    runs, unattributed = await _benchmark(2, confirm_first=False, monkeypatch=monkeypatch)

    assert unattributed == 0
    for run in runs:
        assert run.ok, run.error
        assert all(run.checks.values()), run.checks
        assert run.final_brief["region"] == "Asia"
        assert _labels(run) == [
            "1 capabilities",
            "2 submit company brief (.md)",
            "3 founder question",
            "4 run europe 2026",
            "4 run europe 2026 › HITL approve",
            "5 compare with previous reports",
            "6 change region to asia",
            "6 change region to asia › HITL approve",
        ]
        components = [call.component for call in run.llm_calls]
        assert components.count(CLASSIFIER) == 2
        assert components.count("report_synthesizer_agent") == 2
        assert all(not c.via_adk for c in run.llm_calls if c.component == CLASSIFIER)
        expected = sum(
            (TOKENS[c if c != CLASSIFIER else "classifier"] for c in components), TokenUsage()
        )
        assert run.tokens == expected
        for turn in run.turns:
            assert not turn.spans_outside_window()
            assert turn.e2e_s >= max((s.duration_s for s in turn.spans), default=0)
        for label in ("4 run europe 2026 › HITL approve", "6 change region to asia › HITL approve"):
            turn = next(t for t in run.turns if t.label == label)
            nodes = {span.name for span in turn.spans if span.kind == "node"}
            assert set(WATCHED_NODES) <= nodes

    summary = summarize(runs, unattributed_requests=unattributed, watched_nodes=WATCHED_NODES)
    acc = summary.accounting
    assert acc.adk_call_llm_spans == acc.adk_requests
    assert acc.direct_requests == {CLASSIFIER: 4}
    assert acc.watched_nodes == {name: 4 for name in WATCHED_NODES}
    assert acc.watched_outside_turn_window == 0
    assert "route_user_request/classify_intent_async" in render_markdown("t", {}, summary)


async def test_stalled_step_is_nudged_until_the_report_runs(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    (run,), _ = await _benchmark(1, confirm_first=True, monkeypatch=monkeypatch)

    assert run.ok, run.error
    assert all(run.checks.values()), run.checks
    assert "4 run europe 2026 · nudge 1" in _labels(run)
    assert "4 run europe 2026 · nudge 1 › HITL approve" in _labels(run)
    assert "6 change region to asia · nudge 1 › HITL approve" in _labels(run)
    assert sum(turn.kind == "nudge" for turn in run.turns) == 2


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


def test_load_attachment_reads_markdown_as_inline_data(tmp_path: Path) -> None:
    part = load_attachment(DEFAULT_DOC)
    assert part.inline_data is not None
    assert part.inline_data.mime_type == "text/markdown"
    assert part.inline_data.data == DEFAULT_DOC.read_bytes()

    with pytest.raises(FileNotFoundError):
        load_attachment(tmp_path / "missing.md")
    with pytest.raises(ValueError, match="not a regular file"):
        load_attachment(tmp_path)


def test_main_writes_report_and_results(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    ScriptedGemini().install(monkeypatch)

    exit_code = main(["--runs", "1", "--output-dir", str(tmp_path)])

    assert exit_code == 0
    (results,) = tmp_path.glob("*.json")
    payload = json.loads(results.read_text(encoding="utf-8"))
    assert payload["summary"]["ok_runs"] == 1
    assert payload["runs"][0]["tokens"]["total"] > 0
    assert (tmp_path / results.with_suffix(".md").name).is_file()
    assert "## Accounting checks" in capsys.readouterr().out
