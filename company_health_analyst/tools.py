from typing import Any
from google.adk.agents.context import Context


def fetch_report_context(ctx: Context) -> dict[str, Any]:
    """Retrieves active company brief, searches, and synthesized report from session context.

    Use this tool whenever the user asks about what has been analyzed, what search facts
    were gathered, or needs a summary of the current report.
    """
    default_msg = "No report has been synthesized yet. The user needs to confirm the brief first."
    return {
        "company_brief": ctx.state.get("company_brief", {}),
        "search_results": ctx.state.get("search_results", {}),
        "report_markdown": ctx.state.get("report_markdown", default_msg),
    }


def search_previous_reports(ctx: Context, query: str) -> list[str]:
    """Searches the mock historical archives for previous company health analyses.

    Use this tool to compare current performance against previous timeframe metrics.

    Args:
        query: The name of the company or topic to search for in archives.
    """
    query_lower = query.lower()
    if "xyz" in query_lower:
        return [
            (
                "Archive: 2024 XYZ Europe Health Report. Overall Rating: Strong Growth. "
                "Major Risk: Tech Regulations. Core Margin: 24%."
            ),
            (
                "Archive: 2023 XYZ Global Health Report. Overall Rating: Outperforming. "
                "Margin: 22.5%."
            ),
        ]

    return [f"Archive Search: No historical reports found for query '{query}'."]
