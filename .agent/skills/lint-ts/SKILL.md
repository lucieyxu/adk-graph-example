---
name: lint-ts
description: Lint and format TypeScript/JavaScript files using Biome.
---

Follow these steps to lint and format TypeScript/JavaScript code.

1.  **Identify the Directory**: Determine which directory contains the modified files.
2.  **Run the Command**: Execute the appropriate command from the table below.

| Directory | Command |
| :--- | :--- |
| `appengine/default/frontend` | `mise run lint-appengine-default-frontend` |
| `appengine/public/frontend` | `mise run lint-appengine-public-frontend` |
| `services/ts-example` | `mise run lint-services-ts-example` |
| `shared` | `mise run lint-shared-ts` |

**Note**: If you modified files in multiple directories, run the command for each directory separately.
