from typing import Optional
from company_health_analyst.schemas import SearchResultItem


class DateNormalizationService:
    @staticmethod
    def normalize_timespan(time_span: Optional[str]) -> tuple[str, Optional[str]]:
        """Normalizes common semantic timeframes and detects errors.

        Returns:
            Tuple: (normalized_timespan, warning_code)
        """
        if not time_span:
            return "2026", None

        cleaned = time_span.lower().strip()
        if cleaned in ["last year", "previous year", "2025"]:
            return "2025", None
        elif cleaned in ["this year", "current year", "2026"]:
            return "2026", None
        elif cleaned in ["last quarter", "q1 2026"]:
            return "Q1 2026", None

        # Default behavior: pass-through with no warning
        return time_span, None


class MockSearchService:
    @staticmethod
    def search_web(company: str, region: str, time_span: str) -> list[SearchResultItem]:
        """Performs a mock search of public websites for corporate news."""
        comp_lower = company.lower()
        reg_upper = region.upper()

        if "xyz" in comp_lower:
            return [
                SearchResultItem(
                    title=f"XYZ {reg_upper} Revenue Grew 12% in {time_span}",
                    snippet=(
                        f"Public filings show XYZ operations in {reg_upper} experienced "
                        f"double-digit growth in {time_span}, propelled by strong demand "
                        "for cloud services and AI tooling."
                    ),
                    url="https://finance.example.com/news/xyz-eu-growth",
                    source_type="web",
                ),
                SearchResultItem(
                    title=(
                        f"Regulatory Scrutiny Intensifies on XYZ in {reg_upper} during {time_span}"
                    ),
                    snippet=(
                        f"Antitrust and compliance probes in {reg_upper} created financial "
                        f"headwinds for XYZ's ad tech segment throughout {time_span}."
                    ),
                    url="https://legal.example.com/antitrust/xyz",
                    source_type="web",
                ),
            ]

        # Generic fallback
        return [
            SearchResultItem(
                title=f"Public Market Summary for {company} in {reg_upper} ({time_span})",
                snippet=(
                    f"General market indices report {company} maintains a stable market share "
                    f"in {reg_upper} with moderate trading volatility observed in {time_span}."
                ),
                url=f"https://market.example.com/summary/{comp_lower}",
                source_type="web",
            )
        ]


class MockInternalService:
    @staticmethod
    def search_internal(company: str, region: str, time_span: str) -> list[SearchResultItem]:
        """Performs a mock search of internal corporate document archives."""
        comp_lower = company.lower()
        reg_upper = region.upper()

        if "xyz" in comp_lower:
            return [
                SearchResultItem(
                    title=f"XYZ Internal Q&A Transcript ({time_span}) - {reg_upper}",
                    snippet=(
                        "Internal leadership logs show a focus on efficiency optimization. "
                        "Employee satisfaction index rose 4% year-over-year in European hubs."
                    ),
                    source_type="internal",
                ),
                SearchResultItem(
                    title=f"Projected Infrastructure Capex Audit - {reg_upper} {time_span}",
                    snippet=(
                        "Internal financial audit: Data center expansion expenditures are fully "
                        "amortized. Operational margins in European operations rose by 140 bps."
                    ),
                    source_type="internal",
                ),
            ]

        # Generic fallback
        return [
            SearchResultItem(
                title=f"Internal Database Extract for {company} - {reg_upper} {time_span}",
                snippet=(
                    f"Compliance check completed. {company} internal accounts are certified "
                    "with zero high-risk outstanding actions."
                ),
                source_type="internal",
            )
        ]
