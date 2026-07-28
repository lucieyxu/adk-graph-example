# ruff: noqa: E402
import os
import sys
import shutil
import tomllib
import importlib
from google.cloud import aiplatform
from vertexai.preview import reasoning_engines

# Add current directory and shared module directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
root_dir = os.path.abspath(os.path.join(current_dir, "../.."))
sys.path.insert(0, root_dir)

from shared.py.config import GCP_PROJECT_ID, GCP_LOCATION, GCP_BUCKET_NAME


def extract_requirements(pyproject_path: str) -> list[str]:
    """Parses pyproject.toml to extract agent dependencies."""
    requirements = []
    if os.path.exists(pyproject_path):
        with open(pyproject_path, "rb") as f:
            data = tomllib.load(f)
            project_data = data.get("project", {})
            pkg_deps = project_data.get("dependencies", [])
            for dep in pkg_deps:
                # Omit "shared" since it is packaged separately as an extra package
                if dep != "shared" and not dep.startswith("shared "):
                    requirements.append(dep)
    return requirements


def main():
    if not GCP_PROJECT_ID:
        print("Error: GCP_PROJECT_ID environment variable not found.")
        sys.exit(1)

    print(f"Initializing AI Platform for Project: {GCP_PROJECT_ID}, Location: {GCP_LOCATION}")
    staging_bucket = f"gs://{GCP_BUCKET_NAME}"
    aiplatform.init(
        project=GCP_PROJECT_ID,
        location=GCP_LOCATION,
        staging_bucket=staging_bucket,
    )

    # Parse the clean package namespace name from current folder (e.g. template_agent_py)
    folder_name = os.path.basename(current_dir)
    package_name = folder_name.strip("_").replace("-", "_")  # e.g. "template_agent_py"

    # Prepare a temporary workspace to structure packages in their correct namespace directories
    import tempfile

    temp_dir = tempfile.mkdtemp()

    # 1. Structure "shared" source package (shared/py -> shared/py)
    shared_src = os.path.abspath(os.path.join(current_dir, "../../shared"))
    temp_shared_dir = os.path.join(temp_dir, "shared")
    os.makedirs(temp_shared_dir)
    shutil.copytree(
        os.path.join(shared_src, "py"),
        os.path.join(temp_shared_dir, "py"),
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
    )

    # 2. Structure the agent source package under its clean namespace name (e.g. template_agent_py)
    temp_agent_dir = os.path.join(temp_dir, package_name)
    os.makedirs(temp_agent_dir)

    # Copy agent source files to temp_dir/template_agent_py
    for item in os.listdir(current_dir):
        item_path = os.path.join(current_dir, item)
        if os.path.isdir(item_path):
            if item not in ("dist", ".venv", "__pycache__", "tests"):
                shutil.copytree(
                    item_path,
                    os.path.join(temp_agent_dir, item),
                    ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
                )
        elif item.endswith(".py") and item != "deploy.py":
            shutil.copy2(item_path, temp_agent_dir)

    # 3. Add temporary path to sys.path so python imports map to the structured namespace
    sys.path.insert(0, temp_dir)

    # 4. Parse dependencies from our own pyproject.toml
    agent_pyproject = os.path.join(current_dir, "pyproject.toml")
    requirements = extract_requirements(agent_pyproject)
    # Ensure Reasoning Engine requirements are present
    if "google-cloud-aiplatform[reasoningengine]" not in requirements:
        requirements.append("google-cloud-aiplatform[reasoningengine]>=1.70.0")

    print(f"Extracted remote dependencies: {requirements}")
    print(f"Local extra packages: {['shared', package_name]}")

    original_cwd = os.getcwd()
    try:
        # Import the Agent from the package module name (so its __module__
        # is bound to the namespace)
        agent_module = importlib.import_module(f"{package_name}.agent")
        Agent = getattr(agent_module, "Agent")
        agent_obj = Agent()

        # Dry-run check
        if len(sys.argv) > 1 and sys.argv[1] == "--dry-run":
            print("Dry run completed. Agent and dependencies packaged successfully.")
            return

        # Change directory to the temporary directory. This is CRITICAL:
        # It forces the Vertex AI SDK's tarball builder to package the extra_packages
        # relative to the temp workspace, preventing absolute path prefixes in the tarball.
        os.chdir(temp_dir)

        print("Deploying Agent to Vertex AI Agent Engine (Reasoning Engine)...")
        reasoning_engine = reasoning_engines.ReasoningEngine.create(
            agent_obj,
            requirements=requirements,
            extra_packages=["shared", package_name],
        )
        print(
            "Successfully deployed Reasoning Engine! "
            f"Resource Name: {reasoning_engine.resource_name}"
        )

        # Save deployment metadata
        metadata = {
            "deployment_target": "agent_engine",
            "remote_agent_engine_id": reasoning_engine.resource_name,
        }
        metadata_path = os.path.join(current_dir, "deployment_metadata.json")
        import json

        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
        print(f"Deployment metadata saved to: {metadata_path}")

    finally:
        # Restore original working directory and clean up workspace
        os.chdir(original_cwd)
        shutil.rmtree(temp_dir)


if __name__ == "__main__":
    main()
