# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #


import os
import subprocess
from typing import Any

import requests
from google.cloud import workflows
from google.cloud.workflows import executions
from shared.py.components.urls import urls
from shared.py.config import ENV, GCP_LOCATION, GCP_PROJECT_ID
from shared.types.general import WorkflowsCancelOutput, WorkflowsGetOutput, WorkflowsRunInput

workflows_client = workflows.WorkflowsClient()
executions_client = executions.ExecutionsClient()


def run_local(workflow_name: str, data: WorkflowsRunInput):
    # SET env variables and call the workflow in a thread
    local_env_vars = os.environ.copy()
    del local_env_vars["VIRTUAL_ENV"]

    local_env_vars["RUNTIME_ARGS"] = data.model_dump_json()

    # CONVERT to abs path
    repo_root = os.path.join(os.path.dirname(__file__), "../../../")
    script_rel_path = os.path.join(repo_root, "workflows", workflow_name)
    script_abs_path = os.path.abspath(script_rel_path)

    try:
        subprocess.Popen(
            ["uv run workflow_local.py"],
            env=local_env_vars,
            cwd=script_abs_path,
            shell=True,
        )
        print(f"--- Started local workflow: {workflow_name} ---")

    except subprocess.CalledProcessError as e:
        print(f"Error starting run local workflow: {e}")
        print(f"{e.stderr}")

    return "local-workflow-has-no-execution-name"


def run_cloud(workflow_name: str, data: WorkflowsRunInput):
    ENV = "staging"
    # full_workflow_name = f"projects/{GCP_PROJECT_ID}/locations/{GCP_LOCATION}/workflows/{ENV}-workflows-{workflow_name}"  # noqa: E501

    runtime_args = data.model_dump_json()

    # RUN workflow execution via Cloud Run in deployed environment
    workflow_parent = executions_client.workflow_path(
        GCP_PROJECT_ID, GCP_LOCATION, f"{ENV}-{workflow_name}"
    )
    execution = executions.Execution(argument=runtime_args)
    request = executions.CreateExecutionRequest(
        parent=workflow_parent,
        execution=execution,
    )

    op = executions_client.create_execution(request=request)  # type: ignore
    print(f"Workflow execution started: {op.name}")
    print(f"Execution state: {op.state}")

    return str(op.name)


def run(workflow_name: str, data: WorkflowsRunInput):
    if ENV == "dev":
        execution_id = run_local(workflow_name=workflow_name, data=data)
    else:
        execution_id = run_cloud(workflow_name=workflow_name, data=data)

    return execution_id


def get(workflow_name: str, execution_name: str):
    if ENV == "dev":
        return None
    else:
        full_name = f"projects/{GCP_PROJECT_ID}/locations/{GCP_LOCATION}/workflows/{ENV}-{workflow_name}/executions/{execution_name}"  # noqa: E501
        request = executions.GetExecutionRequest(name=full_name)
        response = executions_client.get_execution(request=request)  # type: ignore
        print(response)
        # TODO better status
        output = WorkflowsGetOutput(execution_name=execution_name, status="success")
        return output


def cancel(workflow_name: str, execution_name: str):
    if ENV == "dev":
        return None
    else:
        full_name = f"projects/{GCP_PROJECT_ID}/locations/{GCP_LOCATION}/workflows/{ENV}-{workflow_name}/executions/{execution_name}"  # noqa: E501
        request = executions_client.CancelExecutionRequest(name=full_name)  # type: ignore
        executions_client.cancel_execution(request=request)  # type: ignore
        output = WorkflowsCancelOutput(execution_name=execution_name)
        return output


def use_service_local(service_name: str, data: Any):
    if ENV != "dev":
        print("ERROR: cannot use_service_local in deployed environment. Use the workflow itself")
        return None

    url = urls.get(service_name)

    if not url:
        print(f"ERROR: failed to find url for service name: {service_name}")
        return None

    headers = {
        "Content-Type": "application/json",
    }

    response = requests.post(
        url=url,
        headers=headers,
        json=data if data else {},
    )

    return response
