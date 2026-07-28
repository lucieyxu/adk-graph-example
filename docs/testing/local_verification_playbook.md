# Local Verification Playbook

This playbook provides a step-by-step walkthrough to verify all templates, integrations, tests, and task flows locally in your development workspace.

---

## Prerequisites

Ensure you have authenticated to Google Cloud and set up your local workspace variables.

```bash
# Authenticate to GCP using Application Default Credentials (ADC)
gcloud auth application-default login

# Configure your terminal environment variables
export GCP_PROJECT_ID="your-gcp-project-id"
export GCP_LOCATION="us-central1"
export GOOGLE_CLOUD_PROJECT="$GCP_PROJECT_ID"
export GOOGLE_CLOUD_LOCATION="$GCP_LOCATION"
export GOOGLE_GENAI_USE_VERTEXAI="1"
```

---

## Step 1: Formatting and Linter Check

Ensure code formatting matches the project configuration:

```bash
# Run all formatters and linters recursively across the monorepo
mise run lint
```
*   **Verification**: The command should complete with no output errors and report `All checks passed!`.

---

## Step 2: Automated Unit & Integration Tests

Execute the testing suite to check both shared packages and the template agent:

```bash
# Run pytest recursively
mise run test
```
*   **Verification**: You should see:
    *   `tests/test_agent.py ..` (2 passed)
    *   `tests/test_integration.py .` (1 passed)
    *   `tests/test_secrets.py .` (1 passed)
    *   Total: **4 passed**

---

## Step 3: Developer Skills Synchronization

Verify the dynamic skills manager workspace integration:

1. Open [skills.json](skills.json) at the root of the project.
2. Trigger the synchronization command:
   ```bash
   mise run sync-skills
   ```
3. Check the output directory:
   ```bash
   ls -la skills/
   ```
*   **Verification**: The command output should report success: `✅ Successfully synchronized all coding assistant workspace skills!`. The `skills/` directory should contain subfolders: `google-agents-cli-adk-code`, `google-agents-cli-observability`, `google-agents-cli-workflow`, and `alloydb-basics`.

---

## Step 4: Standalone Agent Evaluations

Verify that local evaluations execute correctly:

> [!NOTE]
> The Vertex AI ADK loader hardcodes names starting with double underscores (like `__template_agent_py__`) to load from built-in site-packages. To run evaluations, copy the folder to a standard name first:
> ```bash
> cp -r agents/__template_agent_py__ agents/template_agent_py
> cd agents/template_agent_py
> uv run agents-cli eval generate
> ```

1. Run the local python evaluation script directly (this works inside the template out-of-the-box by dynamically overriding package imports):
   ```bash
   cd agents/__template_agent_py__
   uv run eval.py
   ```
*   **Verification**:
    *   Console output prints `Loaded evaluation dataset from: .../basic-dataset.json`.
    *   The evaluations execute and print keyword matching scores.
    *   Saves the results to `/agents/__template_agent_py__/eval_report.json`.

---

## Step 5: Sandbox FastAPI Server Dry-Run

Verify that the local FastAPI server executes incoming HTTP requests:

1. Boot the sandbox API server:
   ```bash
   mise run dev-agents-template
   ```
   *(This starts the server on `http://localhost:8000`)*
2. In a separate terminal session, dispatch a query request:
   ```bash
   curl -X POST http://localhost:8000/query \
        -H "Content-Type: application/json" \
        -d '{"prompt": "Explain Cloud Run in one sentence."}'
   ```
*   **Verification**: The curl request should return a clean JSON payload mapping the response string:
    ```json
    {
      "response": "Google Cloud Run is a fully managed serverless platform..."
    }
    ```

---

## Step 6: Deploying Standalone Agents to Vertex AI Agent Engine

Verify that the deploy scripts pack and publish the agent successfully to the live GCP cloud:

1. Execute the deployment script from the root workspace folder:
   ```bash
   mise run deploy-agents-template
   ```
   *(Or run it inside the folder: `cd agents/__template_agent_py__ && uv run deploy.py`)*
2. Check the output directory:
   ```bash
   cat deployment_metadata.json
   ```
*   **Verification**: 
    - The deployment output logs the successful packaging of wheels (including the `/shared` dependency wheel) and prints the deployed resource details.
    - `deployment_metadata.json` is created/updated containing:
      ```json
      {
        "project": "your-gcp-project-id",
        "location": "us-central1",
        "reasoning_engine_id": "projects/your-project-number/locations/us-central1/reasoningEngines/..."
      }
      ```

---

## Step 7: Publishing to Gemini Enterprise Agent Registry

Verify registering the deployed Reasoning Engine agent in the centralized registry:

1. Execute the publish task from the root directory:
   ```bash
   mise run agents-cli publish gemini-enterprise --gemini-enterprise-app-id your-gemini-enterprise-app-id
   ```
   *(Or run it inside the folder: `cd agents/__template_agent_py__ && uv run register.py --gemini-enterprise-app-id your-app-id`)*
*   **Verification**:
    - The script successfully reads the `reasoning_engine_id` from `deployment_metadata.json`.
    - Dispatches a Discovery API registration request to Gemini Enterprise and logs a successful response.
