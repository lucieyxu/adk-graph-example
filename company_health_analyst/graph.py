from google.adk import Workflow
from google.adk.workflow import FunctionNode, JoinNode

from company_health_analyst.nodes import (
    format_search_inputs,
    route_user_request,
    run_internal_search,
    run_web_search,
    save_report_to_db,
    validate_intake_node,
)
from company_health_analyst.subagents import (
    report_synthesizer_agent,
)

join_search_results = JoinNode(name="join_search_results")
route_user_node = FunctionNode(
    name="route_user_request",
    func=route_user_request,
    rerun_on_resume=True,
)

root_agent = Workflow(
    name="company_health_analyst_workflow",
    edges=[
        ("START", route_user_node),
        (
            route_user_node,
            {
                "validate_intake": validate_intake_node,
            },
        ),
        (
            validate_intake_node,
            {
                "searches": (run_web_search, run_internal_search),
            },
        ),
        (run_web_search, join_search_results),
        (run_internal_search, join_search_results),
        (join_search_results, format_search_inputs),
        (format_search_inputs, report_synthesizer_agent),
        (report_synthesizer_agent, save_report_to_db),
    ],
)
