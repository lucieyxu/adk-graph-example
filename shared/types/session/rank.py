from typing import Literal

from pydantic import BaseModel


class SessionRankInput(BaseModel):
    session_id: str


class SessionRankOutput(BaseModel):
    error: Literal[False]
    rank: int
    total: int
