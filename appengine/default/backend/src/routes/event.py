# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - ✅ Code Template: ADD the custom demo functionality ✅ - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

from flask import Blueprint
from shared.py.flask.decorators import FlaskTypedPostEndpoint
from shared.types.event.create import EventCreateInput, EventCreateOutput

from components.event import create_event

#
# - - - API Routes
#

event_bp = Blueprint("event_bp", __name__)


# CREATE user event
@FlaskTypedPostEndpoint(
    blueprint=event_bp,
    input_type=EventCreateInput,
    output_type=EventCreateOutput,
    path="/create",
)
def route_create_event(data: EventCreateInput):
    result = create_event(data)
    return result
