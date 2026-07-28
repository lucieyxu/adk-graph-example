# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

import os
import subprocess

from google.cloud import run_v2
from google.cloud.run_v2.types import EnvVar, job
from shared.py.config import ENV, GCP_LOCATION, GCP_PROJECT_ID
from shared.types.general import JobsCancelOutput, JobsGetOutput, JobsRunInput

jobs_client = run_v2.JobsClient()
executions_client = run_v2.ExecutionsClient()


def run_local(job_name: str, data: JobsRunInput):
    env_vars: dict[str, str] = {"FIRESTORE_QUERY": str(data.firestore_query)}

    # SET env variables and call the job in a thread
    local_env_vars = os.environ.copy()
    for k in env_vars:
        local_env_vars[k] = env_vars[k]
    del local_env_vars["VIRTUAL_ENV"]

    # CONVERT to abs path
    repo_root = os.path.join(os.path.dirname(__file__), "../../../")
    script_rel_path = os.path.join(repo_root, "jobs", job_name)
    script_abs_path = os.path.abspath(script_rel_path)

    try:
        subprocess.Popen(
            ["uv run src/main.py"],
            env=local_env_vars,
            cwd=script_abs_path,
            shell=True,
        )
        print(f"--- Started local job: {job_name} ---")

    except subprocess.CalledProcessError as e:
        print(f"Error starting run local job: {e}")
        print(f"{e.stderr}")

    return "local-job-has-no-execution-name"


def run_cloud(job_name: str, data: JobsRunInput):
    env_vars: dict[str, str] = {"FIRESTORE_QUERY": str(data.firestore_query)}

    full_job_name = f"projects/{GCP_PROJECT_ID}/locations/{GCP_LOCATION}/jobs/{ENV}-jobs-{job_name}"

    # CONFORM env vars to overrides
    client_env_vars: list[EnvVar] = []
    for key in env_vars:
        client_env_vars.append(EnvVar(name=key, value=env_vars[key]))
    container_overrides = job.RunJobRequest.Overrides.ContainerOverride(env=client_env_vars)
    overrides = job.RunJobRequest.Overrides(container_overrides=[container_overrides])

    # RUN job execution via Cloud Run in deployed environment
    job_request = run_v2.RunJobRequest(name=full_job_name, overrides=overrides)
    print("starting cloud job")
    op = jobs_client.run_job(  # type: ignore
        request=job_request
    )
    return str(op.metadata.name)  # type: ignore


def run(job_name: str, data: JobsRunInput):
    if ENV == "dev":
        execution_id = run_local(job_name=job_name, data=data)
    else:
        execution_id = run_cloud(job_name=job_name, data=data)

    return execution_id


def get(job_name: str, execution_name: str):
    if ENV == "dev":
        return None
    else:
        full_name = f"projects/{GCP_PROJECT_ID}/locations/{GCP_LOCATION}/jobs/{ENV}-{job_name}/executions/{execution_name}"  # noqa: E501
        request = run_v2.GetExecutionRequest(name=full_name)
        response = executions_client.get_execution(request=request)  # type: ignore
        print(response)
        # TODO better status
        output = JobsGetOutput(execution_name=execution_name, status="success")
        return output


def cancel(job_name: str, execution_name: str):
    if ENV == "dev":
        return None
    else:
        full_name = f"projects/{GCP_PROJECT_ID}/locations/{GCP_LOCATION}/jobs/{ENV}-{job_name}/executions/{execution_name}"  # noqa: E501
        request = run_v2.CancelExecutionRequest(name=full_name)
        executions_client.cancel_execution(request=request)  # type: ignore
        output = JobsCancelOutput(execution_name=execution_name)
        return output
