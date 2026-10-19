import os

from dotenv import load_dotenv

load_dotenv()

ENV = os.getenv("ENV", "dev")

GCP_PROJECT_ID = (
    os.getenv("CLOUDSDK_CORE_PROJECT")
    or os.getenv("GCP_PROJECT_ID")
    or os.getenv("GOOGLE_CLOUD_PROJECT")
    or ""
)

GCP_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION") or os.getenv("GCP_LOCATION") or "global"

AGENT_MODEL = os.getenv("AGENT_MODEL", "gemini-3.8-flash")
