# ruff: noqa: E402
import os
import sys
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Add current directory and shared module directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
root_dir = os.path.abspath(os.path.join(current_dir, "../.."))
sys.path.insert(0, root_dir)

from agent import Agent

app = FastAPI(title="Local Agent Server")
agent_instance = Agent()


@app.on_event("startup")
def startup_event():
    """Initialise the agent class and call set_up."""
    try:
        agent_instance.set_up()
    except Exception as e:
        print(f"Error initializing agent: {e}")
        # When running locally without active GCP credentials, set_up might fail.
        # We catch and print, but allow the app to boot for basic checks.


class QueryRequest(BaseModel):
    prompt: str


class QueryResponse(BaseModel):
    response: str


@app.post("/query", response_model=QueryResponse)
async def query_agent(payload: QueryRequest):
    try:
        if not hasattr(agent_instance, "adk_agent"):
            # Try lazy initialization if set_up failed on boot
            agent_instance.set_up()

        result = await agent_instance.query_async(payload.prompt)
        return QueryResponse(response=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    # Look for PORT env var (or use 8000 as default)
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
