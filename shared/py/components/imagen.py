# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

import google.genai as genai
import google.genai.types as types
from pydantic import TypeAdapter
from shared.py.components.models import DEFAULT_IMAGEN_MODEL, get_model_by_name
from shared.py.components.storage import gcs_uri_is_folder
from shared.py.components.utils import genai_image_to_b64, process_image
from shared.py.config import (
    GCP_LOCATION,
    GCP_PROJECT_ID,
)
from shared.types.generate.image import (
    GeneratedImage,
    GenerateEditedImageInput,
    GenerateImageInput,
    GenerateImageOutput,
    GenerateNewImageInput,
)

client_local = genai.Client(vertexai=True, project=GCP_PROJECT_ID, location=GCP_LOCATION)
client_global = genai.Client(vertexai=True, project=GCP_PROJECT_ID, location="global")

GenerateImageInputAdapter: TypeAdapter[GenerateImageInput] = TypeAdapter(GenerateImageInput)


# GENERATE new image from input image and prompt
def generate_image(data: GenerateNewImageInput) -> GenerateImageOutput:
    if data.output_gcs_uri and not gcs_uri_is_folder(data.output_gcs_uri):
        raise Exception("Gemini ERROR: output_gcs_uri must be a directory, not a filename")

    config = types.GenerateImagesConfig(
        add_watermark=True,
        include_rai_reason=True,
        include_safety_attributes=True,
        output_gcs_uri=data.output_gcs_uri,
        language=types.ImagePromptLanguage(data.language),
        number_of_images=data.number_of_images,
        output_mime_type=data.output_mime_type,
        safety_filter_level=types.SafetyFilterLevel(data.safety_filter_level),
        person_generation=types.PersonGeneration(data.person_generation),
        negative_prompt=data.negative_prompt,
        seed=data.seed,
        guidance_scale=data.guidance_scale,
        output_compression_quality=data.output_compression_quality,
        enhance_prompt=data.enhance_prompt,
        aspect_ratio=data.aspect_ratio,
    )

    # SWITCH between regional client & global client, as required for non-GA models
    m = data.model or DEFAULT_IMAGEN_MODEL
    model_record = get_model_by_name(m)
    c = client_local if model_record and model_record.ga else client_global

    response = c.models.generate_images(
        model=m,
        prompt=data.prompt,
        config=config,
    )

    if not response.images or len(response.images) == 0:
        raise Exception("Imagen returned an empty set of images")

    images = [
        GeneratedImage(
            gcs_uri=image.gcs_uri,
            base64=genai_image_to_b64(image) if image.image_bytes else None,
        )
        for image in response.images  # iterate over all images
        if image  # filter to only valid images
    ]

    if len(images) == 0:
        raise Exception("Imagen returned an empty set of images")

    return GenerateImageOutput(error=False, images=images)


# GENERATE edited image from input image and prompt
def edit_image(data: GenerateEditedImageInput) -> GenerateImageOutput:
    config = types.EditImageConfig(
        add_watermark=False,  # Not supported for image editing
        include_rai_reason=True,
        include_safety_attributes=True,
        output_gcs_uri=data.output_gcs_uri,
        language=types.ImagePromptLanguage(data.language),
        number_of_images=data.number_of_images,
        output_mime_type=data.output_mime_type,
        safety_filter_level=types.SafetyFilterLevel(data.safety_filter_level),
        person_generation=types.PersonGeneration(data.person_generation),
        negative_prompt=data.negative_prompt,
        seed=data.seed,
        guidance_scale=data.guidance_scale,
        output_compression_quality=data.output_compression_quality,
        edit_mode=types.EditMode(data.edit_mode),
        base_steps=data.base_steps,
        aspect_ratio=data.aspect_ratio,
    )

    ref_image = process_image(data.input_image)
    ref_images = [types.RawReferenceImage(reference_image=ref_image, reference_id=0)]

    # SWITCH between regional client & global client, as required for non-GA models
    m = data.model or DEFAULT_IMAGEN_MODEL
    model_record = get_model_by_name(m)
    c = client_local if model_record and model_record.ga else client_global

    response = c.models.edit_image(
        model=m,
        prompt=data.prompt,
        config=config,
        reference_images=ref_images,  # type: ignore
    )

    if not response.generated_images or len(response.generated_images) == 0:
        raise Exception("Imagen returned an empty set of images")

    images = [
        GeneratedImage(
            gcs_uri=i.image.gcs_uri,
            base64=genai_image_to_b64(i.image) if i.image.image_bytes else None,
        )
        for i in response.generated_images  # iterate over all images
        if i and i.image  # filter to only valid images
    ]

    if len(images) == 0:
        raise Exception("Imagen returned an empty set of images")

    return GenerateImageOutput(
        error=False,
        images=images,
    )
