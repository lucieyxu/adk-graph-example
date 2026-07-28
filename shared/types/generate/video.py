from typing import Annotated, List, Literal, Union

from annotated_types import Len
from pydantic import BaseModel, Field
from shared.types.general import (
    PersonGeneration,
)


class VeoStyleReferenceImage(BaseModel):
    reference_type: Literal["STYLE"]
    image: str


class VeoAssetReferenceImage(BaseModel):
    reference_type: Literal["ASSET"]
    image: str


class GenerateVideoBaseInput(BaseModel):
    output_gcs_uri: str
    model: str | None = None
    number_of_videos: Literal[1] | Literal[2] = 1
    fps: Literal[24] = 24  # NOT sure why this is an option
    duration_seconds: Literal[8] = 8  # NOT sure why this is an option
    seed: int | None = None
    aspect_ratio: Union[Literal["9:16"], Literal["16:9"]] = "16:9"
    resolution: Union[Literal["720p"], Literal["1080p"]] = "720p"
    person_generation: PersonGeneration = "ALLOW_ADULT"
    pubsub_topic: str | None = None
    negative_prompt: str | None = None
    enhance_prompt: bool | None = True
    generate_audio: bool | None = False
    compression_quality: Union[Literal["OPTIMIZED"], Literal["LOSSLESS"]] = "OPTIMIZED"


class GenerateVideoWithText(GenerateVideoBaseInput):
    variant: Literal["WITH_TEXT"]
    prompt: str


class GenerateVideoWithReferenceImages(GenerateVideoBaseInput):
    variant: Literal["WITH_REFERENCE_IMAGES"]
    prompt: str | None = None
    reference_images: Union[
        Annotated[List[VeoStyleReferenceImage], Len(min_length=1, max_length=1)],
        Annotated[List[VeoAssetReferenceImage], Len(min_length=1, max_length=3)],
    ]


class GenerateVideoWithKeyframesInput(GenerateVideoBaseInput):
    variant: Literal["WITH_KEYFRAMES"]
    prompt: str | None = None
    first_frame: str
    last_frame: str | None = None


class GenerateExtendedVideoInput(GenerateVideoBaseInput):
    variant: Literal["EXTEND_VIDEO"]
    prompt: str | None = None
    video: str


GenerateVideoInput = Annotated[
    Union[
        GenerateVideoWithText,
        GenerateVideoWithReferenceImages,
        GenerateVideoWithKeyframesInput,
        GenerateExtendedVideoInput,
    ],
    Field(discriminator="variant"),
]


class GenerateVideoOutput(BaseModel):
    error: Literal[False] = False
    operation_name: str
    model: str


class GetVideoInput(BaseModel):
    operation_name: str
    model: str


class GetVideoOutput(BaseModel):
    error: Literal[False] = False
    operation_name: str
    gcs_uri: str | None = None
