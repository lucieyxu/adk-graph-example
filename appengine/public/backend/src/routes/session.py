# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - ✅ Code Template: ADD the custom demo functionality ✅ - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

from flask import Blueprint
from shared.py.flask.decorators import FlaskTypedPostEndpoint
from shared.types.session.rank import SessionRankInput, SessionRankOutput
from shared.types.session.token import SessionPublicTokenInput, SessionPublicTokenOutput

from components.session import create_token, query_rank

#
# - - - API Routes
#

session_bp = Blueprint("session_bp", __name__)


# CREATE token for Firebase auth
@FlaskTypedPostEndpoint(
    blueprint=session_bp,
    input_type=SessionPublicTokenInput,
    output_type=SessionPublicTokenOutput,
    path="/public-token",
)
def route_login(data: SessionPublicTokenInput):
    result = create_token(data)
    return result


# QUERY rank for session
@FlaskTypedPostEndpoint(
    blueprint=session_bp,
    input_type=SessionRankInput,
    output_type=SessionRankOutput,
    path="/rank",
)
def route_rank(data: SessionRankInput):
    result = query_rank(data)
    return result
