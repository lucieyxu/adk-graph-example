# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

from typing import List, Union
from uuid import uuid4

import google.genai as genai
import google.genai.types as types
from pydantic import TypeAdapter
from shared.py.components.models import DEFAULT_GEMINI_FLASH_MODEL, get_model_by_name
from shared.py.components.storage import gcs_uri_is_folder, upload_file
from shared.py.components.utils import genai_image_to_b64, process_file
from shared.py.config import (
    GCP_LOCATION,
    GCP_PROJECT_ID,
    GEMINI_SAFETY_SETTINGS,
)
from shared.types.general import GeneratedImage
from shared.types.generate.image import (
    GenerateGeminiImageInput,
    GenerateGeminiImageSimpleInput,
    GenerateGeminiImageWithMediaInput,
    GenerateImageOutput,
)
from shared.types.generate.json import (
    GenerateJsonInput,
    GenerateJsonSimpleInput,
    GenerateJsonSimpleSerializedInput,
    GenerateJsonWithMediaInput,
    GenerateJsonWithMediaSerializedInput,
    T,
)
from shared.types.generate.text import (
    GenerateTextInput,
    GenerateTextSimpleInput,
    GenerateTextWithMediaInput,
)

client_local = genai.Client(vertexai=True, project=GCP_PROJECT_ID, location=GCP_LOCATION)
client_global = genai.Client(vertexai=True, project=GCP_PROJECT_ID, location="global")

GenerateAllInput = Union[
    GenerateTextSimpleInput,
    GenerateTextWithMediaInput,
    GenerateJsonSimpleSerializedInput,
    GenerateJsonWithMediaSerializedInput,
    GenerateJsonSimpleInput[T],
    GenerateJsonWithMediaInput[T],
    GenerateGeminiImageSimpleInput,
    GenerateGeminiImageWithMediaInput,
    #
    # ADD any other types that use standard Gemini config here
    #
]
GenerateAllInputAdapter: TypeAdapter[GenerateAllInput] = TypeAdapter(GenerateAllInput)  # type: ignore

GenerateTextInputAdapter: TypeAdapter[GenerateTextInput] = TypeAdapter(GenerateTextInput)
GenerateJsonInputAdapter: TypeAdapter[GenerateJsonInput] = TypeAdapter(GenerateJsonInput)


def config_helper(data: GenerateAllInput) -> types.GenerateContentConfig:  # type: ignore
    language_snippet = f"Your response must be in {data.language}."
    config = types.GenerateContentConfig(
        safety_settings=GEMINI_SAFETY_SETTINGS,
        temperature=data.temperature,
        system_instruction=(
            f"{data.system_instruction}\n\n{language_snippet}"
            if data.system_instruction
            else language_snippet
        ),
        top_p=data.top_p,
        top_k=data.top_k,
        candidate_count=data.candidate_count,
        max_output_tokens=data.max_output_tokens,
        stop_sequences=data.stop_sequences,
        presence_penalty=data.presence_penalty,
        frequency_penalty=data.frequency_penalty,
        seed=data.seed,
        thinking_config=types.ThinkingConfig(
            include_thoughts=data.thinking_config.include_thoughts,
            thinking_budget=data.thinking_config.thinking_budget,
        )
        if data.thinking_config
        else None,
    )
    return config


def generate_text_simple(data: GenerateTextSimpleInput):
    config = config_helper(data)
    parts = [types.Part(text=data.prompt)]
    contents = types.Content(parts=parts, role="user")

    # SWITCH between regional client & global client, as required for non-GA models
    m = data.model or DEFAULT_GEMINI_FLASH_MODEL
    model_record = get_model_by_name(m)
    c = client_local if model_record and model_record.ga else client_global

    result = c.models.generate_content(  # type: ignore
        model=m,
        contents=contents,
        config=config,
    )

    if not result.text or result.text == "":
        raise Exception("Gemini returned an empty response")

    return result.text


def generate_text_with_media(data: GenerateTextWithMediaInput):
    config = config_helper(data)

    # NORMALIZE all inputs as GCS URIs or Base64 inline data
    media = [process_file(data_str=m.file, display_name=m.name) for m in data.media]
    media = [m for m in media if m]

    # COMBINE prompt and media assets
    parts = [types.Part(text=data.prompt)]
    parts.extend(media)
    contents = types.Content(parts=parts, role="user")

    # SWITCH between regional client & global client, as required for non-GA models
    m = data.model or DEFAULT_GEMINI_FLASH_MODEL
    model_record = get_model_by_name(m)
    c = client_local if model_record and model_record.ga else client_global

    result = c.models.generate_content(  # type: ignore
        model=m,
        contents=contents,
        config=config,
    )

    if not result.text or result.text == "":
        raise Exception("Gemini returned an empty response")

    return result.text


def generate_json_simple(data: GenerateJsonSimpleInput[T]) -> T:
    # VALIDATE that specified schema is parsable by pydantic
    adapter = TypeAdapter(data.response_schema)

    # CREATE config object
    config = config_helper(data)
    config.response_json_schema = data.response_schema.model_json_schema()
    config.response_mime_type = data.response_mime_type

    parts = [types.Part(text=data.prompt)]
    contents = types.Content(parts=parts, role="user")

    # SWITCH between regional client & global client, as required for non-GA models
    m = data.model or DEFAULT_GEMINI_FLASH_MODEL
    model_record = get_model_by_name(m)
    c = client_local if model_record and model_record.ga else client_global

    result = c.models.generate_content(  # type: ignore
        model=m,
        contents=contents,
        config=config,
    )

    # VALIDATE output conforms to specified schema, an error here will raise an exception that
    # should be caught in the calling method
    valid_output = adapter.validate_python(result.model_dump()["parsed"])
    valid_output_dict = valid_output.model_dump()

    if not result.parsed or not valid_output_dict or len(valid_output_dict) == 0:
        raise Exception("Gemini returned an empty response")

    return valid_output


def generate_json_with_media(data: GenerateJsonWithMediaInput[T]):
    # VALIDATE that specified schema is parsable by pydantic
    adapter = TypeAdapter(data.response_schema)

    # CREATE config object
    config = config_helper(data)
    config.response_json_schema = data.response_schema.model_json_schema()
    config.response_mime_type = data.response_mime_type

    # NORMALIZE all inputs as GCS URIs or Base64 inline data
    media = [process_file(data_str=m.file, display_name=m.name) for m in data.media]
    media = [m for m in media if m]

    # COMBINE prompt and media assets
    parts = [types.Part(text=data.prompt)]
    parts.extend(media)
    contents = types.Content(parts=parts, role="user")

    # SWITCH between regional client & global client, as required for non-GA models
    m = data.model or DEFAULT_GEMINI_FLASH_MODEL
    model_record = get_model_by_name(m)
    c = client_local if model_record and model_record.ga else client_global

    result = c.models.generate_content(  # type: ignore
        model=m,
        contents=contents,
        config=config,
    )

    # VALIDATE output conforms to specified schema, an error here will raise an exception that
    # should be caught in the calling method
    valid_output = adapter.validate_python(result.model_dump()["parsed"])
    valid_output_dict = valid_output.model_dump()

    if not result.parsed or not valid_output_dict or len(valid_output_dict) == 0:
        raise Exception("Gemini returned an empty response")

    return valid_output


def generate_gemini_image(data: GenerateGeminiImageInput) -> GenerateImageOutput:
    if data.output_gcs_uri and not gcs_uri_is_folder(data.output_gcs_uri):
        raise Exception("Gemini ERROR: output_gcs_uri must be a directory, not a filename")

    config = config_helper(data)
    config.image_config = types.ImageConfig(
        aspect_ratio=data.aspect_ratio,
        image_size=data.image_size,
    )

    parts = [types.Part(text=data.prompt)]
    contents = types.Content(parts=parts, role="user")

    # SWITCH between regional client & global client, as required for non-GA models
    m = data.model or DEFAULT_GEMINI_FLASH_MODEL
    model_record = get_model_by_name(m)
    c = client_local if model_record and model_record.ga else client_global

    result = c.models.generate_content(  # type: ignore
        model=m,
        contents=contents,
        config=config,
    )

    # EXTRACT generated images from response
    images_bytes: List[genai.types.Image] = []
    if result.parts:
        for result_part in result.parts:
            if result_part.inline_data is not None:
                i = result_part.inline_data.as_image()
                if i:
                    images_bytes.append(i)

    images: list[GeneratedImage] = []
    invocation_uuid = uuid4()
    for i, image in enumerate(images_bytes):
        if not image.mime_type:
            # GUARD against missing mime type
            print("Gemini: ERROR generating image, model did not return content mime_type")

        elif data.output_gcs_uri:
            # UPLOAD to GCS if output folder is specified
            file_extension = "jpg" if image.mime_type and image.mime_type.endswith("jpg") else "png"

            # ENSURE no double slashes, creates a folder named "/"
            uri = data.output_gcs_uri
            if data.output_gcs_uri.endswith("/"):
                uri = data.output_gcs_uri[:-1]
            object_path = f"{uri}/{invocation_uuid}_{i}.{file_extension}"

            uri = upload_file(
                object_path=object_path, content_type=image.mime_type, file_data=image.image_bytes
            )
            if uri:
                images.append(GeneratedImage(gcs_uri=uri))
            else:
                print("Gemini: ERROR generating image, failed to upload to specified GCS path")

        elif image.image_bytes:
            # RETURN inline base64 data
            images.append(GeneratedImage(base64=genai_image_to_b64(image)))

        else:
            print("Gemini: ERROR generating image, failed to upload to specified GCS path")

    if len(images) == 0:
        raise Exception("Gemini ERROR: failed to generate any images")

    response = GenerateImageOutput(images=images)

    return response


def edit_gemini_image(data: GenerateGeminiImageWithMediaInput) -> GenerateImageOutput:
    config = config_helper(data)
    config.image_config = types.ImageConfig(
        aspect_ratio=data.aspect_ratio,
        image_size=data.image_size,
    )

    # NORMALIZE all inputs as GCS URIs or Base64 inline data
    media = [process_file(data_str=m.file, display_name=m.name) for m in data.media]
    media = [m for m in media if m]

    # COMBINE prompt and media assets
    parts = [types.Part(text=data.prompt)]
    parts.extend(media)
    contents = types.Content(parts=parts, role="user")

    # SWITCH between regional client & global client, as required for non-GA models
    m = data.model or DEFAULT_GEMINI_FLASH_MODEL
    model_record = get_model_by_name(m)
    c = client_local if model_record and model_record.ga else client_global

    result = c.models.generate_content(  # type: ignore
        model=m,
        contents=contents,
        config=config,
    )

    # EXTRACT generated images from response
    images_bytes: List[genai.types.Image] = []
    if result.parts:
        for result_part in result.parts:
            if result_part.inline_data is not None:
                i = result_part.inline_data.as_image()
                if i:
                    images_bytes.append(i)

    images: list[GeneratedImage] = []
    invocation_uuid = uuid4()
    for i, image in enumerate(images_bytes):
        if not image.mime_type:
            # GUARD against missing mime type
            print("Gemini: ERROR generating image, model did not return content mime_type")

        elif data.output_gcs_uri:
            # UPLOAD to GCS if output folder is specified
            file_extension = "jpg" if image.mime_type and image.mime_type.endswith("jpg") else "png"

            # ENSURE no double slashes, creates a folder named "/"
            uri = data.output_gcs_uri
            if data.output_gcs_uri.endswith("/"):
                uri = data.output_gcs_uri[:-1]
            object_path = f"{uri}/{invocation_uuid}_{i}.{file_extension}"

            uri = upload_file(
                object_path=object_path, content_type=image.mime_type, file_data=image.image_bytes
            )
            if uri:
                images.append(GeneratedImage(gcs_uri=uri))
            else:
                print("Gemini: ERROR generating image, failed to upload to specified GCS path")

        elif image.image_bytes:
            # RETURN inline base64 data
            images.append(GeneratedImage(base64=genai_image_to_b64(image)))

        else:
            print("Gemini: ERROR generating image, failed to upload to specified GCS path")

    if len(images) == 0:
        raise Exception("Gemini ERROR: failed to generate any images")

    response = GenerateImageOutput(images=images)

    return response
