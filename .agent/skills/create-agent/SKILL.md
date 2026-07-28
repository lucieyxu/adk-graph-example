---
name: create-agent
description: Create, test, evaluate, and deploy a new Python-based agent (conforming to Vertex AI Agent Engine / Reasoning Engine specs).
---

1. **Scaffold the agent**:
   Run the following command from the project root:
   ```bash
   mise run scaffold-agent <agent-name>
   ```
   This automatically:
   - Uses the template under `agents/__template_agent_py__` to initialize a new directory `/agents/<agent-name>`.
   - Replaces the placeholders in `pyproject.toml` and `agents-cli-manifest.yaml` with the normalized name.
   - Registers all packages, dev, lint, and deploy tasks for the new agent inside the root `mise.toml`.
2. **Implement Agent Logic** in `/agents/<agent-name>/agent.py`:
   - Customize `__init__`, `set_up()`, and the core `query()` / `query_async()` methods.
   - Register custom ADK tools and components (e.g., using `google-adk` integrations like `VertexAiSearchTool` or custom functions).
3. **Structured Logging & Observability**:
   - The template integrates `/shared/py/components/logging.py` which formats logs as GCP-compliant JSON.
   - All standard logs (`logger.info(...)`, `logger.error(...)`) print location metadata, trace ID contexts, and custom payload fields (passed via `extra={...}`). This is automatically indexed by Cloud Logging.
4. **Run and Test Locally**:
   - Install packages: `mise run packages-agent-<agent-name>`
   - Start the local FastAPI server: `mise run dev-agent-<agent-name>` (this boots the agent on `http://localhost:8000`).
   - Query the local server:
     ```bash
     curl -X POST http://localhost:8000/query \
          -H "Content-Type: application/json" \
          -d '{"prompt": "Hello!"}'
     ```
5. **Agent-to-Agent (A2A) Server**:
   - If hosting the agent in a container on Cloud Run (rather than as a Reasoning Engine) and calling it via the A2A protocol (e.g. from Gemini Enterprise), run the A2A-compatible Starlette server:
     ```bash
     cd agents/<agent-name>
     uv run a2a_server.py
     ```
   - *Note: This requires the private `a2a` Python library to be resolved/installed from the internal Google registry.*
6. **Run Evaluation (Platform Native)**:
   - Run evaluations using the native Agents CLI:
     ```bash
     # Generate evaluation runs
     mise run agents-cli eval generate
     # Grade evaluation runs
     mise run agents-cli eval grade
     ```
   - *Alternatively, run the local heuristic script: `cd agents/<agent-name> && uv run eval.py`.*
7. **Deploy to Vertex AI Agent Runtime**:
    - Run the deploy command from the project root:
      ```bash
      mise run agents-cli deploy
      ```
    - *Alternatively, run the custom python packager: `cd agents/<agent-name> && uv run deploy.py`.*
8. **Register with Gemini Enterprise Agent Registry**:
    - Register your agent in the centralized Agent Registry using the CLI:
      ```bash
      mise run agents-cli publish gemini-enterprise --gemini-enterprise-app-id <app-id>
      ```
    - *Alternatively, run the registration script: `cd agents/<agent-name> && uv run register.py --gemini-enterprise-app-id <app-id>`.*

### Creating Model Context Protocol (MCP) Services
- To expose custom APIs/tools to your agent via MCP, copy `/services/__template_mcp_py__` to `/services/<mcp-service-name>`.
- The MCP service template uses `FastMCP` running over SSE transport, ready for Cloud Run deployments. For setup steps, refer to [services/README.md](../../services/README.md).

Rules:
- Do **NOT** delete or modify the contents of the `/agents/__template_agent_py__` or `/services/__template_mcp_py__` folders.
- Follow the import formatting and directory structure conventions when accessing `/shared` components.
