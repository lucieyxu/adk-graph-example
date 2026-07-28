from typing import List

from pydantic import BaseModel
from shared.types.general import FirestoreTimestamp


class Session(BaseModel):
    id: str
    name: str
    event_id: str

    created_at: FirestoreTimestamp
    started_at: FirestoreTimestamp | None
    completed_at: FirestoreTimestamp | None
    expires_at: FirestoreTimestamp

    score: int

    images: List[str]


class SessionRtdb(BaseModel):
    id: str
    score: int
