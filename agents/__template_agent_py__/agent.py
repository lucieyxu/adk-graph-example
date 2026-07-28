# ruff: noqa: E402
import os
import sys

# Add current directory and shared module directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
root_dir = os.path.abspath(os.path.join(current_dir, "../.."))
sys.path.insert(0, root_dir)

from shared.py.config import GCP_PROJECT_ID, GCP_LOCATION

# Configure google-genai environment variables for Vertex AI
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "1"
os.environ["GOOGLE_CLOUD_PROJECT"] = GCP_PROJECT_ID
os.environ["GOOGLE_CLOUD_LOCATION"] = GCP_LOCATION

from google.adk.agents import Agent as AdkAgent
from google.adk.models import Gemini
from google.adk.runners import InMemoryRunner
import asyncio
from shared.py.components.logging import get_logger

logger = get_logger("agent")


class Agent:
    """Class conforming to Vertex AI Reasoning Engine (Agent Engine) spec, wrapping ADK."""

    def __init__(
        self,
        model: str = "gemini-2.5-flash",
        system_instruction: str = "You are a helpful assistant.",
    ):
        self.model_name = model
        self.system_instruction = system_instruction

    def set_up(self):
        """Initialise the ADK Agent and Runner."""
        # Initialize the ADK model integration
        model_integration = Gemini(model=self.model_name)

        agent_tools = []

        logger.info(
            "Initializing ADK Agent",
            extra={
                "model": self.model_name,
                "system_instruction": self.system_instruction[:200] + "...",
            },
        )

        # =====================================================================
        # INTEGRATION EXAMPLES (FDE ENGAGEMENTS BEST PRACTICES)
        # =====================================================================
        #
        # 1. SECRET MANAGER: Fetch secure API tokens at runtime instead of hardcoding:
        # try:
        #     from shared.py.components.secrets import get_secret
        #     api_token = get_secret("external-service-token")
        # except Exception as e:
        #     logger.warning(f"Failed to load secret: {e}")
        #
        # 2. VERTEX AI SEARCH GROUNDING: Ground agent output against enterprise datastores:
        # try:
        #     from shared.py.components.grounding import get_vertex_ai_search_tool
        #     grounding_tool = get_vertex_ai_search_tool(data_store_id="your-datastore-id")
        #     agent_tools.append(grounding_tool)
        # except Exception as e:
        #     logger.warning(f"Failed to configure grounding: {e}")
        #
        # 3. MODEL CONTEXT PROTOCOL (MCP) CONSUMER: Load tools from an MCP server dynamically:
        # # Make sure you add "mcp>=0.9.0" to dependencies
        # # from mcp import ClientSession, StdioServerParameters
        # # from mcp.client.stdio import stdio_client
        # # mcp_params = StdioServerParameters(
        # #     command="uv",
        # #     args=["run", "services/your-mcp-service/src/main.py"]
        # # )
        # # async def load_mcp():
        # #     async with stdio_client(mcp_params) as (read, write):
        # #         async with ClientSession(read, write) as session:
        # #             await session.initialize()
        # #             tools = await session.list_tools()
        # #             # Wrap mcp tools as callable ADK tools...
        # =====================================================================

        # Initialize the ADK Agent
        self.adk_agent = AdkAgent(
            name="template_agent",
            model=model_integration,
            instruction=self.system_instruction,
            tools=agent_tools,  # Registering the loaded tools
        )
        # Initialize InMemoryRunner
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
