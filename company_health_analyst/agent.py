from google.adk.apps import App, ResumabilityConfig
from google.adk.plugins import ReflectAndRetryToolPlugin

from company_health_analyst.graph import root_agent

app = App(
    root_agent=root_agent,
    name="company_health_analyst",
    resumability_config=ResumabilityConfig(is_resumable=True),
    plugins=[
        ReflectAndRetryToolPlugin(
            name="intake_tool_retry_plugin",
            max_retries=2,
            throw_exception_if_retry_exceeded=False,
        )
    ],
)
