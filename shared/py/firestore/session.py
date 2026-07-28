from datetime import datetime, timedelta, timezone
from typing import Callable

from google.cloud.firestore_v1.document import DocumentReference
from shared.py.components.firestore import db, get_doc, update_doc
from shared.py.config import SESSION_TTL_DAYS
from shared.types.firestore.session import Session
from shared.types.session.create import SessionCreateInput


#
# This class is a _stateless_ interface for CRUD ops on a Session Firestore record
#
class SessionManager:
    doc_ref: DocumentReference
    id: str
    collection: str

    def __init__(self, id: str):
        self.collection = "sessions"
        self.id = id
        self.doc_ref = db.collection(self.collection).document(self.id)

    def create(self, data: SessionCreateInput):
        # POPULATE initial session data
        s = Session(
            id=self.id,
            event_id=data.event_id,
            name=data.name,
            expires_at=datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS),
            started_at=None,
            completed_at=None,
            created_at=datetime.now(timezone.utc),
            score=0,
            images=[],
        )

        # WRITE new doc to firestore
        self.doc_ref.set(s.model_dump())  # type: ignore

        return s

    def get_data(self):
        # FETCH latest data from server
        return get_doc(self.collection, self.id, Session)

    def set_data(self, update: Callable[[Session], Session]) -> bool:
        # WRITE data using a transaction
        return update_doc(self.collection, self.id, update, Session)
