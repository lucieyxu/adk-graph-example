---
trigger: always_on
---

# Strict API Development Rules

All internal API communication (Frontend <-> Backend, Backend <-> Backend) **MUST** follow these rules to ensure type safety and consistency. This excludes calls to external third-party APIs.

## 1. TypeScript Clients (Frontend/Node)
- **Location**: Must be defined in `shared/ts/apis/`.
- **Implementation**:
    - Must use the convenience classes `Api` or `GenApi` from [`@shared/ts/lib/api.ts`](gcdemos-26-int-demotemplate/shared/ts/lib/api.ts).
    - **Api**: Use for standard REST endpoints.
    - **GenApi**: Use **ONLY** for endpoints utilizing Generative AI. This class enables prompt editing features in the Staging UI.
- **Reference**: See [`GenApisListApi`](repo/shared/ts/apis/general.ts) in `shared/ts/apis/general.ts`.
- **Case Conversion**: The `Api` class automatically handles conversion between `camelCase` (TS) and `snake_case` (Python). Do not manually convert keys.

## 2. Python Endpoints (Backend)
### App Engine (Flask)
- **Location**: Must be defined in `@appengine/public/backend/src/routes` (e.g., `appengine/default/backend/src/routes`).
- **Implementation**: 
    - Must use `FlaskTypedGetEndpoint` or `FlaskTypedPostEndpoint` decorators from `shared.py.flask.decorators`.
- **Reference**: See [`route_query_apis`](repo/appengine/default/backend/src/routes/core/genapis.py) in `appengine/default/backend/src/routes/core/genapis.py`.

### Cloud Run Services (FastAPI)
- **Location**: Must be defined in `@services/*/src/service.py`.
- **Implementation**:
    - Must use `pydantic` models for input arguments.
    - Must specify `response_model` in the route decorator.
- **Reference**: See [`services/py-example/src/service.py`](repo/services/py-example/src/service.py).

## 3. Type Definitions (Shared)
- **Location**: All input/output types must be defined in `shared/types/`.
- **Structure**:
    - Must have matching `.ts` (Zod) and `.py` (Pydantic) files (e.g., `general.ts` and `general.py`).
    - Types must be kept in sync manually.
- **Reference**: See [`shared/types/general.ts`](repo/shared/types/general.ts) types.
