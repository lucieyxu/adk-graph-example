from typing import Literal

from pydantic import BaseModel


class SessionCreateInput(BaseModel):
    name: str
    event_id: str


class SessionCreateOutput(BaseModel):
    error: Literal[False]
    id: str
