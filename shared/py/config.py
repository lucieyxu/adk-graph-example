# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #


import os

import google.genai.types as types

ENV = os.getenv("ENV", "dev")

GCP_PROJECT_ID = (
    os.getenv("CLOUDSDK_CORE_PROJECT")
    or os.getenv("GCP_PROJECT_ID")
    or os.getenv("GOOGLE_CLOUD_PROJECT")
    or ""
)

GCP_PROJECT_NUMBER = os.getenv("CLOUDSDK_CORE_NUMBER") or os.getenv("GCP_PROJECT_NUMBER") or ""

GCP_SERVICE_ACCOUNT = os.getenv("DEFAULT_SERVICE_ACCOUNT") or os.getenv("GCP_SERVICE_ACCOUNT") or ""

GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")

GCP_BUCKET_NAME = f"{GCP_PROJECT_ID}-storage-{ENV}"

GEMINI_SAFETY_SETTINGS = [
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold=types.HarmBlockThreshold.BLOCK_ONLY_HIGH,
    ),
]


# TTL for Firestore session documents and user generated content in the storage bucket
SESSION_TTL_DAYS = 7
