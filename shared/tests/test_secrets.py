import pytest
from shared.py.components.secrets import get_secret


def test_get_secret_requires_project():
    """Verify that get_secret raises ValueError if project_id is not resolved."""
    # Temporarily force no project configuration
    with pytest.raises(ValueError, match="Project ID is required"):
        get_secret(secret_id="test-secret", project_id="")
