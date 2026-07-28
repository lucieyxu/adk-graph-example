import json
import urllib.error
from typing import Any, Optional, Union
from urllib.request import Request, urlopen

from shared.py.components.auth import get_token


def fetch(
    url: str,
    payload: Optional[dict[str, Any]] = None,
    headers: Optional[dict[str, str]] = None,
    method: str = "POST",
) -> Union[dict[str, Any], bytes, None]:
    """
    Executes an authenticated HTTP request using a bearer token.

    This function automatically retrieves an authentication token, injects it into the
    headers, and handles JSON serialization/deserialization. It is designed to fail
    gracefully by printing errors and returning None, rather than raising exceptions.

    Args:
        url (str): The full target URL (e.g., "https://api.example.com/v1/resource").
        payload (Optional[dict[str, Any]]): A dictionary of data to send in the request body.
            Note: This is processed if `method` is "POST", "PUT", or "PATCH".
        headers (Optional[dict[str, str]]): A dictionary of additional HTTP headers.
            "Authorization" and "Content-Type" (for JSON) are handled automatically
            but can be overridden here.
        method (str): The HTTP method to use (e.g., "GET", "POST", "PUT", "DELETE").
            Defaults to "POST".

    Returns:
        Union[dict[str, Any], bytes, None]:
            - dict: If the response Content-Type is 'application/json'.
            - bytes: For all other Content-Types (text, images, etc.).
            - None: If an error occurs (network, auth, or HTTP 4xx/5xx).
    """

    _headers = {} if headers is None else headers.copy()

    try:
        token = get_token()
        _headers["Authorization"] = f"Bearer {token}"
    except Exception as e:
        print(f"ERROR: Failed to retrieve auth token while making authenticated request. {e}")
        return None

    _data = None
    if payload and method in ["POST", "PUT", "PATCH"]:
        _data = json.dumps(payload).encode("utf-8")
        if "Content-Type" not in _headers:
            _headers["Content-Type"] = "application/json"
    elif payload:
        print(
            f"WARNING in authenticated_request, payload provided but ignored for method '{method}'."
        )

    req = Request(url, data=_data, headers=_headers, method=method)

    try:
        with urlopen(req) as response:
            # PARSE if response is json
            response_type = response.info().get_content_type()
            if response_type == "application/json":
                return json.load(response)

            # OTHERWISE return raw bytes
            return response.read()

    except urllib.error.HTTPError as e:
        # 4xx, 5xx errors
        error_body = e.read().decode("utf-8")
        print(f"Error making authenticated request, Response: {e.code}: {e.reason} - {error_body}")
        return None

    except urllib.error.URLError as e:
        # DNS, network error
        print(f"Error making authenticated request, {e.reason}")
        return None

    except Exception as e:
        # Unknown
        print(f"Error making authenticated request, {e}")
        return None
