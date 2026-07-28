import datetime
from typing import (
    Any,
    Generic,
    List,
    Literal,
    Optional,
    Protocol,
    Tuple,
    TypeVar,
    Union,
    cast,
)

from pydantic import BaseModel

T = TypeVar("T")  # Define a TypeVar
U = TypeVar("U", bound=BaseModel)
V = TypeVar("V", bound=BaseModel, contravariant=True)
W = TypeVar("W", bound=BaseModel, contravariant=True)

#
# - - - Top-level Input and Output
#


class ApiError(BaseModel):
    error: Literal[True]
    message: str
    input: Any


# Python only, do not recreate in companion .ts file
ApiResponse = Tuple[Union[T, ApiError], int]


#
# - - - Gemini / Imagen / Veo shared types
#


ModelCategory = Literal[
    "gemini_pro",
    "gemini_flash",
    "gemini_lite",
    "gemini_pro_image",
    "gemini_flash_image",
    "imagen",
    "imagen_fast",
    "veo",
    "veo_fast",
    "lyria",
]


class ModelRecord(BaseModel):
    ga: bool
    name: str
    version: float


class ModelsInfo(BaseModel):
    gemini_pro: List[ModelRecord] = []
    gemini_flash: List[ModelRecord] = []
    gemini_lite: List[ModelRecord] = []
    gemini_pro_image: List[ModelRecord] = []
    gemini_flash_image: List[ModelRecord] = []
    imagen: List[ModelRecord] = []
    imagen_fast: List[ModelRecord] = []
    veo: List[ModelRecord] = []
    veo_fast: List[ModelRecord] = []
    lyria: List[ModelRecord] = []

    def get(self, name: str) -> Optional[ModelRecord]:
        """
        Iterates over all list fields in the instance to find a ModelRecord
        with the matching name
        """
        for _model_list in vars(self).values():
            if isinstance(_model_list, list):
                model_list = cast(list[ModelRecord], _model_list)
                for record in model_list:
                    if record.name == name:
                        return record
        return None


type FirestoreTimestamp = datetime.datetime


class GenApiDescription(BaseModel):
    url: str
    prompt: str
    preferred_model: str
    compatible_model_categories: List[ModelCategory]
    prompt_substitutions: List[Tuple[str, str]]


class ListGenApisOutput(BaseModel):
    error: Literal[False] = False
    gen_apis: List[GenApiDescription]
    models: ModelsInfo


class GenApiBaseInput(BaseModel, Generic[U]):
    session_id: str
    event_id: str
    model_override: Optional[str] = None
    prompt_override: Optional[str] = None
    values: Optional[U]


# Python only, do not recreate in companion .ts file
class GenApiBaseGenerateTask(Protocol, Generic[V, W]):
    def __call__(self, model: str, prompt: str, valid_input: V, output_schema: type[W]) -> Any: ...


class GenApiMeta(BaseModel):
    response_time: float
    model: str


class GenApiBaseOutput(BaseModel):
    error: Literal[False] = False
    meta: GenApiMeta = GenApiMeta(response_time=0, model="")


class ThinkingConfig(BaseModel):
    include_thoughts: bool = False
    thinking_budget: int | None = None


class Media(BaseModel):
    name: str | None = None
    file: str  # gcs uri or base64 inline data


class GeneratedImage(BaseModel):
    gcs_uri: str | None = None
    base64: str | None = None


class GeminiConfigBase(BaseModel):
    model: str | None = None
    language: str = "English"
    prompt: str
    system_instruction: str | None = None
    temperature: float | None = None
    top_p: float | None = None
    top_k: float | None = None
    candidate_count: int | None = None
    max_output_tokens: int | None = None
    stop_sequences: list[str] | None = None
    presence_penalty: float | None = None
    frequency_penalty: float | None = None
    seed: int | None = None
    thinking_config: ThinkingConfig = ThinkingConfig()


SafetyFilterLevel = Union[
    Literal["BLOCK_LOW_AND_ABOVE"],
    Literal["BLOCK_MEDIUM_AND_ABOVE"],
    Literal["BLOCK_ONLY_HIGH"],
    # Literal["BLOCK_NONE"], # allowlisted only
]

PersonGeneration = Union[
    Literal["DONT_ALLOW"],
    Literal["ALLOW_ADULT"],
    # Literal["ALLOW_ALL"], # allowlisted only
]


class JobsRunInput(BaseModel):
    firestore_query: str
    retries: int = 3


class JobsRunOutput(BaseModel):
    error: Literal[False] = False
    execution_name: str
    input: JobsRunInput


class JobsGetOutput(BaseModel):
    error: Literal[False] = False
    execution_name: str
    status: Union[Literal["queued"], Literal["running"], Literal["success"], Literal["error"]] = (
        "queued"
    )
    retries: int = 0


class JobsCancelOutput(BaseModel):
    error: Literal[False] = False
    execution_name: str


class WorkflowsRunInput(BaseModel):
    firestore_query: str
    retries: int = 3


class WorkflowsRunOutput(BaseModel):
    error: Literal[False] = False
    execution_name: str
    input: WorkflowsRunInput


class WorkflowsGetOutput(BaseModel):
    error: Literal[False] = False
    execution_name: str
    status: Union[Literal["queued"], Literal["running"], Literal["success"], Literal["error"]] = (
        "queued"
    )
    retries: int = 0


class WorkflowsCancelOutput(BaseModel):
    error: Literal[False] = False
    execution_name: str
