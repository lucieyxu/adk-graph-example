from typing import Annotated, List, Literal, Union

from pydantic import BaseModel, Field
from shared.types.general import (
    GeminiConfigBase,
    GeneratedImage,
    Media,
    PersonGeneration,
    SafetyFilterLevel,
)

ImageResolution = Union[Literal["1k"], Literal["2k"]]

ImageEditMode = Union[
    Literal["EDIT_MODE_DEFAULT"],
    Literal["EDIT_MODE_INPAINT_REMOVAL"],
    Literal["EDIT_MODE_INPAINT_INSERTION"],
    Literal["EDIT_MODE_OUTPAINT"],
    Literal["EDIT_MODE_CONTROLLED_EDITING"],
    Literal["EDIT_MODE_STYLE"],
    Literal["EDIT_MODE_BGSWAP"],
    Literal["EDIT_MODE_PRODUCT_IMAGE"],
]

ImagenLanguage = Union[
    Literal["en"],
    Literal["ja"],
    Literal["ko"],
    Literal["hi"],
    Literal["zh"],
    Literal["pt"],
    Literal["es"],
]

AspectRatio = Union[
    Literal["1:1"], Literal["3:4"], Literal["4:3"], Literal["9:16"], Literal["16:9"]
]

ImageSize = Union[
    Literal["1K"],
    Literal["2K"],
    Literal["4K"],
]


class GenerateImageBaseInput(BaseModel):
    model: str | None = None
    prompt: str = ""
    output_gcs_uri: str | None = None
    language: ImagenLanguage = "en"
    number_of_images: int = 1
    output_mime_type: Union[Literal["image/jpeg"], Literal["image/png"]] = "image/jpeg"
    safety_filter_level: SafetyFilterLevel = "BLOCK_ONLY_HIGH"
    person_generation: PersonGeneration = "ALLOW_ADULT"
    negative_prompt: str | None = None
    seed: int | None = None
    guidance_scale: float | None = None
    output_compression_quality: int | None = None


class GenerateNewImageInput(GenerateImageBaseInput):
    variant: Literal["NEW"] = "NEW"
    enhance_prompt: bool = False
    aspect_ratio: AspectRatio = "1:1"


class GenerateEditedImageInput(GenerateImageBaseInput):
    variant: Literal["EDIT"] = "EDIT"
    input_image: str = ""
    edit_mode: ImageEditMode = "EDIT_MODE_DEFAULT"
    base_steps: int | None = None
    aspect_ratio: AspectRatio | None = None


GenerateImageInput = Annotated[
    Union[GenerateNewImageInput, GenerateEditedImageInput],
    Field(discriminator="variant"),
]


class GenerateImageOutput(BaseModel):
    error: Literal[False] = False
    images: list[GeneratedImage] = []


class GenerateGeminiImageSimpleInput(GeminiConfigBase):
    variant: Literal["SIMPLE"] = "SIMPLE"
    response_modalities: Literal["IMAGE"] = "IMAGE"
    output_gcs_uri: str | None = None
    aspect_ratio: AspectRatio = "1:1"
    image_size: ImageSize = "1K"
    # NOT supported as of Dec 2025
    # output_mime_type: Union[Literal["image/jpeg"], Literal["image/png"]] = "image/jpeg"
    # output_compression_quality: int | None = None


class GenerateGeminiImageWithMediaInput(GeminiConfigBase):
    variant: Literal["WITH_MEDIA"] = "WITH_MEDIA"
    response_modalities: Literal["IMAGE"] = "IMAGE"
    media: List[Media]
    output_gcs_uri: str | None = None
    aspect_ratio: AspectRatio | None = None
    image_size: ImageSize = "1K"
    # NOT supported as of Dec 2025
    # output_mime_type: Union[Literal["image/jpeg"], Literal["image/png"]] = "image/jpeg"
    # output_compression_quality: int | None = None


GenerateGeminiImageInput = Annotated[
    Union[GenerateGeminiImageSimpleInput, GenerateGeminiImageWithMediaInput],
    Field(discriminator="variant"),
]
