# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - ✅ Code Template: ADD the custom demo functionality ✅ - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
from shared.py.firestore.event import EventManager
from shared.py.flask.decorators import ErrorWithHTTPCode
from shared.types.event.create import EventCreateInput, EventCreateOutput


def create_event(data: EventCreateInput) -> EventCreateOutput:
    # Initialize a session manager instance
    e = EventManager(id=data.id)
    # Write document to firestore with initial data, return Event instance
    event = e.create()

    if not event:
        raise ErrorWithHTTPCode("Error creating event", 400)

    return EventCreateOutput(error=False, id=event.id)
