from typing import Any

from google.adk import Workflow
from google.adk.agents import LlmAgent
from google.adk.tools.base_tool import BaseTool

# NodeTool is the supported way to expose a Workflow as a tool: LlmAgent wraps any BaseNode
# passed in `tools=[...]` with exactly this class. We construct it explicitly because the
# public `ToolUnion` alias does not yet include BaseNode, so `tools=[pipeline]` is correct at
# runtime but fails type checking, and the project forbids suppressions.
from google.adk.tools._node_tool import NodeTool
from google.adk.tools.tool_context import ToolContext
from google.adk.workflow import JoinNode

from company_health_analyst.app_utils.config import AGENT_MODEL
from company_health_analyst.nodes import (
    format_search_inputs,
    run_internal_search,
    run_web_search,
    save_report_to_db,
    validate_intake_node,
)
from company_health_analyst.prompts import PromptTemplate
from company_health_analyst.schemas import PipelineInput
from company_health_analyst.subagents import report_synthesizer_agent
from company_health_analyst.tools import fetch_report_context, search_previous_reports

PIPELINE_TOOL_NAME = "run_company_health_analysis"

join_search_results = JoinNode(name="join_search_results")

# The pipeline always halts at `validate_intake_node` for human confirmation, so this tool
# always pauses the invocation and resumes into a later turn. Two consequences shape the
# nodes inside it: the coordinator is NOT called again once the tool resumes, and
# `after_tool_callback` never fires for it. Anything the user must see on completion has to
# be emitted by a node here, as `report_synthesizer_agent` and the validation gate both do.
company_health_pipeline = Workflow(
    name=PIPELINE_TOOL_NAME,
    description=(
        "Runs the full company health analysis: parallel public web and internal archive "
        "search, then synthesis into a markdown report. Prompts the user to confirm the "
        "parameters before doing any work, and streams the finished report to them. "
        "Call this to generate a report, or to regenerate one with changed parameters."
    ),
    input_schema=PipelineInput,
    edges=[
        ("START", validate_intake_node),
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


async def skip_report_summarization(
    tool: BaseTool,
    args: dict[str, Any],
    tool_context: ToolContext,
    tool_response: dict[str, Any],
) -> None:
    """Stops the coordinator from re-narrating the report the pipeline already streamed.

    When the human approves, the pipeline runs to completion and the coordinator IS
    invoked once more with the report as the tool result; without this it re-emits the
    whole markdown document through a second model call.

    The declined path never reaches this callback -- that run ends inside the graph and
    the coordinator is not invoked at all, which is why ``validate_intake_node`` emits
    its own user-visible content.

    Args:
        tool: The tool that was called.
        args: The arguments it was called with.
        tool_context: Context carrying the actions applied to this tool call.
        tool_response: The tool's response.

    Returns:
        None, so the callback chain continues and the tool response is left unmodified.
    """
    if tool.name == PIPELINE_TOOL_NAME:
        tool_context.actions.skip_summarization = True
    return None


root_agent = LlmAgent(
    name="company_health_coordinator",
    model=AGENT_MODEL,
    instruction=PromptTemplate.COORDINATOR,
    tools=[
        NodeTool(node=company_health_pipeline),
        fetch_report_context,
        search_previous_reports,
    ],
    after_tool_callback=skip_report_summarization,
)
