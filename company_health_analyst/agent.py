from google.adk.apps import App
from company_health_analyst.graph import root_agent

app = App(
    root_agent=root_agent,
    name="company_health_analyst",
)
