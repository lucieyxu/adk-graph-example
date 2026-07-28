# ruff: noqa: E402
import os
import sys

# Add current directory and shared module directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
root_dir = os.path.abspath(os.path.join(current_dir, "../.."))
sys.path.insert(0, root_dir)

from agent import Agent
from shared.py.components.logging import get_logger

logger = get_logger("a2a_server")

try:
    from google.adk.a2a.utils.agent_to_a2a import to_a2a

    HAS_A2A = True
except ImportError:
    HAS_A2A = False


def main():
    if not HAS_A2A:
        logger.error(
            "The private 'a2a' library is required to run the A2A server. "
            "Please ensure you are authenticated to the internal Google artifact registry "
            "and run: uv pip install a2a"
        )
        sys.exit(1)

    logger.info("Initializing Agent...")
    agent_instance = Agent()
    agent_instance.set_up()

    if not hasattr(agent_instance, "adk_agent"):
        logger.error("ADK Agent failed to initialize in set_up()")
        sys.exit(1)

    port = int(os.getenv("PORT", 8080))
    host = os.getenv("HOST", "0.0.0.0")

    logger.info(f"Wrapping ADK Agent in A2A Starlette application on {host}:{port}...")

    # Convert ADK agent to a Starlette application implementing A2A endpoints
    a2a_app = to_a2a(
        agent=agent_instance.adk_agent,
        host=host,
        port=port,
        protocol="http",
    )

    import uvicorn

    uvicorn.run(a2a_app, host=host, port=port)


if __name__ == "__main__":
    main()
