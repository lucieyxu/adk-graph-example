# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #


import io
import re
from datetime import timedelta

from google.cloud import storage  # type: ignore
from shared.py.components.auth import get_creds, get_token
from shared.py.config import GCP_BUCKET_NAME, GCP_PROJECT_ID, GCP_SERVICE_ACCOUNT

storage_client = storage.Client(project=GCP_PROJECT_ID, credentials=get_creds())
bucket = storage_client.get_bucket(GCP_BUCKET_NAME)  # type: ignore


def gcs_uri_is_folder(uri: str):
    parts = uri[len("gs://") :].split("/")
    filename = parts[len(parts) - 1] if len(parts) > 0 else parts[0]
    pattern = r"[a-zA-Z0-9]+\.[a-zA-Z0-9]+"
    if re.search(pattern, filename):
        # FOUND presumed file extension
        return False
    else:
        # NO presumed file extension, is directory
        return True


def mime_type_from_uri(uri: str):
    parts = uri[len("gs://") :].split("/", 1)
    bucket_name = parts[0]
    object_name = parts[1]
    if not bucket_name == GCP_BUCKET_NAME:
        return None
    blob = bucket.blob(object_name)  # type: ignore
    blob.reload()  # type: ignore
    mime_type = blob.content_type
    return mime_type


def generate_gcs_chunks(blob_name: str):
    """
    Downloads a blob to a stream and yields chunks.
    """
    blob = bucket.blob(blob_name)  # type: ignore
    file_buffer = io.BytesIO()
    blob.download_to_file(file_buffer)  # type: ignore
    file_buffer.seek(0)
    chunk_size = 4096
    while True:
        chunk = file_buffer.read(chunk_size)
        if not chunk:
            break
        yield chunk


def generate_signed_read_url(object_path: str, expiration_time: int = 60):
    """
    Generate a signed read url for an object in the default bucket

    @param: object_path: str, a filepath type string from the root level of the bucket to the object
    itself, including the file extension

    @param: expiration_time: int, Optional, expiration time in minutes that the signed url is valid
    """

    # GET blob
    object_path_clean = object_path
    if object_path_clean.startswith("/"):
        object_path_clean = object_path_clean[1:]
    blob = bucket.blob(object_path_clean)  # type: ignore

    expiration_time_delta = timedelta(minutes=expiration_time)

    # Generate the signed URL for a GET (download) request
    signed_url = blob.generate_signed_url(  # type: ignore
        expiration=expiration_time_delta,
        method="GET",
        service_account_email=GCP_SERVICE_ACCOUNT,
        access_token=get_token(),
    )

    content_type = blob.content_type

    size = blob.size or 0

    return signed_url, content_type, size


def generate_signed_write_url(object_path: str, content_type: str, expiration_time: int = 60):
    """
    Generate a signed write url for an object in the default bucket

    @param: object_path: str, a filepath type string from the root level of the bucket to the object
    itself, including the file extension

    @param: expiration_time: int, Optional, expiration time in minutes that the signed url is valid
    """

    # GET blob
    object_path_clean = object_path
    if object_path_clean.startswith("/"):
        object_path_clean = object_path_clean[1:]
    blob = bucket.blob(object_path_clean)  # type: ignore

    expiration_time_delta = timedelta(minutes=expiration_time)

    # Generate the signed URL for a PUT (upload) request
    signed_url = blob.generate_signed_url(  # type: ignore
        expiration=expiration_time_delta,
        method="PUT",
        content_type=content_type,
        service_account_email=GCP_SERVICE_ACCOUNT,
        access_token=get_token(),
    )

    return signed_url


def upload_file(object_path: str, content_type: str, file_data: io.BytesIO | bytes | str | None):
    """
    Upload helper function to simply upload a file like object to a provided path in the standard
    bucket.
    """
    try:
        # GUARD against a non-expected bucket
        if object_path.startswith("gs://") and GCP_BUCKET_NAME not in object_path:
            raise Exception("Specified bucket that is not standard bucket for this environment")

        # REMOVE protocol and bucket if GCS URI is provided
        object_path_safe = object_path.replace(f"gs://{GCP_BUCKET_NAME}/", "")

        blob = bucket.blob(object_path_safe)  # type: ignore

        if isinstance(file_data, io.BytesIO):
            file_data_bytesio = file_data
        elif isinstance(file_data, bytes):
            file_data_bytesio = io.BytesIO(file_data)
        elif isinstance(file_data, str):
            encoded = file_data.encode("utf-8")
            file_data_bytesio = io.BytesIO(encoded)
        else:
            raise Exception(
                "Storage: ERROR uploading file, file_data is not of expected type:", file_data
            )

        blob.upload_from_file(file_obj=file_data_bytesio, content_type=content_type)  # type: ignore
        return f"gs://{GCP_BUCKET_NAME}/{blob.name}"  # type: ignore

    except Exception as e:
        message = f"Error uploading file {object_path}: {e}"
        print(message)
        return message


def download_file(object_path: str, file_path: str | None = None) -> None | bytes:
    """
    Upload helper function to simply upload a file like object to a provided path in the standard
    bucket.

    object_path: the path to the file in the bucket
    file_path: [Optional] the file path on local disk to write the file to
    """

    try:
        # GUARD against a non-expected bucket
        if object_path.startswith("gs://") and GCP_BUCKET_NAME not in object_path:
            raise Exception("Specified bucket that is not standard bucket for this environment")

        # REMOVE protocol and bucket if GCS URI is provided
        object_path_safe = object_path.replace(f"gs://{GCP_BUCKET_NAME}/", "")

        blob = bucket.blob(object_path_safe)  # type: ignore

        if file_path:
            blob.download_to_filename(filename=file_path)  # type: ignore
        else:
            data = blob.download_as_bytes()  # type: ignore
            return data
    except Exception as e:
        print(f"Error downloading file {object_path}: {e}")
        return None
