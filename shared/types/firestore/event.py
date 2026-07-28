from pydantic import BaseModel
from shared.types.general import FirestoreTimestamp


class Event(BaseModel):
    id: str

    created_at: FirestoreTimestamp
    expires_at: FirestoreTimestamp
