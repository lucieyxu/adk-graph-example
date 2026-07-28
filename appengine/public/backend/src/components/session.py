# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - ✅ Code Template: ADD the custom demo functionality ✅ - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

from firebase_admin import auth as firebase_auth  # pyright: ignore[reportMissingTypeStubs]
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from shared.py.components.firestore import db
from shared.py.config import ENV, GCP_PROJECT_ID
from shared.py.firestore.session import SessionManager
from shared.py.flask.decorators import ErrorWithHTTPCode
from shared.types.session.rank import SessionRankInput, SessionRankOutput
from shared.types.session.token import SessionPublicTokenInput, SessionPublicTokenOutput


def create_token(data: SessionPublicTokenInput) -> SessionPublicTokenOutput:
    # CREATE token for Firebase clientside auth
    uid = data.uid

    if not uid or uid == "undefined" or uid == "":
        raise ErrorWithHTTPCode(f"Failed to create firebase token: uid invalid, got '{uid}'", 400)

    # CHECK doc exists in Firestore
    firestore_db = firestore.client(database_id=f"{GCP_PROJECT_ID}-{ENV}")
    firestore_collection = firestore_db.collection("sessions")
    firestore_ref = firestore_collection.document(uid)
    firestore_doc_exists: bool = firestore_ref.get().exists  # type: ignore

    if not firestore_doc_exists:
        raise ErrorWithHTTPCode(
            f"Failed to create firebase token: data not found for sessionId '{uid}'", 404
        )

    firebase_token = firebase_auth.create_custom_token(  # type: ignore
        uid,
        developer_claims={"read": False, "write": False},
    )

    if not firebase_token:
        raise Exception("Failed to create firebase token")

    return SessionPublicTokenOutput(
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
