import base64
import binascii
import re
from typing import Any

import google.genai.types as types
from google import genai
from shared.py.components.storage import mime_type_from_uri


# Gemini wrote this
# Trying to avoid a dependency on libmagic!
def get_mime_type_from_base64(b64_string: str) -> str | None:
    """
    Determines the MIME type of a file from its base64 encoded string
    by inspecting its "magic numbers".

    Args:
        b64_string: The base64 encoded string of the file. This can
                    optionally include a data URI header.

    Returns:
        The MIME type as a string (e.g., 'image/jpeg', 'application/msword'),
        or None if the type is not recognized or the input is invalid.
    """
    # Handle the common data URI scheme, if present.
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]

    try:
        # Decode a chunk of the base64 string. 4096 chars is ~3KB of data.
        # This is enough to check for signatures and internal strings in OOXML files.
        chunk = b64_string[:4096]
        # Add padding to the chunk if it's been cut off mid-quartet.
        padded_chunk = chunk + "=" * (-len(chunk) % 4)
        decoded_data = base64.b64decode(padded_chunk, validate=True)
    except (binascii.Error, ValueError):
        # Return None if the base64 string is invalid.
        return None

    # PDF
    if decoded_data.startswith(b"%PDF"):
        return "application/pdf"

    # Audio
    if decoded_data.startswith(b"ID3") or decoded_data.startswith(b"\xff\xfb"):
        return "audio/mpeg"  # .mp3
    if decoded_data.startswith(b"OggS"):
        return "audio/ogg"  # .ogg
    if decoded_data.startswith(b"fLaC"):
        return "audio/flac"  # .flac
    if decoded_data.startswith(b"\xff\xf1") or decoded_data.startswith(b"\xff\xf9"):
        return "audio/aac"  # .aac
    if decoded_data.startswith(b"MThd"):
        return "audio/midi"  # .mid
    if decoded_data.startswith(b"RIFF"):
        if decoded_data[8:12] == b"WAVE":
            return "audio/wav"  # .wav
        if decoded_data[8:12] == b"AVI ":
            return "video/x-msvideo"  # .avi
        if decoded_data[8:12] == b"WEBP":
            return "image/webp"  # .webp

    # Image
    if decoded_data.startswith(b"\x89PNG"):
        return "image/png"
    if decoded_data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if decoded_data.startswith(b"GIF87a") or decoded_data.startswith(b"GIF89a"):
        return "image/gif"
    if decoded_data.startswith(b"RIFF") and decoded_data[8:12] == b"WEBP":
        return "image/webp"
    if decoded_data.startswith(b"BM"):
        return "image/bmp"

    # Video
    if decoded_data[4:8] == b"ftyp":
        if decoded_data[8:10] == b"qt":
            return "video/quicktime"
        return "video/mp4"
    if decoded_data.startswith(b"RIFF") and decoded_data[8:12] == b"AVI ":
        return "video/x-msvideo"

    # Return None if no signature is matched
    return None


def process_image(data_str: str) -> types.Image | None:
    """Process an image string and create an Image object.

    Detects whether the image string is a GCS URI or base64 string
    and creates appropriate Image object.
    """
    if data_str.startswith("gs://"):
        mime_type = mime_type_from_uri(data_str)
        if not mime_type:
            return None
        return types.Image(gcs_uri=data_str, mime_type=mime_type)

    # Assume it's a base64-encoded string
    try:
        mime_type = get_mime_type_from_base64(data_str)
        bytes = base64.b64decode(data_str)
        return types.Image(image_bytes=bytes, mime_type=mime_type)
    except Exception as e:
        print(f"Error creating Image instance, invalid base64 image string: {str(e)}")
        return None


def process_video(data_str: str) -> types.Video | None:
    """Process a video string and create a Video object.

    Detects whether the image string is a GCS URI or base64 string
    and creates appropriate Video object.
    """
    if data_str.startswith("gs://"):
        mime_type = mime_type_from_uri(data_str)
        if not mime_type:
            return None
        return types.Video(uri=data_str, mime_type=mime_type)

    # Assume it's a base64-encoded string
    try:
        mime_type = get_mime_type_from_base64(data_str)
        bytes = base64.b64decode(data_str)
        return types.Video(video_bytes=bytes, mime_type=mime_type)
    except Exception as e:
        print(f"Error creating Video instance, invalid base64 video string: {str(e)}")
        return None


def process_file(data_str: str, display_name: str | None) -> types.Part | None:
    """Process a file string and create a File object.

    Detects whether the file string is a GCS URI or base64 string
    and creates appropriate FileData or Blob object.
    """
    if data_str.startswith("gs://"):
        mime_type = mime_type_from_uri(data_str)
        if not mime_type:
            return None
        file_data = types.FileData(
            display_name=display_name, file_uri=data_str, mime_type=mime_type
        )
        return types.Part(file_data=file_data)

    # Assume it's a base64-encoded string
    try:
        mime_type = get_mime_type_from_base64(data_str)
        bytes = base64.b64decode(data_str)
        return types.Part(inline_data=types.Blob(data=bytes, mime_type=mime_type))
    except Exception as e:
        print(f"Error creating Blob instance, invalid base64 data string: {str(e)}")
        return None


def to_snake(s: str):
    return re.sub(r"(?<!^)(?=[A-Z])", "_", s).lower()


def snake_case_dict(d: Any) -> Any:
    if isinstance(d, list):
        return [snake_case_dict(i) if isinstance(i, (dict, list)) else i for i in d]  # type: ignore
    return {
        to_snake(a): snake_case_dict(b) if isinstance(b, (dict, list)) else b for a, b in d.items()
    }


def genai_image_to_b64(image: genai.types.Image) -> str | None:
    if not image.image_bytes:
        return None
    return f"data:{image.mime_type};base64,{base64.b64encode(image.image_bytes).decode('utf-8')}"
