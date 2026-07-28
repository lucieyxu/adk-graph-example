# Services (Cloud Run)

#### Overview
This folder contains all source code for apps that are deployed to Cloud Run as a Service (not a Cloud Run Job or Function). Your service will automatically be deployed when merged into the `staging` and `prod` branches, provided that it is configured properly. Two working example services are provided, one for a python webserver using Flask, and another Typescript web server (using the Bun runtime).

#### Deployment
A big part of this code template serves to automate and streamline the Cloud Build process. Builds are triggered on merges into the `staging` and `prod` branches. If the source code for a service or app has not changed since the last deployment, a new build is not pushed. All services and apps are built in parallel, and generally complete in less than 5 minutes. (To see how this works, read the bash scripts in `/cloudbuild.yaml` and `/scripts/build/cloudrun.yaml`). For the purposes of Cloud Run Services, the build script scans the `/services` directory for all files named `cloudrun.dockerfile`. This way, to deploy a new service, just write your app in `/services/your-app`, include the dockerfile, and PR merge into staging -- no custom build script is needed. The service will be named according to its directory name. To configure the resources allocated to your service, a custom `cloudrun.config` file can be created alongside your dockerfile. The default contents for this config are:
```bash
_SCALING=auto
_MIN_INSTANCES=0
_MAX_INSTANCES=10
_HTTP_TIMEOUT=30
_MEMORY_LIMIT=512Mi
_CPU_COUNT=1
_GPU_COUNT=0
_CONCURRENCY=1000
_INGRESS=all
_LIVENESS_PROBE=
```
These values will be applied to your service when it is next deployed.



#### Proxy
Unless an exception is needed, all HTTP requests to your service should be made from a Service Account in an authenticated environment. Realistically, this means that a user action in the user-facing web frontend (probably in /app/frontend) should trigger an HTTP request to the AppEngine backend web server, which then makes a simple proxy to your Cloud Run service. Working examples of this are provided in `/app/backend/src/services`. Note that only one proxy route handler needs to be added to the AppEngine backend per service, as it is a wildcard listener. For example, a request made to `[appengine_domain_here]/api/services/py-example/hello` will make a proxy HTTP request to `[service_domain_here]/hello`. 

#### URL Map
To keep our environments neatly organized, with identical source code deployed to each and minimized chance of resources getting crossed up, a url map is used in `/shared/config/urls.json`. The top level keys of this JSON file are one of the three available environments: `dev`, `staging`, or `prod` -- no exceptions! To utilize these url mappings on the frontend, there is a React hooks provided for you in `shared/ts/hooks/useUrls.ts`. Note that this hook contains only vanilla Ts/Js code and can be used inside or outside of React. To use this map in Python, an interface class is provided in `/shared/py/components/urls.py`, to use just:
```python
# Import
from shared.py.components.urls import urls

# Use
my_url = urls.services_py_example
```
When adding a new url to the map, you will also need to update the interface class in `/shared/config/urls.py` to contain the URL for your new service.

## Creating a new service

 - Copy paste the relevant folder (__template_py__ or __template_mcp_py__) into a new folder, named with a sensible name `my-service`.
 - For MCP services, use the `__template_mcp_py__` template which implements the Model Context Protocol (MCP) using `FastMCP`.
 - Rename the docker file to remove the "disabled_" prefix, so it is named exactly `cloudrun.dockerfile`. In this file, adjust the WORKDIR path to match the name of the folder you created for your service
 - In the service directory, in the file `pyproject.toml`, adjust the name of the service to match the name of the folder
 - In the root level `mise.toml` file:
    - add new lines for `packages`, `dev`, and `lint` scripts for your service, following the format of the existing example scripts in the mise.toml file.
 - In the `/.vscode/tasks.json` file:
    - copy/paste a task block and adjust its "name" and "command" to match your new mise dev task
    - locate the "dev-main" task, and add the name of your new task to the "dependsOn" array
 - In `/shared/config/urls.json`, add your service's URL for each environment. For dev which runs on localhost, ensure there is no port clashing.
 - In `/shared/py/components/urls.py`, add your url to the class. Note to keep strict adherence to both the camelCase and snake_case conventions!
 - In `/services/[your-service]/cloudrun.dockerfile`, ensure that the CMD entry will properly launch your web server with the correct CMD / ENTRYPOINT value.

## Adding an API Endpoint
 - Shared
    - In `/shared/types/services/`, if they dont exist already, create two new files that are the name of your service, ending in .py and .ts. These will be a python and typescript file for the backend and the frontend.
    - ⚠️ *_Ensure that the python files use "\_" underscores and the typescript files use "-" hyphens in their respective filenames!_* ⚠️
    - Follow the format of the examples to create Pydantic and Zod types for python and typescript files respectively to type your API endpoint's data shape for input (from the frontend to the backend) and output (from the backend to the frontend).
 - Backend
    - In your service, create the endpoint as you normally would. Follow the examples to help ensure that types are checked on input and output, and errors are handled.
 - Frontend
    - In `/shared/ts/apis/general.ts`, create a new instance of the `Api` class, updating the information to match your service, input and output shapes (importing them from the `/shared/types/...` file you made earlier). 
    - Keep in mind that the prod and staging urls for this service must be proxied through the AppEngine backend, as the services themselves are not publically accessible on the web, and must be invoked by the authenticated service account running the AppEngine app.

All of the above steps allow you to utilize existing frameworks that allow for strict type checking at the API boundaries, ensuring that type-related bugs are caught during linting, before even being pushed to the repo, and your IDE can help you develop faster and more confidently, and frontend and backend teams can always reference a single source of truth for the expected types of their functions and data.