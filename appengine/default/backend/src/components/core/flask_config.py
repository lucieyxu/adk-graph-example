# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

import os
import re
import uuid
from datetime import date, datetime
from typing import Any

from flask import Flask
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS  # type: ignore
from shared.py.components.urls import urls
from shared.py.config import ENV, GCP_PROJECT_ID


class ISO8601JSONProvider(DefaultJSONProvider):
    """
    Custom JSON Provider that converts datetime objects to ISO 8601 strings.
    """

    def default(self, o: Any):  # type: ignore
        print(o)
        if isinstance(o, (date, datetime)):
            return o.isoformat()
        return super().default(o)


def flask_setup(app: Flask):
    # REGISTER json encoder to convert datetime objects to iso strings
    app.json = ISO8601JSONProvider(app)

    # CORS settings, vary per environment
    if ENV == "dev":
        # Development settings - allow localhost
        CORS(
            app,
            resources={
                r"/api/*": {
                    "origins": [f"{urls.appengine_default_frontend}"],
                    "methods": ["POST", "PUT", "GET", "OPTIONS"],
                    "allow_headers": ["Content-Type", "Authorization"],
                    "supports_credentials": True,
                }
            },
        )
    else:
        # Production settings - more restrictive
        CORS(
            app,
            resources={
                r"/api/*": {
                    "origins": [
                        f"https://{GCP_PROJECT_ID}.uc.r.appspot.com",
                        re.compile(
                            rf"^https://[a-zA-Z0-9-]+-dot-{GCP_PROJECT_ID}\.uc\.r\.appspot\.com$"
                        ),
                        f"{urls.appengine_default_frontend}",
                    ],
                    "methods": ["POST", "PUT", "GET", "OPTIONS"],
                    "allow_headers": ["Content-Type", "Authorization"],
                    "supports_credentials": True,
                }
            },
        )

    # SET Flask secret key
    app.secret_key = uuid.uuid5(
        uuid.NAMESPACE_DNS,
        "-".join(
            [
                os.getenv("GAE_APPLICATION", "application-id"),
                os.getenv("GAE_DEPLOYMENT_ID", "deployment-id"),
                os.getenv("GAE_SERVICE", "service-id"),
                GCP_PROJECT_ID,
            ]
        ),
    )
