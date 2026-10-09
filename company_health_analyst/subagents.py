from google.adk.agents import LlmAgent
from google.genai import types as genai_types

from company_health_analyst.app_utils.config import AGENT_MODEL
from company_health_analyst.prompts import PromptTemplate

report_synthesizer_agent = LlmAgent(
    name="report_synthesizer_agent",
    model=AGENT_MODEL,
    instruction=PromptTemplate.REPORT_SYNTHESIZER,
    generate_content_config=genai_types.GenerateContentConfig(
        temperature=0.2,
    ),
)
