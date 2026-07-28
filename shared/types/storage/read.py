from typing import Literal

from pydantic import BaseModel


class StorageRequestReadUrlInput(BaseModel):
    gcs_uri: str


class StorageRequestReadUrlOutput(BaseModel):
    error: Literal[False] = False
    gcs_uri: str
    content_type: str
    size: int
    signed_url: str
