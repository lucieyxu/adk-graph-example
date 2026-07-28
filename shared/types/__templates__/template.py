from typing import Literal

from pydantic import BaseModel


class HelloInput(BaseModel):
    name: str


class HelloOutput(BaseModel):
    error: Literal[False] = False
    which: Literal["py"] = "py"
    hello: str
