from typing import Any
from google.genai import types
from shared.py.config import GCP_PROJECT_ID
from shared.py.components.logging import get_logger

logger = get_logger("grounding")


def get_vertex_ai_search_tool(
    data_store_id: str, location: str = "global", project_id: str = None
) -> Any:
    """Returns a google-genai SDK tool configured to ground responses using Vertex AI Search.

    Register this tool directly in the Gemini/ADK agent's model configs or tool configurations.

    Args:
        data_store_id: The ID of the Vertex AI Search Data Store.
        location: The location of the data store (default: 'global').
        project_id: The Google Cloud project ID (default: GCP_PROJECT_ID).
    """
    project = project_id or GCP_PROJECT_ID
    if not project:
        raise ValueError("Project ID is required to configure Vertex AI Search tool.")

    logger.info(
        f"Configuring Vertex AI Search Grounding Tool for Datastore: {data_store_id}",
        extra={"project_id": project, "location": location, "data_store_id": data_store_id},
    )

    # Configure the native GenAI SDK Retrieval tool
    return types.Tool(
        retrieval=types.Retrieval(
            vertex_ai_search=types.VertexAISearch(
                project=project, datastore=data_store_id, location=location
            )
        )
    )


def execute_pgvector_query(
    db_connection: Any,
    table_name: str,
    embedding_column: str,
    query_embedding: list[float],
    select_columns: list[str] = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Executes a vector search query against a Cloud SQL PostgreSQL pgvector table.

    FDE projects frequently use Cloud SQL PostgreSQL for storing enterprise vector data.
    This helper provides a standard pattern for Cosine Similarity calculations.

    Args:
        db_connection: An active SQL Alchemy connection or psycopg connection.
        table_name: The table to query.
        embedding_column: The column containing pgvector embeddings (e.g., 'embedding').
        query_embedding: The raw vector list (floats) to compare.
        select_columns: Columns to retrieve (default: '*').
        limit: Number of matches to return (default: 5).
    """
    columns = ", ".join(select_columns) if select_columns else "*"
    vector_string = f"[{','.join(map(str, query_embedding))}]"

    # Cosine distance operator in pgvector is <=>
    query = f"""
        SELECT {columns}, ({embedding_column} <=> :query_vector) AS distance
        FROM {table_name}
        ORDER BY distance ASC
        LIMIT :limit
    """

    logger.info(f"Executing Cosine Similarity Vector search on table {table_name}")
    try:
        result = db_connection.execute(
            query, {"query_vector": vector_string, "limit": limit}
        ).mappings()
        return [dict(row) for row in result]
    except Exception as e:
        logger.error(f"Failed to execute pgvector query: {e}")
        raise
