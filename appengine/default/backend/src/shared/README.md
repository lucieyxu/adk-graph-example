# Shared

⚠️ Leave this folder empty ⚠️ 

During deployment to App Engine, a copy of all .py and .json files in /shared (at repo root) are moved to this folder. This is due to how AppEngine works, the app.yaml file determines the app's root directory, and no files in the parent directory are deployed, and so trying to import those modules will fail.

For local development however, imports are from the proper shared directory
