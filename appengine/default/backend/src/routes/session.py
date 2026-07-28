# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - ✅ Code Template: ADD the custom demo functionality ✅ - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

from flask import Blueprint
from shared.py.flask.decorators import FlaskTypedPostEndpoint
from shared.types.session.create import SessionCreateInput, SessionCreateOutput
from shared.types.session.rank import SessionRankInput, SessionRankOutput
from shared.types.session.token import SessionTokenInput, SessionTokenOutput

from components.session import create_session, create_token, query_rank

#
# - - - API Routes
#

session_bp = Blueprint("session_bp", __name__)


# CREATE user session
@FlaskTypedPostEndpoint(
    blueprint=session_bp,
    input_type=SessionCreateInput,
    output_type=SessionCreateOutput,
    path="/create",
)
def route_create_session(data: SessionCreateInput):
    result = create_session(data)
    return result


# CREATE token for Firebase auth
@FlaskTypedPostEndpoint(
    blueprint=session_bp,
    input_type=SessionTokenInput,
    output_type=SessionTokenOutput,
    path="/token",
)
def route_login(data: SessionTokenInput):
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
