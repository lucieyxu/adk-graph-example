# ruff: noqa: E402
# ADD shared directory to path as module
import os
import sys
from contextlib import asynccontextmanager
from urllib.parse import urlparse

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ADD path for local modules
current_dir = os.path.abspath(os.path.dirname(os.path.realpath(__file__)))
sys.path.append(current_dir)

# ADD path for shared directory
root_dir = os.path.abspath(os.path.join(current_dir, "../../.."))
sys.path.insert(0, root_dir)

#
# ABORT if we are using the wrong service account or GCP project id
#
from shared.py.components.env_guard import check

valid = check()
if valid:
    #
    # - - - LOCAL imports
    #
    from shared.py.components.urls import urls
    from shared.py.config import ENV, GCP_PROJECT_ID

    from service import api_group

    if GCP_PROJECT_ID == "":
        print("Fatal error, GCP_PROJECT_ID is None. Exiting...")
        sys.exit()

    #
    # UPDATE this to match your service name
    #
    service_url = urls.services_py_example

    root_dir = os.path.abspath(os.path.join(current_dir, "../../.."))
    sys.path.insert(0, root_dir)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Initialize Firebase app
        from shared.py.components.firebase import (
            firebase_app,  # pyright: ignore[reportUnusedImport] # noqa: F401
        )

        yield
        # Any cleanup logic can go here, after the yield.
        print("Application shutting down.")

    app = FastAPI(lifespan=lifespan)

    # PROTECTED upstream
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["POST", "PUT", "GET", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    # Register API route groups
    app.include_router(api_group)

    # SET port to the port defined in /shared/config/urls.json for this service for dev, otherwise
    # use 8080 as the default for cloud environments
    parsed_url = urlparse(service_url)
    PORT = parsed_url.port if (parsed_url.port and ENV == "dev") else int(os.getenv("PORT", 8080))

    if __name__ == "__main__":
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=PORT,
            reload=(ENV == "dev"),
        )
