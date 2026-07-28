from typing import Literal, Optional

from pydantic import BaseModel


class SessionTokenInput(BaseModel):
    uid: Optional[str] = None


class SessionTokenOutput(BaseModel):
    token: str
    error: Literal[False]


class SessionPublicTokenInput(BaseModel):
    uid: str


class SessionPublicTokenOutput(BaseModel):
    token: str
    error: Literal[False]
