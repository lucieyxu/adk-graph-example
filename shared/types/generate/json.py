from typing import Annotated, Any, Dict, Generic, List, Literal, TypeVar, Union

from pydantic import BaseModel, Field

from shared.types.general import GeminiConfigBase, Media

T = TypeVar("T", bound=BaseModel)


# INPUT to the function, where the output schema is a Pydantic model
class GenerateJsonSimpleInput(GeminiConfigBase, Generic[T]):
    variant: Literal["SIMPLE"]
    response_schema: type[T]
    response_mime_type: Literal["application/json"] = "application/json"
    response_modalities: Literal["TEXT"] = "TEXT"


# INPUT to the function, where the output schema is a Pydantic model
class GenerateJsonWithMediaInput(GeminiConfigBase, Generic[T]):
    variant: Literal["WITH_MEDIA"]
    media: List[Media]
    response_schema: type[T]
    response_mime_type: Literal["application/json"] = "application/json"
    response_modalities: Literal["TEXT"] = "TEXT"


# INPUT to the API Endpoint, where the output schema is serialized
class GenerateJsonSimpleSerializedInput(GeminiConfigBase):
    variant: Literal["SIMPLE"]
    response_json_schema: Dict[str, Any]
    response_mime_type: Literal["application/json"] = "application/json"
    response_modalities: Literal["TEXT"] = "TEXT"


# INPUT to the API Endpoint, where the output schema is serialized
class GenerateJsonWithMediaSerializedInput(GeminiConfigBase):
    variant: Literal["WITH_MEDIA"]
    media: List[Media]
    response_json_schema: Dict[str, Any]
    response_mime_type: Literal["application/json"] = "application/json"
    response_modalities: Literal["TEXT"] = "TEXT"


GenerateJsonInput = Annotated[
    Union[GenerateJsonSimpleSerializedInput, GenerateJsonWithMediaSerializedInput],
    Field(discriminator="variant"),
]


class GenerateJsonOutput(BaseModel):
    error: Literal[False] = False
    data: Any
