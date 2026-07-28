from typing import Annotated, List, Literal, Union

from pydantic import BaseModel, Field

from shared.types.general import GeminiConfigBase, Media


class GenerateTextSimpleInput(GeminiConfigBase):
    variant: Literal["SIMPLE"]
    response_mime_type: Literal["text/plain"] = "text/plain"
    response_modalities: Literal["TEXT"] = "TEXT"


class GenerateTextWithMediaInput(GeminiConfigBase):
    variant: Literal["WITH_MEDIA"]
    media: List[Media]
    response_mime_type: Literal["text/plain"] = "text/plain"
    response_modalities: Literal["TEXT"] = "TEXT"


GenerateTextInput = Annotated[
    Union[GenerateTextSimpleInput, GenerateTextWithMediaInput],
    Field(discriminator="variant"),
]


class GenerateTextOutput(BaseModel):
    error: Literal[False] = False
    text: str = ""
