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
from shared.py.components.models import DEFAULT_VEO_MODEL, get_model_by_name
from shared.py.components.utils import process_image, process_video
from shared.py.config import GCP_LOCATION, GCP_PROJECT_ID
from shared.types.generate.video import (
    GenerateExtendedVideoInput,
    GenerateVideoInput,
    GenerateVideoOutput,
    GenerateVideoWithKeyframesInput,
    GenerateVideoWithReferenceImages,
    GenerateVideoWithText,
    GetVideoInput,
    GetVideoOutput,
)

client_local = genai.Client(vertexai=True, project=GCP_PROJECT_ID, location=GCP_LOCATION)
client_global = genai.Client(vertexai=True, project=GCP_PROJECT_ID, location="global")

GenerateVideoInputAdapter: TypeAdapter[GenerateVideoInput] = TypeAdapter(GenerateVideoInput)
GetVideoInputAdapter = TypeAdapter(GetVideoInput)


def generate_video_with_text(
    data: GenerateVideoWithText,
) -> GenerateVideoOutput:
    # SWITCH between regional client & global client, as required for non-GA models
    m = data.model or DEFAULT_VEO_MODEL
    model_record = get_model_by_name(m)
    c = client_local if model_record and model_record.ga else client_global

    operation = c.models.generate_videos(
        model=m,
        prompt=data.prompt,
        config=types.GenerateVideosConfig(
            output_gcs_uri=data.output_gcs_uri,
            fps=data.fps,
            duration_seconds=data.duration_seconds,
            seed=data.seed,
            aspect_ratio=data.aspect_ratio,
            resolution=data.resolution,
            person_generation=data.person_generation,
            pubsub_topic=data.pubsub_topic,
            negative_prompt=data.negative_prompt,
            enhance_prompt=data.enhance_prompt,
            generate_audio=data.generate_audio,
            compression_quality=types.VideoCompressionQuality(data.compression_quality),
        ),
    )

    if not operation.name:
        raise Exception("Veo returned an empty operation name")

    return GenerateVideoOutput(operation_name=operation.name, model=m)


def generate_video_with_keyframes(
    data: GenerateVideoWithKeyframesInput,
) -> GenerateVideoOutput:
    # SWITCH between regional client & global client, as required for non-GA models
    m = data.model or DEFAULT_VEO_MODEL
    model_record = get_model_by_name(m)
    c = client_local if model_record and model_record.ga else client_global

    operation = c.models.generate_videos(
        model=m,
        prompt=data.prompt,
        image=process_image(data.first_frame),
        config=types.GenerateVideosConfig(
            output_gcs_uri=data.output_gcs_uri,
            fps=data.fps,
            duration_seconds=data.duration_seconds,
            seed=data.seed,
            aspect_ratio=data.aspect_ratio,
            resolution=data.resolution,
            person_generation=data.person_generation,
            pubsub_topic=data.pubsub_topic,
            negative_prompt=data.negative_prompt,
            enhance_prompt=data.enhance_prompt,
            generate_audio=data.generate_audio,
            compression_quality=types.VideoCompressionQuality(data.compression_quality),
            last_frame=process_image(data.last_frame) if data.last_frame else None,
        ),
    )

    if not operation.name:
        raise Exception("Veo returned an empty operation name")

    return GenerateVideoOutput(operation_name=operation.name, model=m)


def generate_video_with_reference_images(
    data: GenerateVideoWithReferenceImages,
) -> GenerateVideoOutput:
    # SWITCH between regional client & global client, as required for non-GA models
    m = data.model or DEFAULT_VEO_MODEL
    model_record = get_model_by_name(m)
    c = client_local if model_record and model_record.ga else client_global

    operation = c.models.generate_videos(
        model=m,
        prompt=data.prompt,
        config=types.GenerateVideosConfig(
            output_gcs_uri=data.output_gcs_uri,
            fps=data.fps,
            duration_seconds=data.duration_seconds,
            seed=data.seed,
            aspect_ratio=data.aspect_ratio,
            resolution=data.resolution,
            person_generation=data.person_generation,
            pubsub_topic=data.pubsub_topic,
            negative_prompt=data.negative_prompt,
            enhance_prompt=data.enhance_prompt,
            generate_audio=data.generate_audio,
            compression_quality=types.VideoCompressionQuality(data.compression_quality),
            reference_images=[
                types.VideoGenerationReferenceImage(
                    image=process_image(i.image),
                    reference_type=types.VideoGenerationReferenceType(i.reference_type),
                )
                for i in data.reference_images
            ],
        ),
    )

    if not operation.name:
        raise Exception("Veo returned an empty operation name")

    return GenerateVideoOutput(operation_name=operation.name, model=m)


def generate_extended_video(
    data: GenerateExtendedVideoInput,
) -> GenerateVideoOutput:
    # SWITCH between regional client & global client, as required for non-GA models
    m = data.model or DEFAULT_VEO_MODEL
    model_record = get_model_by_name(m)
    c = client_local if model_record and model_record.ga else client_global

    operation = c.models.generate_videos(
        model=m,
        prompt=data.prompt,
        video=process_video(data.video),
        config=types.GenerateVideosConfig(
            output_gcs_uri=data.output_gcs_uri,
            fps=data.fps,
            duration_seconds=data.duration_seconds,
            seed=data.seed,
            aspect_ratio=data.aspect_ratio,
            resolution=data.resolution,
            person_generation=data.person_generation,
            pubsub_topic=data.pubsub_topic,
            negative_prompt=data.negative_prompt,
            enhance_prompt=data.enhance_prompt,
            generate_audio=data.generate_audio,
            compression_quality=types.VideoCompressionQuality(data.compression_quality),
        ),
    )

    if not operation.name:
        raise Exception("Veo returned an empty operation name")

    return GenerateVideoOutput(operation_name=operation.name, model=m)


def get_video(data: GetVideoInput) -> GetVideoOutput:
    # SWITCH between regional client & global client, as required for non-GA models
    m = data.model or DEFAULT_VEO_MODEL
    model_record = get_model_by_name(m)
    c = client_local if model_record and model_record.ga else client_global

    operation = c.operations.get(
        types.GenerateVideosOperation(name=data.operation_name)  # type: ignore
    )

    if not operation.done:
        return GetVideoOutput(operation_name=data.operation_name)

    if operation.error:
        raise Exception(operation.error["message"])

    if (
        not operation.response
        or not operation.response.generated_videos
        or len(operation.response.generated_videos) == 0
        or not operation.response.generated_videos[0].video
        or not operation.response.generated_videos[0].video.uri
    ):
        raise Exception("Veo returned an empty set of videos")

    return GetVideoOutput(
        operation_name=data.operation_name,
        gcs_uri=operation.response.generated_videos[0].video.uri,
    )
