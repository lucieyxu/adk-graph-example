# Shared Code Documentation

The `/shared` folder contains reusable code for both the Python backend and TypeScript frontend. Agents should prioritize using these shared components to ensure consistency, security, and maintainability.

## Python (`/shared/py`)

Used in Flask and FastAPI apps, Cloud Run (services, functions, and jobs).

### Gemini AI
**File**: `shared/py/components/gemini.py`
Lower-level wrappers around the Vertex AI / Gemini SDK. Handles configuration, safety settings, and switching between regional/global endpoints.

**Common Functions:**
- `generate_text_simple(data: GenerateTextSimpleInput)`: Basic text generation.
- `generate_json_simple(data: GenerateJsonSimpleInput)`: JSON generation with Pydantic schema validation.
- `generate_gemini_image(data: GenerateGeminiImageInput)`: Image generation (Imagen/Gemini).

**Example Usage:**
```python
from shared.py.components.gemini import generate_text_simple, generate_json_simple
from shared.types.generate.text import GenerateTextSimpleInput
from shared.types.generate.json import GenerateJsonSimpleInput
from pydantic import BaseModel

# Text Generation
response = generate_text_simple(
    GenerateTextSimpleInput(
        prompt="Tell me a joke about coding.",
        temperature=0.7
    )
)

# JSON Generation
class Joke(BaseModel):
    setup: str
    punchline: str

joke_obj = generate_json_simple(
    GenerateJsonSimpleInput(
        prompt="Tell me a joke.",
        response_schema=Joke
    )
)
```

### Auth & Identity
**File**: `shared/py/components/auth.py`
Handles Google Cloud authentication and identity.

**Common Functions:**
- `get_current_user()`: Returns the current authenticated service account email.
- `get_token()`: Returns a GCP access token.

### Config
**File**: `shared/py/config.py`
Centralized configuration. **Do not hardcode project IDs.**
- `GCP_PROJECT_ID`
- `GCP_LOCATION`
- `GCP_BUCKET_NAME`

### Logging & Observability
**File**: `shared/py/components/logging.py`
Standard Google Cloud Logging utility generating GCP-compliant structured JSON logs.

**Common Functions:**
- `get_logger(name: str)`: Returns a logger instance pre-configured with the standard `GCPJsonFormatter` formatter.

**Example Usage:**
```python
from shared.py.components.logging import get_logger

logger = get_logger("my_agent")
logger.info("Initializing process", extra={"metadata_field": "value"})
```

### Secret Manager
**File**: `shared/py/components/secrets.py`
Accesses secret values securely from Google Cloud Secret Manager at runtime using the caller's active service account credentials.

**Common Functions:**
- `get_secret(secret_id: str, version_id: str = "latest", project_id: str = None)`: Accesses the payload of the specified secret version.

**Example Usage:**
```python
from shared.py.components.secrets import get_secret

# Fetch secure API key or DB password at runtime
db_password = get_secret("production-database-password")
```

### Grounding & Vector Search
**File**: `shared/py/components/grounding.py`
Provides utilities for grounding responses using Vertex AI Search datastores or running PGVector cosine similarity queries against Cloud SQL.

**Common Functions:**
- `get_vertex_ai_search_tool(data_store_id: str, location: str = "global", project_id: str = None)`: Returns a GenAI-SDK-compatible Retrieval Tool wrapper.
- `execute_pgvector_query(...)`: Executes similarity distance vector queries on PostgreSQL pgvector tables.

**Example Usage:**
```python
from shared.py.components.grounding import get_vertex_ai_search_tool

# Instantiate grounding tool to register with models/agents
grounding_tool = get_vertex_ai_search_tool(data_store_id="my-enterprise-datastore")
```

### Remote Skills Manager
**File**: `shared/py/components/skills.py`
Handles cloning, caching, and dynamically loading skill prompts and Python tools from remote git repositories.

**Common Classes & Methods:**
- `RemoteSkillsManager(cache_dir: Path)`: Initializes caching system.
- `sync_repo(repo_url: str, branch: str)`: Clones or pulls remote repo to local cache.
- `get_skill_prompt(repo_url: str, skill_name: str)`: Reads a skill's prompt from `SKILL.md` dynamically.

**Example Usage:**
```python
from shared.py.components.skills import RemoteSkillsManager

manager = RemoteSkillsManager()
skills_repo = "https://github.com/google/skills.git"

# Get Prompt template
prompt_text = manager.get_skill_prompt(skills_repo, "cloud/alloydb-basics")
```

---

## TypeScript (`/shared/ts`)

Used in the React frontend. Imports should use the `@shared/` alias, and the `.ts` explicit file extension.

### Hooks
**Path**: `shared/ts/hooks/`

- **`useFirebaseAuth`**: Handles Firebase authentication.
    ```typescript
    import { useFirebaseAuth } from '@shared/ts/hooks/useFirebaseAuth'
    
    const { authed, token } = useFirebaseAuth()
    ```

- **`useFirestoreDocListener` / `useFirestoreQueryListener`**: Real-time Firestore subscriptions.
    ```typescript
    import { useFirestoreDocListener } from '@shared/ts/hooks/useFirestoreDocListener'
    
    const data = useFirestoreDocListener<MyType>('collection/docId')
    ```

### APIs
**Path**: `shared/ts/apis/`
Type-safe wrappers for backend endpoints. Use the `Api` & `GenApi` classes to define an API client. Note, `GenApi` is for API endpoints that use generative AI on the backend, and have a prompt associated with them that can be edited in the UI in the staging environment. `Api` is the base level client that does not have a prompt associated with it.

**Defining an API:**
1. Define Input/Output Zod schemas in `shared/types`.
2. Create `GenApi` instance in `shared/ts/apis`.

```typescript
// shared/ts/apis/myApi.ts
import { GenApi } from '@shared/ts/lib/api.ts'
import { MyInputZ, MyOutputZ } from '@shared/types/my_feature.ts'

export const MyFeatureApi = new GenApi({
    name: 'My Feature',
    url: '/api/my-feature',
    input: MyInputZ,
    output: MyOutputZ,
})
```

**Using an API:**
```typescript
const result = await MyFeatureApi.fetch({ someInput: 'value' })
if (result.error) {
    // Handle error
} else {
    // Use result.data (typed as MyOutput)
}
```

## Styles
**Path**: `shared/scss/`
Shared SCSS variables and mixins.
- `main.scss`: Main entry point, often imported in `index.scss`.
- `_variables.scss`: Colors, fonts, breakpoints.

---

## Adding New Shared Code
1. **Universal?**: Only add code here if it's truly generic or used by multiple apps.
2. **Types**: Define shared types (Pydantic/Zod) in `shared/types` to ensure contract consistency between frontend and backend.