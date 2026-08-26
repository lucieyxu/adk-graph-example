from google.adk.agents import LlmAgent
from google.genai import types as genai_types

from company_health_analyst.app_utils.config import AGENT_MODEL
from company_health_analyst.prompts import PromptTemplate
from company_health_analyst.schemas import (
    CompanyBrief,
    ExtractorOutput,
    IntentClassification,
)
from company_health_analyst.tools import fetch_report_context, search_previous_reports

intake_agent = LlmAgent(
    name="intake_agent",
    model=AGENT_MODEL,
    mode="task",  # multi turn with goal to finish the task before going to the rest of the workflow
    instruction=PromptTemplate.INTAKE_AGENT,
    output_schema=CompanyBrief,
    output_key="company_brief",
    tools=[fetch_report_context, search_previous_reports],
    generate_content_config=genai_types.GenerateContentConfig(
        temperature=0.0,
    ),
)

intent_classifier_agent = LlmAgent(
    name="intent_classifier_agent",
    model=AGENT_MODEL,
    instruction=PromptTemplate.INTENT_CLASSIFIER,
    output_schema=IntentClassification,
    generate_content_config=genai_types.GenerateContentConfig(
        temperature=0.0,
    ),
)

extractor_agent = LlmAgent(
    name="extractor_agent",
    model=AGENT_MODEL,
    instruction=PromptTemplate.EXTRACTOR_AGENT,
    output_schema=ExtractorOutput,
    generate_content_config=genai_types.GenerateContentConfig(
        temperature=0.0,
    ),
)

report_synthesizer_agent = LlmAgent(
    name="report_synthesizer_agent",
    model=AGENT_MODEL,
    instruction=PromptTemplate.REPORT_SYNTHESIZER,
    generate_content_config=genai_types.GenerateContentConfig(
        temperature=0.2,
    ),
)

explanation_agent = LlmAgent(
    name="explanation_agent",
    model=AGENT_MODEL,
    instruction=PromptTemplate.EXPLANATION_AGENT,
    include_contents="default",  # include session history
    tools=[fetch_report_context, search_previous_reports],
    generate_content_config=genai_types.GenerateContentConfig(
        temperature=0.0,
    ),
)
