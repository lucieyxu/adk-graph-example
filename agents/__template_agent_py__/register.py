# ruff: noqa: E402
#!/usr/bin/env python3
import json
import os
import sys
import argparse
import requests
from google.auth import default
from google.auth.transport.requests import Request as GoogleAuthRequest

# Add current directory and shared module directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
root_dir = os.path.abspath(os.path.join(current_dir, "../.."))
sys.path.insert(0, root_dir)

from shared.py.config import GCP_PROJECT_ID


def get_discovery_engine_endpoint(location: str) -> str:
    """Get the appropriate Discovery Engine API endpoint for the given location."""
    if location == "global":
        return "https://discoveryengine.googleapis.com"
    return f"https://{location}-discoveryengine.googleapis.com"


def parse_agent_engine_id(agent_engine_id: str) -> dict | None:
    """Parse an Agent Engine resource name to extract components."""
    parts = agent_engine_id.split("/")
    if (
        len(parts) == 6
        and parts[0] == "projects"
        and parts[2] == "locations"
        and parts[4] == "reasoningEngines"
    ):
        return {
            "project": parts[1],
            "location": parts[3],
            "engine_id": parts[5],
        }
    return None


def parse_gemini_enterprise_app_id(app_id: str) -> dict | None:
    """Parse Gemini Enterprise app resource name to extract components."""
    parts = app_id.split("/")
    if (
        len(parts) == 8
        and parts[0] == "projects"
        and parts[2] == "locations"
        and parts[4] == "collections"
        and parts[6] == "engines"
    ):
        return {
            "project_number": parts[1],
            "location": parts[3],
            "collection": parts[5],
            "engine_id": parts[7],
        }
    return None


def get_access_token() -> str:
    """Get Google Cloud access token using ADC."""
    try:
        credentials, _ = default()
        auth_req = GoogleAuthRequest()
        credentials.refresh(auth_req)
        return credentials.token
    except Exception as e:
        print(f"Error getting access token: {e}")
        print("Please run 'gcloud auth application-default login' to authenticate.")
        sys.exit(1)


def register_agent(
    agent_engine_id: str,
    gemini_enterprise_app_id: str,
    display_name: str,
    description: str,
) -> dict:
    """Register the Agent Engine reasoning engine as an ADK Agent in Gemini Enterprise."""
    parsed_ge = parse_gemini_enterprise_app_id(gemini_enterprise_app_id)
    if not parsed_ge:
        raise ValueError(
            "Invalid Gemini Enterprise App ID format. Expected: "
            "projects/{project_number}/locations/{location}/collections/{collection}/engines/{engine_id}"
        )

    project_number = parsed_ge["project_number"]
    location = parsed_ge["location"]
    collection = parsed_ge["collection"]
    engine_id = parsed_ge["engine_id"]

    access_token = get_access_token()
    base_endpoint = get_discovery_engine_endpoint(location)

    url = (
        f"{base_endpoint}/v1alpha/projects/{project_number}/"
        f"locations/{location}/collections/{collection}/engines/{engine_id}/"
        "assistants/default_assistant/agents"
    )

    headers = {
        "Authorization": f"Bearer {access_token}",
        "x-goog-user-project": GCP_PROJECT_ID,
        "Content-Type": "application/json",
    }

    payload = {
        "displayName": display_name,
        "description": description,
        "icon": {
            "uri": "https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/smart_toy/default/24px.svg"
        },
        "adk_agent_definition": {
            "tool_settings": {"tool_description": description},
            "provisioned_reasoning_engine": {"reasoning_engine": agent_engine_id},
        },
    }

    print("\nRegistering agent to Gemini Enterprise...")
    print(f"  Agent Engine ID: {agent_engine_id}")
    print(f"  Gemini Enterprise App ID: {gemini_enterprise_app_id}")
    print(f"  Display Name: {display_name}")

    response = requests.post(url, headers=headers, json=payload, timeout=30)

    if response.status_code in (400, 409):
        # Handle if already registered: attempt to find and update
        print("Agent might already be registered. Checking existing registrations...")
        list_response = requests.get(url, headers=headers, timeout=30)
        list_response.raise_for_status()
        agents_list = list_response.json().get("agents", [])

        existing_agent = None
        for agent in agents_list:
            adk_def = agent.get("adk_agent_definition", {})
            prov_engine = adk_def.get("provisioned_reasoning_engine", {})
            if prov_engine.get("reasoning_engine") == agent_engine_id:
                existing_agent = agent
                break

        if existing_agent:
            agent_name = existing_agent["name"]
            update_url = f"{base_endpoint}/v1alpha/{agent_name}"
            print(f"Updating existing registration: {agent_name}")
            update_response = requests.patch(update_url, headers=headers, json=payload, timeout=30)
            update_response.raise_for_status()
            print("✅ Successfully updated agent registration!")
            return update_response.json()

    response.raise_for_status()
    print("✅ Successfully registered agent to Gemini Enterprise!")
    return response.json()


def main():
    parser = argparse.ArgumentParser(
        description="Register deployed Vertex AI reasoning engine to Gemini Enterprise."
    )
    parser.add_argument(
        "--agent-engine-id",
        help="Vertex AI Reasoning Engine ID (e.g. projects/.../reasoningEngines/...)",
    )
    parser.add_argument(
        "--gemini-enterprise-app-id",
        help="Gemini Enterprise Engine App ID (e.g. projects/.../engines/...)",
    )
    parser.add_argument(
        "--display-name",
        default="ADK Agent",
        help="Display Name for the agent in Gemini Enterprise",
    )
    parser.add_argument(
        "--description",
        default="ADK Agent powered by Vertex AI Reasoning Engine",
        help="Description of what the agent/tool does",
    )
    args = parser.parse_args()

    agent_engine_id = args.agent_engine_id
    gemini_enterprise_app_id = args.gemini_enterprise_app_id or os.getenv(
        "GEMINI_ENTERPRISE_APP_ID"
    )

    # Load from metadata if ID not provided
    metadata_path = os.path.join(current_dir, "deployment_metadata.json")
    if not agent_engine_id and os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
                agent_engine_id = metadata.get("remote_agent_engine_id")
                print(f"Loaded Agent Engine ID from metadata: {agent_engine_id}")
        except Exception as e:
            print(f"Warning: Failed to read metadata file: {e}")

    if not agent_engine_id:
        print(
            "Error: --agent-engine-id is required or must be present in deployment_metadata.json."
        )
        sys.exit(1)

    if not gemini_enterprise_app_id:
        print(
            "Error: --gemini-enterprise-app-id is required or "
            "must be set in GEMINI_ENTERPRISE_APP_ID env var."
        )
        sys.exit(1)

    try:
        register_agent(
            agent_engine_id=agent_engine_id,
            gemini_enterprise_app_id=gemini_enterprise_app_id,
            display_name=args.display_name,
            description=args.description,
        )
    except Exception as e:
        print(f"Error during registration: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
