from google.cloud import secretmanager
from shared.py.config import GCP_PROJECT_ID
from shared.py.components.logging import get_logger

logger = get_logger("secrets")


def get_secret(secret_id: str, version_id: str = "latest", project_id: str = None) -> str:
    """Accesses the payload of the given secret version in Google Cloud Secret Manager.

    Args:
        secret_id: The ID/name of the secret.
        version_id: The version of the secret to access (default: 'latest').
        project_id: The Google Cloud project ID (default: GCP_PROJECT_ID).

    Returns:
        The secret payload string.
    """
    project = project_id or GCP_PROJECT_ID
    if not project:
        raise ValueError(
            "Project ID is required. Set GCP_PROJECT_ID in configuration or pass project_id."
        )

    try:
        # Create the Secret Manager client.
        client = secretmanager.SecretManagerServiceClient()

        # Build the resource name of the secret version.
        name = f"projects/{project}/secrets/{secret_id}/versions/{version_id}"
        logger.info(f"Accessing Secret Manager: {secret_id} (version: {version_id})")

        # Access the secret version.
        response = client.access_secret_version(request={"name": name})

        # Return the decoded payload.
        return response.payload.data.decode("UTF-8")
    except Exception as e:
        logger.error(
            f"Failed to access secret '{secret_id}' in project '{project}': {e}",
            extra={"secret_id": secret_id, "project_id": project},
        )
        raise RuntimeError(f"Failed to access secret {secret_id}: {e}") from e
