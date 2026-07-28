# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

import io
from typing import Any, Dict

from flask import Blueprint, Response, jsonify, request, stream_with_context
from shared.py.components.storage import (
    bucket,
    generate_gcs_chunks,
    generate_signed_read_url,
    generate_signed_write_url,
    upload_file,
)
from shared.py.config import GCP_BUCKET_NAME
from shared.py.flask.decorators import ErrorWithHTTPCode, FlaskBaseEndpoint, FlaskTypedPostEndpoint
from shared.types.storage.read import (
    StorageRequestReadUrlInput,
    StorageRequestReadUrlOutput,
)
from shared.types.storage.write import (
    StorageRequestWriteUrlInput,
    StorageRequestWriteUrlOutput,
    StorageWriteOutput,
)

#
# - - - API Routes
#

storage_bp = Blueprint("storage", __name__)


# REQUEST signed upload url
@FlaskTypedPostEndpoint(
    blueprint=storage_bp,
    input_type=StorageRequestWriteUrlInput,
    output_type=StorageRequestWriteUrlOutput,
    path="/request-write-url",
)
def route_request_write(valid_data: StorageRequestWriteUrlInput):
    # ENSURE we are querying the expected bucket
    filepath = valid_data.gcs_uri.replace("gs://", "")
    bucket_name = filepath.split("/")[0]
    if not bucket_name == GCP_BUCKET_NAME:
        raise ErrorWithHTTPCode(message="Access denied", status_code=401)

    # GENERATE signed url
    object_path = filepath.replace(f"{GCP_BUCKET_NAME}/", "")
    signed_url = generate_signed_write_url(
        object_path=object_path, content_type=valid_data.content_type
    )

    output = StorageRequestWriteUrlOutput(
        gcs_uri=valid_data.gcs_uri, signed_url=signed_url, content_type=valid_data.content_type
    )

    return output, 200


# REQUEST signed download url
@FlaskTypedPostEndpoint(
    blueprint=storage_bp,
    input_type=StorageRequestReadUrlInput,
    output_type=StorageRequestReadUrlOutput,
    path="/request-read-url",
)
def route_request_read(valid_data: StorageRequestReadUrlInput):
    # ENSURE we are querying the expected bucket
    filepath = valid_data.gcs_uri.replace("gs://", "")
    bucket_name = filepath.split("/")[0]
    if not bucket_name == GCP_BUCKET_NAME:
        raise ErrorWithHTTPCode(message="Access denied", status_code=401)

    object_path = filepath.replace(f"{GCP_BUCKET_NAME}/", "")
    signed_url, content_type, size = generate_signed_read_url(object_path=object_path)

    output = StorageRequestReadUrlOutput(
        gcs_uri=valid_data.gcs_uri, signed_url=signed_url, content_type=content_type, size=size
    )

    return output, 200


# PROXY write requests to upload to the bucket
# for files less than 32 MB
@FlaskBaseEndpoint(
    blueprint=storage_bp,
    methods=["PUT"],
    path="/write/<path:filepath>",
)
def route_storage_write(data: Any, filepath: str):
    # ENSURE we are querying the expected bucket
    bucket_name = filepath.split("/")[0]
    if not bucket_name == GCP_BUCKET_NAME:
        raise ErrorWithHTTPCode(message="Access denied", status_code=401)

    # PARSE object path
    object_path = filepath.replace(f"{GCP_BUCKET_NAME}/", "")
    if object_path.startswith("/"):
        object_path = object_path[1:]

    # COLLECT all data from stream, and then upload to bucket
    stream_data = io.BytesIO(request.get_data())

    # PREPARE response metrics
    gcs_uri = f"gs://{GCP_BUCKET_NAME}/{object_path}"
    size = stream_data.getbuffer().nbytes
    content_type = request.content_type

    # UPLOAD the file
    upload_file(object_path=object_path, content_type=content_type, file_data=stream_data)

    output_typed = StorageWriteOutput(gcs_uri=gcs_uri, content_type=content_type, size=size)
    output: Dict[str, Any] = output_typed.model_dump()

    return jsonify(output), 201


# PROXY read requests to assets in the bucket
# with range request support for video seeking
@storage_bp.route("/read/<path:filepath>", methods=["GET"])
def route_storage_read(filepath: str):
    # ENSURE we are querying the expected bucket
    bucket_name = filepath.split("/")[0]
    if not bucket_name == GCP_BUCKET_NAME:
        raise ErrorWithHTTPCode(message="Access denied", status_code=401)

    # ENSURE file exists at location
    object_path = filepath.replace(f"{GCP_BUCKET_NAME}/", "")
    if object_path.startswith("/"):
        object_path = object_path[1:]
    blob = bucket.blob(object_path)  # type: ignore
    if not blob.exists():  # type: ignore
        raise ErrorWithHTTPCode(message="File not found", status_code=404)

    # GET blob metadata
    blob.reload()  # type: ignore
    file_size = blob.size
    content_type = blob.content_type or "application/octet-stream"  # type: ignore

    # ENSURE file size is available
    if file_size is None:
        raise ErrorWithHTTPCode(message="Unable to determine file size", status_code=401)

    # CHECK for range request
    range_header = request.headers.get("Range")

    if range_header:
        # PARSE range header (format: "bytes=start-end")
        byte_range = range_header.replace("bytes=", "").split("-")
        start: int = int(byte_range[0]) if byte_range[0] else 0
        end: int = int(byte_range[1]) if byte_range[1] else (file_size - 1)

        # ENSURE valid range
        if start >= file_size or end >= file_size or start > end:
            raise ErrorWithHTTPCode(message="Range not satisfiable", status_code=416)

        length = end - start + 1

        # DOWNLOAD only the requested byte range
        data = blob.download_as_bytes(start=start, end=end + 1)  # type: ignore

        return Response(
            data,
            headers={
                "Content-Type": content_type,
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(length),
            },
        ), 206

    else:
        # NO range request - stream entire file
        gen = generate_gcs_chunks(object_path)
        return Response(
            stream_with_context(gen),
            headers={
                "Content-Type": content_type,
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
            },
        ), 200
