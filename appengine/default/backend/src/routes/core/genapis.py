# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

from typing import Any, Dict

from flask import Blueprint
from shared.py.components.genapis import all_apis
from shared.py.components.models import models
from shared.py.flask.decorators import FlaskTypedGetEndpoint
from shared.types.general import ListGenApisOutput

genapis_bp = Blueprint("genapis_bp", __name__)


@FlaskTypedGetEndpoint(blueprint=genapis_bp, output_type=ListGenApisOutput, path="/info")
def route_query_apis():
    api_descriptions = [a.describe() for a in all_apis]
    output: Dict[str, Any] = {"gen_apis": api_descriptions, "models": models.model_dump()}
    return output
