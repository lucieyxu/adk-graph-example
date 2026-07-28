# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

from flask import Blueprint
from pydantic import TypeAdapter
from shared.py.components.workflows import run
from shared.py.flask.decorators import FlaskTypedPostEndpoint
from shared.types.general import WorkflowsRunInput, WorkflowsRunOutput

WorkflowsRunInputAdapter = TypeAdapter(WorkflowsRunInput)

workflows_bp = Blueprint("workflows-bp", __name__)


@FlaskTypedPostEndpoint(
    blueprint=workflows_bp,
    input_type=WorkflowsRunInput,
    output_type=WorkflowsRunOutput,
    path="/<path:subpath>/run",
)
def route_run(valid_data: WorkflowsRunInput, subpath: str):
    subpath_parts = subpath.split("/")
    workflow_name = subpath_parts[0]

    # RUN workflow execution via local thread
    execution_name = run(workflow_name=workflow_name, data=valid_data)

    response = WorkflowsRunOutput(execution_name=execution_name, input=valid_data)

    return response
