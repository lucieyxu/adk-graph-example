# ruff: noqa: E402
import os
import sys

# ADD path for local modules
current_dir = os.path.abspath(os.path.dirname(os.path.realpath(__file__)))
sys.path.append(current_dir)

# ADD path for shared directory
root_dir = os.path.abspath(os.path.join(current_dir, "../../.."))
sys.path.insert(0, root_dir)

from shared.py.components.env_guard import check

valid = check()
if valid:
    from mcp.server.fastmcp import FastMCP
    from shared.py.config import GCP_PROJECT_ID

    if GCP_PROJECT_ID == "":
        print("Fatal error, GCP_PROJECT_ID is None. Exiting...")
        sys.exit()

    # Read Cloud Run host and port from environment variables
    host = "0.0.0.0"
    port = int(os.getenv("PORT", "8080"))

    # Initialize FastMCP Server
    mcp = FastMCP("Template MCP Server", host=host, port=port)

    @mcp.tool()
    def sample_tool(param: str) -> str:
        """A sample tool exposed via the Model Context Protocol.

        Args:
            param: A sample string parameter description.
        """
        return f"Hello! MCP server on project {GCP_PROJECT_ID} received param: {param}"

    if __name__ == "__main__":
        # Run over Server-Sent Events (SSE) HTTP transport for Cloud Run hosting compatibility
        mcp.run(transport="sse")
