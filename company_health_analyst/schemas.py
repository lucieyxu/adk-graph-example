from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class CompanyBrief(BaseModel):
    company_name: Optional[str] = Field(None, description="Name of the company to analyze.")
    time_span: Optional[str] = Field(
        None, description="Target analysis timeframe (e.g., 'last year', 'Q2 2026')."
    )
    region: Optional[str] = Field(
        None, description="Target geographical focus/region (e.g., 'US', 'Europe')."
    )
    summary: Optional[str] = Field(
        None, description="Natural language summary of the analysis request."
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
    url: Optional[str] = None
    source_type: str  # 'web' or 'internal'
