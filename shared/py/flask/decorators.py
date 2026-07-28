# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #


import functools
from typing import Any, Callable, Concatenate, List, ParamSpec, Tuple, Type, TypeVar

import requests
from flask import Blueprint, jsonify, request
from pydantic import BaseModel, TypeAdapter, ValidationError
from shared.py.components.auth import get_id_token
from shared.py.components.urls import urls
from shared.types.general import ApiError
from werkzeug.exceptions import RequestEntityTooLarge

P = ParamSpec("P")
InputT = TypeVar("InputT", bound=BaseModel)
OutputT = TypeVar("OutputT", bound=BaseModel)


class ErrorWithHTTPCode(Exception):
    status_code: int

    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def FlaskBaseEndpoint(
    blueprint: Blueprint,
    methods: List[str],
    *,
    path: str,
):
    """
    A decorator factor that wraps your API handler logic in a try except block, with the standard
    error object in the event of an exception.

    Makes no assumptions about methods, and performs no type checking on input or output.
    """

    def decorator(func: Callable[Concatenate[Any, P], Tuple[Any, int]]):
        @blueprint.route(path, methods=methods)
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs):
            if request.is_json:
                data = request.json
            else:
                data = None

            try:
                # PERFORM the internal functionality of the decorated function
                # with optional post data
                result, status_code = func(data, *args, **kwargs)

                return result, status_code

            except RequestEntityTooLarge as _:
                api_error = ApiError(
                    error=True,
                    input={},
                    message="Request payload too large, limit is 32mb. Use a signed URL to upload to the bucket directly",  # noqa: E501
                )
                return jsonify(api_error.model_dump()), 413

            except ErrorWithHTTPCode as e:
                api_error = ApiError(
                    error=True,
                    input=data,
                    message=f"Error in API Handler for route {path}: {e.message}",
                )
                print(e.message)
                return jsonify(api_error.model_dump()), e.status_code

            except Exception as e:
                message = f"Unexpected error in API Handler for route {path}: {str(e)}"
                api_error = ApiError(
                    error=True,
                    input=data,
                    message=message,
                )
                print(message)
                return jsonify(api_error.model_dump()), 500

        return wrapper

    return decorator


def FlaskTypedPostEndpoint(
    blueprint: Blueprint,
    input_type: Type[InputT],
    output_type: Type[OutputT],
    *,
    path: str,
):
    """
    A decorator factory for creating standard, type-safe API routes.

    It handles:
    - Route registration with Flask (POST only)
    - JSON parsing and validation into 'input_type'
    - Validation of the return value into 'output_type'
    - Success (200) and Error (400, 500) responses
    """

    def decorator(func: Callable[Concatenate[InputT, P], Any]):
        @blueprint.route(path, methods=["POST"])
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs):
            # REQUIRE data, all handlers are for POST requests
            data = request.json
            if data is None:
                api_error = ApiError(
                    error=True,
                    input=None,
                    message="Malformed input: No JSON data provided.",
                )
                return jsonify(api_error.model_dump()), 400

            try:
                # VALIDATE input
                input_adapter = TypeAdapter(input_type)
                valid_data = input_adapter.validate_python(data)

                # PERFORM the internal functionality of the decorated function
                result = func(valid_data, *args, **kwargs)

            except ValidationError as e:
                api_error = ApiError(
                    error=True,
                    input=data,
                    message=f"Malformed input: {e}",
                )
                return jsonify(api_error.model_dump()), 400

            except ErrorWithHTTPCode as e:
                api_error = ApiError(
                    error=True,
                    input=data,
                    message=f"Error in API Handler for route {path}: {e.message}",
                )
                print(e.message)
                return jsonify(api_error.model_dump()), e.status_code

            except Exception as e:
                message = f"Unexpected error in API Handler for route {path}: {str(e)}"
                api_error = ApiError(
                    error=True,
                    input=data,
                    message=message,
                )
                print(message)
                return jsonify(api_error.model_dump()), 500

            try:
                output_adapter = TypeAdapter(output_type)
                output = output_adapter.validate_python(result)
                return jsonify(output.model_dump()), 200

            except ValidationError as e:
                message = f"Malformed output within API Handler for route {path}: {e}"
                api_error = ApiError(
                    error=True,
                    input=data,
                    message=message,
                )
                print(message)
                return jsonify(api_error.model_dump()), 500

            except Exception as e:
                message = f"Unexpected error in API Handler for route {path}: {str(e)}"
                api_error = ApiError(
                    error=True,
                    input=data,
                    message=message,
                )
                print(message)
                return jsonify(api_error.model_dump()), 500

        return wrapper

    return decorator


def FlaskProxyPostEndpoint(blueprint: Blueprint, proxy_type: str):
    path = "/<path:subpath>"

    def decorator(func: Callable[Concatenate[str, int, P], str]):
        @blueprint.route(path, methods=["POST"])
        @functools.wraps(func)
        def wrapper(subpath: str, *args: P.args, **kwargs: P.kwargs):
            subpath_parts = subpath.split("/")
            proxy_name = subpath_parts[0].replace("-", "_").lower()  # "py-example" or "ts-example"
            request_path = "/".join(subpath_parts[1:])

            # REQUIRE data, all handlers are for POST requests
            data = request.json
            if data is None:
                api_error = ApiError(
                    error=True,
                    input=None,
                    message="Malformed input: No JSON data provided.",
                )
                return jsonify(api_error.model_dump()), 400

            try:
                host_url = urls.get(f"{proxy_type}_{proxy_name}")
                if not host_url:
                    raise Exception(
                        f"ERROR could not find matching url in url map, looking for {proxy_type} named {proxy_name}"  # noqa: E501
                    )

                id_token = get_id_token(host_url)

                headers = {
                    "Authorization": f"Bearer {id_token}",
                    "Content-Type": "application/json",
                }

                url = f"{host_url}/{request_path}" if not request_path == "" else host_url

                response = requests.post(
                    url=url,
                    headers=headers,
                    json=data if data else {},
                )

                response_json = response.json()
                response_code = response.status_code

                # PERFORM the internal functionality of the decorated function
                result_json = func(response_json, response_code, *args, **kwargs)

                return result_json, response_code

            except ErrorWithHTTPCode as e:
                api_error = ApiError(
                    error=True,
                    input=data,
                    message=f"Error in API Handler for route {path}: {e.message}",
                )
                print(e.message)
                return jsonify(api_error.model_dump()), e.status_code

            except Exception as e:
                message = f"Error proxying cloud run {proxy_type} {proxy_name}: {str(e)}"
                api_error = ApiError(
                    error=True,
                    input=data,
                    message=message,
                )
                print(message)
                return jsonify(api_error.model_dump()), 500

        return wrapper

    return decorator


def FlaskTypedGetEndpoint(
    blueprint: Blueprint,
    output_type: Type[OutputT],
    *,
    path: str,
):
    """
    A decorator factory for creating standard, type-safe API routes.

    It handles:
    - Route registration with Flask (GET only)
    - Validation of the return value into 'output_type'
    - Success (200) and Error (500) responses
    """

    def decorator(func: Callable[Concatenate[P], Any]):
        @blueprint.route(path, methods=["GET"])
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs):
            try:
                # PERFORM the internal functionality of the decorated function
                result = func(*args, **kwargs)

            except ErrorWithHTTPCode as e:
                api_error = ApiError(
                    error=True,
                    input=None,
                    message=f"Error in API Handler for route {path}: {e.message}",
                )
                print(e.message)
                return jsonify(api_error.model_dump()), e.status_code

            except Exception as e:
                message = f"Unexpected error in API Handler for route {path}: {str(e)}"
                api_error = ApiError(
                    error=True,
                    input=None,
                    message=message,
                )
                print(message)
                return jsonify(api_error.model_dump()), 500

            try:
                output_adapter = TypeAdapter(output_type)
                output = output_adapter.validate_python(result)
                return jsonify(output.model_dump()), 200

            except ValidationError as e:
                message = f"Malformed output within API Handler for route {path}: {e}"
                api_error = ApiError(error=True, input=None, message=message)
                return jsonify(api_error.model_dump()), 500

            except ErrorWithHTTPCode as e:
                api_error = ApiError(
                    error=True,
                    input=None,
                    message=f"Error in API Handler for route {path}: {e.message}",
                )
                print(e.message)
                return jsonify(api_error.model_dump()), e.status_code

            except Exception as e:
                message = f"Unexpected error in API Handler for route {path}: {str(e)}"
                api_error = ApiError(
                    error=True,
                    input=None,
                    message=message,
                )
                print(message)
                return jsonify(api_error.model_dump()), 500

        return wrapper

    return decorator
