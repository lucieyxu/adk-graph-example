# Google Cloud Agentic AI Starter Kit

This repository is a premium, reusable full-stack microservices template customized specifically for building and demonstrating **AI Agents** on Google Cloud. It is designed for use by the **Delta Forward Deployed Engineering (FDE)** team to build agents, test ideas, and accelerate customer engagements.

## 1. Architectural Overview & Directories

This monorepo contains components to build, evaluate, deploy, and showcase AI Agents:

```
├── .github/workflows/          # GitHub Actions CI/CD workflows (OIDC/Workload Identity)
├── .agent/skills/              # Developer guides and slash command skills (create-agent)
├── docs/                       # Monorepo guides, playbooks and documentation
│   ├── testing/                # Local verification playbook
│   └── agents/                 # Standalone Agents Developer Guide
├── agents/
│   └── __template_agent_py__/  # Standalone ADK/Reasoning Engine agent template
├── github-sync/                # GitHub-to-GitHub sync accelerator
├── services/
│   ├── __template_py__/        # FastAPI Cloud Run template
│   ├── __template_mcp_py__/    # FastMCP Model Context Protocol template
│   └── README.md               # Cloud Run Services Developer Guide
├── appengine/
│   ├── default/                # Fallback full stack web client app (Next.js + Flask)
│   └── public/                 # Social/Public static export experience
├── shared/
│   ├── py/                     # Shared Python components (Gemini, Logging, Skills, Auth)
│   ├── ts/                     # Shared TypeScript API clients (Api, GenApi wrappers)
│   └── types/                  # Shared Zod / Pydantic types (Frontend <-> Backend contracts)
└── mise.toml                   # Root developer workflow tasks
```

---

## 2. Agentic AI Starter Kit Features

Our custom agent template wraps the **Google Agent Development Kit (ADK)** and extends it with built-in integrations, robust monorepo support, and multi-protocol runtime servers:

* **📂 Out-of-the-Box Monorepo Support**: Configured to natively import, sync, and resolve shared Python code (e.g. global Secret Manager, Gemini clients, and Shared Types) from the root `/shared/` folder without complex packaging.

* **⚡ Native Agents CLI Compatibility**: Fully compliant with the Google Agent platform spec. Scaffolded agents support all native platform commands (`agents-cli eval`, `agents-cli deploy`) out-of-the-box, as well as `agents-cli scaffold enhance` to add production infrastructure layers (like Terraform, Cloud Run deployments, or BigQuery analytics).

* **🧠 Dynamic Skills Manager Integration**: Pre-configured to utilize the Remote Skills Manager (`/shared/py/components/skills.py`) to clone, cache, and dynamically load system prompts and custom tools from remote Git repositories at runtime, enabling updates without code redeployments.

* **📝 Structured Cloud Logging & Observability**: Integrated with the central logger `/shared/py/components/logging.py` to automatically output structured JSON logs mapping location metadata, call stack tracebacks, and trace ID context propagation directly in Google Cloud Logging.

* **🔐 Secure Runtime Secret Management**: Integrates with `/shared/py/components/secrets.py` to securely load API keys, database credentials, and service passwords at runtime from Google Cloud Secret Manager using the agent's active service account credentials.

* **🔗 Agent-to-Agent (A2A) Server Layer (`a2a_server.py`)**: Pre-configured Starlette-based server that exposes standard A2A endpoints (e.g. `/chat`, `/.well-known/agent-card.json`), allowing you to host the agent on Cloud Run and call it via the A2A protocol from Gemini Enterprise.

* **🧪 Heuristic Local Evaluation Suite (`eval.py`)**: Contains a heuristic test suite in `eval.py` to evaluate your agent's responses locally against custom JSON datasets (`/tests/eval/datasets/`) without needing to trigger remote, platform-heavy evaluation cycles.

* **⚙️ Integrated Workspace Automation**: Includes a local FastAPI wrapper (`app.py`) to run and query your agent locally, along with ready-to-go `pytest` and `ruff` configurations.

---

## 3. Keeping Your Project Up-To-Date (Upstream Syncing)

This starter kit includes a built-in automated sync workflow ([template-repo-sync-pr-open.yaml](.github/workflows/template-repo-sync-pr-open.yaml)) that checks for upstream template updates daily. As an individual/downstream developer, you have two options for handling updates:

### Option A: Opt-In (Keep Up-To-Date)
If you want to automatically receive fixes, security patches, and features added to the base template:
1. Generate a GitHub **Personal Access Token (PAT)** with repository access/scopes.
2. Add the token as a repository secret named **`TEMPLATE_SYNC_PAT`** in your repository's settings under `Settings > Secrets and variables > Actions`.
3. The workflow will run daily at 8:00 AM UTC, rebase your local commits onto the new template changes, and open a Pull Request (PR) to merge them into your `staging` branch (creating a Draft PR with conflict markers if manual resolution is needed).

### Option B: Opt-Out (Do Nothing)
* If you **do not** configure the `TEMPLATE_SYNC_PAT` secret, the daily sync workflow will gracefully skip its runs with a logged warning, and you will not receive any failure emails.
* Alternatively, you can delete the workflow files ([template-repo-sync-pr-open.yaml](.github/workflows/template-repo-sync-pr-open.yaml) and [template-repo-sync-pr-close.yaml](.github/workflows/template-repo-sync-pr-close.yaml)) from your repository.

---

## 4. Setup & Use (Quick Reference)

Manage Python virtual environments and Node dependencies using `mise` and `uv` out-of-the-box.

### A. Everyday Commands
Start your day by updating tokens and local virtual environments:
```bash
# Trust mise tasks
mise trust

# Sync daily tokens, check CLI status, and pull dependencies
mise daily
code .

# Run all local linters and formatting checks
mise run lint

# Run all unit and integration tests recursively
mise run test
```

### B. Developing Standalone Agents
1. **Scaffold the Agent**:
   ```bash
   mise run scaffold-agent <agent-name>
   ```
   This automatically duplicates the templates, normalizes package names/placeholders, and registers tasks in `mise.toml`.
2. **Implement & Verify**:
   Refer to the step-by-step developer skill checklist in [.agent/skills/create-agent/SKILL.md](.agent/skills/create-agent/SKILL.md).

### C. Natively Running Agents CLI
A root-level task wrapper allows you to run any `agents-cli` command natively from the root workspace directory without entering subdirectories:
```bash
# Get CLI environment details
mise run agents-cli info

# Run local evaluations
mise run agents-cli eval generate

# Deploy to Vertex AI Agent Runtime (use --no-confirm-project to skip interactive prompt)
mise run agents-cli deploy --no-confirm-project
# Or run interactively: mise run agents-cli deploy -i

# Publish to Agent Registry
mise run agents-cli publish gemini-enterprise
```

#### Platform Native Enhancements (OOTB)
Because our custom agent template is fully compliant with the Google Agent platform specs, all scaffolded agents support native enhancement commands out-of-the-box:
```bash
# E.g. Add Cloud Run deployment configurations or RAG datastores
cd agents/<agent-name>
uv run agents-cli scaffold enhance --deployment-target cloud_run
uv run agents-cli scaffold enhance --datastore agent_platform_search
```

#### Managing Workspace Developer Skills (Antigravity & Claude Code)
To load remote developer skills (such as coding guidelines, specifications, or automation workflows from repositories like `google/agents-cli` or `google/skills`) directly into your local coding assistant:
1. Configure your desired remote repositories and skill paths inside the root [skills.json](skills.json) file.
2. Synchronize the local workspace skills directory by running:
   ```bash
   mise run sync-skills
   ```
   This clones/pulls the remote repository and extracts the chosen skill packages into `/skills/` at the project root, where coding assistants will automatically discover and load them.

### D. Scaffold a New MCP Server
1. Copy `/services/__template_mcp_py__` to `/services/your-mcp-service`.
2. Rename `disabled_cloudrun.dockerfile` to `cloudrun.dockerfile` and update the `WORKDIR` path inside it to point to `/services/your-mcp-service`.
3. Update package name in `/services/your-mcp-service/pyproject.toml`.
4. Register the new tasks (`packages-services-your-mcp-service`, `dev-services-your-mcp-service`, `lint-services-your-mcp-service`) in the root `mise.toml`.
5. Run `mise trust` and sync packages: `mise run packages-services-your-mcp-service`.

---

## 5. CI/CD & Cloud Deployment

All deployments are automated via CI/CD.

### A. GitHub Actions Workflow (`deploy.yaml`)
Continuous Integration is managed via [.github/workflows/deploy.yaml](.github/workflows/deploy.yaml):
*   Uses **GCP Workload Identity Federation (OIDC)**. No hardcoded JSON credentials.
*   Triggers linting checks recursively first.
*   Deploys Standalone Agents to Vertex AI Agent Engine.
*   Builds and deploys custom services to Cloud Run.

### B. Deployment & Registration Scripts
*   `deploy.py`: Packs packages (including `/shared`) as wheels, uploads them to Vertex AI, and outputs `deployment_metadata.json`.
*   `register.py`: An idempotent script that registers the deployed Reasoning Engine agent as a tool inside a Gemini Enterprise assistant using Discovery Engine APIs.

### C. GitHub-to-GitHub Sync Accelerator
The workspace includes a template for setting up automated, one-way code synchronization from an internal repository to a customer-owned private repository. See [github-sync](./github-sync) for setup instructions.

---

## 6. Viewport Sizing & Scaling (Frontend)

If building user interfaces under `/appengine/default/frontend/`:
*   The `FixedViewportProvider` forces the page to render at a fixed aspect ratio (matching Figma designs) where **`1rem` = `1px`** at target width.
*   Aspect ratio dimensions are configured in `appengine/default/frontend/src/styles/constants.ts`.
*   Standard typography and spacing components utilize `m.px()` functions to scale cleanly between 4K and 1080p outputs.

---

## 7. Choosing Your Architecture: Monorepo vs. Standalone

When building agents on Google Cloud, you can choose between two main development paths:

### Option A: Monorepo Shared Architecture (The Starter Kit)
* **What it is**: Multiple agents (under `/agents/`) and services (under `/services/`) reside in a single repository and share unified models, types, frontends, and utilities inside `/shared/`.
* **When to use**: **(Recommended)** Best when you are building complex multi-agent systems, atomic agent architectures (e.g. orchestrator-worker layouts), or full-stack web applications where the frontend, backend services, and multiple agents must share common models, database schemas, API types, and configurations.
* **Pros**:
  * **Unified Code Reuse**: Avoid copying code for logging, environment checking, Secret Manager access, Gemini API configurations, or shared Zod/Pydantic types across your system.
  * **Synchronized Workspaces**: A single virtual environment manager (`mise`) formats, lints, and tests the entire stack simultaneously.
  * **Automated CI/CD**: Single GitHub workflow automatically deploys all modified agents and Cloud Run services.
* **Cons**:
  * **Requires custom packaging scripts**: Because the shared folder `/shared/` lives outside individual agent subdirectories, native commands like `agents-cli deploy` cannot resolve imports dynamically on GCS. You must deploy using the custom wrapper script: `mise run deploy-agent-<name>` (which internally resolves and structures the staging dependencies before upload).
  * **Coupling**: Changing a component inside `/shared/` can affect multiple agents/frontends, requiring regression testing.

### Option B: Standalone Platform Native Architecture (Full Standalone CLI)
* **What it is**: Every agent is developed inside its own dedicated root repository created directly via `agents-cli create <name>`.
* **When to use**: Best when you are building a single standalone agent, a quick prototype, or when your agent runs entirely independently and has no shared dependencies, database schemas, or deployment pipelines with other services in your codebase.
* **Pros**:
  * **100% Platform Native**: Can run all standard `agents-cli` commands (like `agents-cli deploy`) directly without any helper wrapper scripts.
  * **Isolation**: Dependencies, packages, and code changes in one agent are entirely decoupled from other services.
  * **Simpler setup**: Conforms exactly to standard platform samples and tutorials.
* **Cons**:
  * **Code Duplication**: If you have multiple agents, you have to copy-paste the secrets manager, logger, Gemini AI client, and utility tools into each agent folder manually.
  * **Desynchronization**: Standardizing configurations, utility upgrades, and shared business logic across projects becomes difficult.
  * **Disjointed Frontend/Backend**: If you are building a React Web App alongside your agents, they cannot easily share schema models (Zod/Pydantic) or APIs.

---

## 8. Trunk-Based Development & Branches

This project uses trunk-based development with the `staging` branch serving as the primary trunk:
*   When starting work on a new feature, pull the latest `staging` and create a branch named `feature/your-feature-here`.
*   You can open a draft PR for your feature right away.
*   Once approved, squash and merge into `staging`. This will trigger a CI/CD build and deployment to the staging environment.
*   Periodically, the lead engineer can merge `staging` into `prod` using a standard git merge to deploy releases to the production environment.
*   Branch protections prevent direct merges into `prod` unless the source branch is `staging` and the staging deployment was successful.


> [!NOTE]
> This project is customized from the original [Google Cloud Demos Template](https://github.com/GoogleCloudDemos/gcdemos-26-int-demotemplate) created by the **Google Cloud Demos & Experiments** team.