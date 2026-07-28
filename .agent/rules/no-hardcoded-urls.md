---
description: Enforces the use of helper modules for environment-specific URLs instead of hardcoding them.
---

# No Hardcoded URLs

## Context
All application and service URLs are defined in `shared/config/urls.json`. This is the single source of truth for environment-specific URLs (dev, staging, prod).

## Rule
**NEVER** hardcode URLs for internal apps or services in the source code. You **MUST** use the provided helper modules to ensure the correct URL is used for the current environment.

## Usage

### TypeScript
For TypeScript code (frontend and backend), import the `useUrls` hook:

```typescript
import { useUrls } from '@shared/hooks/useUrls'

const urls = useUrls()
// Example usage
const backendUrl = urls.appengineDefaultBackend
```

**Note**: `useUrls` is safe to use in non-React environments as well.

### Python
For Python code, import the `urls` object:

```python
from shared.py.components.urls import urls

# Example usage
backend_url = urls.appengine_default_backend
```
