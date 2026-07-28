from datetime import datetime, timedelta, timezone
from typing import Callable

from google.cloud.firestore_v1.document import DocumentReference
from shared.py.components.firestore import db, get_doc, update_doc
from shared.py.config import SESSION_TTL_DAYS
from shared.types.firestore.event import Event


#
# This class is a _stateless_ interface for CRUD ops on a Event Firestore record
#
class EventManager:
    doc_ref: DocumentReference
    id: str
    collection: str

    def __init__(self, id: str):
        self.collection = "events"
        self.id = id
        self.doc_ref = db.collection(self.collection).document(self.id)

    def create(self):
        # CHECK if document already exists, if so, do not overwrite
        doc_snapshot = self.doc_ref.get()  # type: ignore
        if doc_snapshot.exists:
            return None

        # POPULATE initial event data
        e = Event(
            id=self.id,
            created_at=datetime.now(timezone.utc),
            # TTL twice as long as the session docs
            expires_at=datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS),
        )

        # WRITE new doc to firestore
        self.doc_ref.set(e.model_dump())  # type: ignore

        return e

    def reset_expiry(self):
        doc_snapshot = self.doc_ref.get()  # type: ignore
        if not doc_snapshot.exists:
            self.create()

        def update(e: Event) -> Event:
            e.expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)
            return e

        self.set_data(update)

    def get_data(self):
        # FETCH latest data from server
        return get_doc(self.collection, self.id, Event)

    def set_data(self, update: Callable[[Event], Event]) -> bool:
        # WRITE data using a transaction
        return update_doc(self.collection, self.id, update, Event)
