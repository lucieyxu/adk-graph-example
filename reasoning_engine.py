import os

from company_health_analyst.app_utils.config import GCP_PROJECT_ID, GCP_LOCATION

# Configure google-genai environment variables for Vertex AI
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "1"
os.environ["GOOGLE_CLOUD_PROJECT"] = GCP_PROJECT_ID
os.environ["GOOGLE_CLOUD_LOCATION"] = GCP_LOCATION

import asyncio
from google.adk.runners import InMemoryRunner
from company_health_analyst.app_utils.logging import get_logger
from company_health_analyst.graph import root_agent as workflow_agent

logger = get_logger("agent")


class Agent:
    """Class conforming to Vertex AI Reasoning Engine (Agent Engine) spec, wrapping ADK."""

    def __init__(self, **kwargs):
        pass

    def set_up(self):
        """Initialise the ADK Agent and Runner."""
        logger.info("Initializing ADK Workflow Agent")
        self.adk_agent = workflow_agent
        self.runner = InMemoryRunner(agent=self.adk_agent)

    def query(self, input_text: str) -> str:
        """Query the ADK Agent runner synchronously using asyncio.run."""
        return asyncio.run(self.query_async(input_text))

    async def query_async(self, input_text: str) -> str:
        """Asynchronous execution mapping for ADK runner."""
        logger.info("Executing agent query", extra={"input_text": input_text})
        events = await self.runner.run_debug(input_text, quiet=True)
        response_text = ""
        for event in events:
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        response_text += part.text
        logger.info(
            "Agent query completed successfully", extra={"response_length": len(response_text)}
        )
        return response_text


# Expose root_agent globally to support ADK / Agents CLI tool loaders
_global_agent = Agent()
_global_agent.set_up()
root_agent = _global_agent.adk_agent
