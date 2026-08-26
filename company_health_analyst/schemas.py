from enum import Enum
from pydantic import BaseModel, Field


class CompanyBrief(BaseModel):
    company_name: str = Field(description="Name of the company to analyze.")
    time_span: str = Field(
        description="Target analysis timeframe (e.g., 'last year', 'Q2 2026', 'FY2025')."
    )
    region: str = Field(
        description="Target geographical focus/region (e.g., 'US', 'Europe', 'Global')."
    )
    summary: str | None = Field(
        default=None, description="Natural language summary of the analysis request."
    )


class ExtractorOutput(BaseModel):
    company_brief: CompanyBrief
    conflicts: list[str] = Field(
        default_factory=list, description="Contradictions detected between inputs."
    )


class IntentCategory(str, Enum):
    GENERATE_REPORT = "generate_report"
    MODIFY = "modify"
    CONFIRM_REPORT = "confirm_report"
    ASK_EXPLANATION = "ask_explanation"
    FALLBACK = "fallback"


class IntentClassification(BaseModel):
    intent: IntentCategory
    explanation: str


class SearchResultItem(BaseModel):
    title: str
    snippet: str
    url: str | None = None
    source_type: str  # 'web' or 'internal'
