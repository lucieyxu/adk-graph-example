from google.adk import Workflow
from google.adk.workflow import JoinNode

from company_health_analyst.subagents import report_synthesizer_agent
from company_health_analyst.nodes import (
    classify_and_route,
    confirm_brief_and_run_searches,
    explain_and_notify,
    extract_brief_and_validate,
    fallback,
    format_search_inputs,
    prompt_user_for_confirmation,
    prompt_user_for_missing_fields,
    run_internal_search,
    run_web_search,
    save_report_to_db,
    check_brief_status,
)

join_search_results = JoinNode(name="join_search_results")

root_agent = Workflow(
    name="company_health_analyst_workflow",
    edges=[
        ("START", classify_and_route),
        (
            classify_and_route,
            {
                "generate_report": extract_brief_and_validate,
                "confirm_report": confirm_brief_and_run_searches,
                "ask_explanation": explain_and_notify,
                "missing": prompt_user_for_missing_fields,
                "prompt_confirmation": prompt_user_for_confirmation,
                "fallback": fallback,
            },
        ),
        (
            extract_brief_and_validate,
            {
                "missing": prompt_user_for_missing_fields,
                "complete": prompt_user_for_confirmation,
            },
        ),
        (
            prompt_user_for_missing_fields,
            {
                "generate_report": extract_brief_and_validate,
                "classify_and_route": classify_and_route,
            },
        ),
        (prompt_user_for_confirmation, {"classify_and_route": classify_and_route}),
        (explain_and_notify, check_brief_status),
        (
            check_brief_status,
            {
                "missing": prompt_user_for_missing_fields,
                "prompt_confirmation": prompt_user_for_confirmation,
            },
        ),
        (confirm_brief_and_run_searches, {"continue": (run_web_search, run_internal_search)}),
        (run_web_search, join_search_results),
        (run_internal_search, join_search_results),
        (join_search_results, format_search_inputs),
        (format_search_inputs, report_synthesizer_agent),
        (report_synthesizer_agent, save_report_to_db),
    ],
)
