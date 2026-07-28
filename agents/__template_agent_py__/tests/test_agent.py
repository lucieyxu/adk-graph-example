from unittest.mock import MagicMock, AsyncMock, patch
import pytest
from agent import Agent


def test_agent_init():
    """Verify that agent class can be instantiated with custom parameters."""
    agent = Agent(model="gemini-2.5-flash", system_instruction="Test instruction")
    assert agent.model_name == "gemini-2.5-flash"
    assert agent.system_instruction == "Test instruction"


@pytest.mark.asyncio
@patch("agent.AdkAgent")
@patch("agent.Gemini")
@patch("agent.InMemoryRunner")
async def test_agent_query(mock_runner, mock_gemini, mock_adk):
    """Test that agent query_async executes runner query cleanly."""
    agent = Agent()

    # Setup mocks
    mock_runner_instance = MagicMock()

    mock_part = MagicMock()
    mock_part.text = "mocked response"
    mock_event = MagicMock()
    mock_event.content.parts = [mock_part]

    # run_debug is an async method in ADK
    mock_runner_instance.run_debug = AsyncMock(return_value=[mock_event])
    mock_runner.return_value = mock_runner_instance

    agent.set_up()

    response = await agent.query_async("hello")

    assert response == "mocked response"
    mock_runner_instance.run_debug.assert_called_once_with("hello", quiet=True)
