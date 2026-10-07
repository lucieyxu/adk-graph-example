import os

ENV = os.getenv("ENV", "dev")

GCP_PROJECT_ID = (
    os.getenv("CLOUDSDK_CORE_PROJECT")
    or os.getenv("GCP_PROJECT_ID")
    or os.getenv("GOOGLE_CLOUD_PROJECT")
    or ""
)

GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")

AGENT_MODEL = os.getenv("AGENT_MODEL", "gemini-3.8-flash")
