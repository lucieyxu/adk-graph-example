from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from app import app

client = TestClient(app)


@patch("app.agent_instance")
def test_query_route(mock_agent):
    """Test that the /query endpoint accepts posts and maps response fields."""
    # Mock query response
    mock_agent.query_async = AsyncMock(return_value="integration response")

    response = client.post("/query", json={"prompt": "test prompt"})

    assert response.status_code == 200
    assert response.json() == {"response": "integration response"}
    mock_agent.query_async.assert_called_once_with("test prompt")
