from typing import Literal

from pydantic import BaseModel


class StorageWriteOutput(BaseModel):
    error: Literal[False] = False
    gcs_uri: str
    content_type: str
    size: int


class StorageRequestWriteUrlInput(BaseModel):
    gcs_uri: str
    content_type: str


class StorageRequestWriteUrlOutput(BaseModel):
    error: Literal[False] = False
    gcs_uri: str
    content_type: str
    signed_url: str
