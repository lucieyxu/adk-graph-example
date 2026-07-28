---
name: lint-python
description: Lint and format Python files using Ruff.
---

Follow these steps to lint and format Python code.

1.  **Identify the Directory**: Determine which directory contains the modified files.
2.  **Run the Command**: Execute the appropriate command from the table below.

| Directory | Command |
| :--- | :--- |
| `appengine/default/backend` | `mise run lint-appengine-default-backend` |
| `appengine/public/backend` | `mise run lint-appengine-public-backend` |
| `services/py-example` | `mise run lint-services-py-example` |
| `jobs/py-example` | `mise run lint-jobs-py-example` |
| `shared` | `mise run lint-shared-py` |

**Note**: If you modified files in multiple directories, run the command for each directory separately.
