# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - ✅ Code Template: ADD the custom demo functionality ✅ - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

import uuid

from firebase_admin import auth as firebase_auth  # pyright: ignore[reportMissingTypeStubs]
from google.cloud.firestore_v1.base_query import FieldFilter
from shared.py.components.firestore import db
from shared.py.firestore.event import EventManager
from shared.py.firestore.session import SessionManager
from shared.types.session.create import SessionCreateInput, SessionCreateOutput
from shared.types.session.rank import SessionRankInput, SessionRankOutput
from shared.types.session.token import SessionTokenInput, SessionTokenOutput

# from firebase_admin import db as rtdb
# from shared.types.firestore.session import SessionRtdb


def create_session(data: SessionCreateInput) -> SessionCreateOutput:
    # Generate new session id
    id = str(uuid.uuid4())
    # Initialize a session manager instance
    s = SessionManager(id)
    # Write document to firestore with initial data, return Session instance
    user = s.create(data)

    # UPDATE event so the event does not expire before the session
    e = EventManager(data.event_id)
    e.reset_expiry()

    # Template Example code: safe to remove if not using Realtime Database
    # WRITE to RTDB
    # user_rtdb = SessionRtdb(id=user.id, score=0)
    # rtdb_ref = rtdb.reference(f"/sessions/{user.id}")  # type: ignore
    # rtdb_ref.update(user_rtdb.model_dump())  # type: ignore

    return SessionCreateOutput(error=False, id=user.id)


def create_token(data: SessionTokenInput) -> SessionTokenOutput:
    # CREATE token for Firebase clientside auth
    uid = str(uuid.uuid4()) if (not data.uid) else data.uid
    firebase_token = firebase_auth.create_custom_token(  # type: ignore
        uid,
        developer_claims={"read": True, "write": True},
    )

    if not firebase_token:
        raise Exception("Failed to create firebase token")

    return SessionTokenOutput(
        token=str(firebase_token.decode("utf-8")),  # type: ignore
        error=False,
    )


def query_rank(data: SessionRankInput) -> SessionRankOutput:
    s = SessionManager(data.session_id)
    session_data = s.get_data()

    if not session_data:
        raise Exception(f"ERROR getting rank, session data not found: {data.session_id}")

    collection = db.collection(s.collection)

    # QUERY count of users with higher score than this one
    rank_query = (  # type: ignore
        collection.where(  # type: ignore
            filter=FieldFilter("event_id", "==", session_data.event_id)
        )
        .where(filter=FieldFilter("score", ">=", session_data.score))
        .where(filter=FieldFilter("started_at", "!=", None))
        .count()
    )

    # QUERY count users with same event_id as this one
    total_query = (  # type: ignore
        collection.where(filter=FieldFilter("event_id", "==", session_data.event_id))  # type: ignore
        .where(filter=FieldFilter("started_at", "!=", None))
        .count()
    )  # type: ignore

    # RUN queries
    rank_result = rank_query.get()  # type: ignore
    total_result = total_query.get()  # type: ignore

    rank = int(round(rank_result[0][0].value))  # type: ignore
    total = int(round(total_result[0][0].value))  # type: ignore

    return SessionRankOutput(
        rank=rank,
        total=total,
        error=False,
    )
