# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

from flask import Blueprint
from shared.py.components.jobs import run
from shared.py.flask.decorators import FlaskTypedPostEndpoint
from shared.types.general import JobsRunInput, JobsRunOutput

jobs_bp = Blueprint("jobs-bp", __name__)


@FlaskTypedPostEndpoint(
    blueprint=jobs_bp,
    input_type=JobsRunInput,
    output_type=JobsRunOutput,
    path="/<path:subpath>/run",
)
def route_run(valid_data: JobsRunInput, subpath: str):
    subpath_parts = subpath.split("/")
    job_name = subpath_parts[0]

    # RUN job execution (either via local thread, or trigger cloud job, depending on env)
    execution_name = run(job_name=job_name, data=valid_data)

    response = JobsRunOutput(execution_name=execution_name, input=valid_data)

    return response
