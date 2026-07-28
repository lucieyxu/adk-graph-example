from typing import Literal

from pydantic import BaseModel, Field


class EventCreateInput(BaseModel):
    id: str = Field(pattern=r"^[a-zA-Z0-9-]+$")


class EventCreateOutput(BaseModel):
    error: Literal[False]
    id: str = Field(pattern=r"^[a-zA-Z0-9-]+$")
