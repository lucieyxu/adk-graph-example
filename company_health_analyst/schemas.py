from pydantic import BaseModel, Field


class PipelineInput(BaseModel):
    """Arguments the coordinator passes when invoking the analysis pipeline tool.

    These field descriptions become the tool's function declaration, so they are
    read by the root agent's model when it decides how to call the pipeline.
    """

    company_name: str = Field(description="Name of the company to analyze.")
    time_span: str = Field(
        description="Target analysis timeframe (e.g., 'last year', 'Q2 2026', 'FY2025')."
    )
    region: str = Field(
        description="Target geographical focus/region (e.g., 'US', 'Europe', 'Global')."
    )


class IntakeValidationResponse(BaseModel):
    """User response when validating captured intake parameters.

    Booleans here are rendered as checkboxes that the ADK Web UI starts unticked and
    submits on every Submit, whatever default is declared on the field. The only safe
    meaning for a boolean is therefore one where ``False`` is what pressing Submit
    untouched should mean -- hence ``cancel`` rather than an ``approved`` flag, which
    would arrive as ``False`` on every submission and decline every run.
    """

    company_name: str | None = Field(
        default=None,
        description="Name of the company to analyze (leave blank to keep captured value).",
    )
    time_span: str | None = Field(
        default=None,
        description="Target analysis timeframe (leave blank to keep captured value).",
    )
    region: str | None = Field(
        default=None,
        description="Target geographical focus/region (leave blank to keep captured value).",
    )
    summary: str | None = Field(
        default=None, description="Natural language summary of the analysis request."
    )
    cancel: bool = Field(
        default=False,
        description=(
            "Tick to cancel this analysis without running it. "
            "Leave unticked and press Submit to proceed."
        ),
    )


class SearchResultItem(BaseModel):
    title: str
    snippet: str
    url: str | None = None
    source_type: str  # 'web' or 'internal'
