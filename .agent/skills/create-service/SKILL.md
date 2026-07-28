---
name: create-service
description: Create a new Cloud Run service (Python) from a template.
---

1. Decide on a name for your new service (e.g., `my-service`).
2. Copy the _contents_ of the Python template folder `/services/__template_py__` to `/services/<your-service-name>`.
3. Prepare the Dockerfile in the new service directory:
   - Rename `disabled_cloudrun.dockerfile` (or similar starting with `disabled_`) to `cloudrun.dockerfile`.
   - In `cloudrun.dockerfile`, change the `WORKDIR` path to `/services/<your-service-name>`.
4. Update configuration files within the new service directory:
   - **`pyproject.toml`**: Update the name field to match your service name.
5. Update the root `mise.toml` configuration:
   - Add a new entry in `[tasks.packages]` for your service.
   - Add a new entry in `[tasks.dev]` for your service.
   - Add a new entry in `[tasks.lint]` for your service.
   - *Follow the format, naming convention, and contents of the existing scripts in the `mise.toml` file.*
6. Update VS Code configuration in `/.vscode/tasks.json`:
   - Copy an existing task block (related to a service dev task).
   - Rename the task and set the command to match your new `mise` dev task.
   - Add this new task name to the `dependsOn` list of the `dev-main` task.
7. Register the service URL in `/shared/config/urls.json`:
   - Add entries for `dev`, `staging`, and `prod`.
   - **Important**: For `dev` (localhost), ensure you pick a unique port that doesn't clash with other services.
8. Update the Python URL interface in `/shared/py/components/urls.py`:
   - Add the new service URL to the class, strictly adhering to `snake_case` conventions.
9. Update the Typescript URL interface in `/shared/ts/hooks/useUrls.ts`:
   - Add the new service URL to the class, strictly adhering to `camelCase` conventions.
10. Create new input and output types in `/shared/types/services/`, creating two new files, named `[service_name].py` (snake_case) and `[serviceName].ts` (camelCase). Both of these must strictly follow the templates set in `/shared/types/__templates__/__template`.
11. Make the service use the input and output types in the newly created service.py file.
12. Make the service use the correct url in the newly created main.py file. For example: instead of parsing the port from `urls.services_py_example`, use `urls.services_service_name`.
13. Create a new .ts file in `/shared/ts/apis/[serviceName].ts` (note camelCase convention), strictly referencing the template content in `/shared/ts/apis/__templates__/template.ts`
14. At repo root, run the new command you created, `mise packages-service-[service-name]`

Rules:
- Do **NOT** run any commands with Docker. This tool is not installed or used for local development
- Do **NOT** delete or in any way modify the contents of the __template_py__ folder
- Do **NOT** create any new functionality for the service during this workflow. The new service must only have one `/hello` endpoint that matches that in the template.
