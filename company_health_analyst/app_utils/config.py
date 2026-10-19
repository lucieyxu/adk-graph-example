import os

from dotenv import load_dotenv
from google.genai import types

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

# Applied to every model call (agents and the intent classifier) so that topologies are
# compared on architecture, not per-agent tuning. MEDIUM is the gemini-3.8-flash default;
# that model rejects MINIMAL.
THINKING_LEVEL = types.ThinkingLevel(os.getenv("THINKING_LEVEL", "MEDIUM").upper())
