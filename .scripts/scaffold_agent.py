#!/usr/bin/env python3
import sys
import os
import subprocess
import shutil

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 .scripts/scaffold_agent.py <agent-name>")
        sys.exit(1)

    raw_name = sys.argv[1]
    # Directory name on disk will be normalized with hyphens by agents-cli
    dir_name = raw_name.lower().replace("_", "-")
    # Python package name must use underscores
    package_name = raw_name.lower().replace("-", "_")

    print(f"Scaffolding new agent: {dir_name} (package: {package_name})...")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(script_dir)
    template_path = os.path.join(root_dir, "agents", "__template_agent_py__")
    output_dir = os.path.join(root_dir, "agents")
    target_dir = os.path.join(output_dir, dir_name)

    if os.path.exists(target_dir):
        print(f"Error: Target directory already exists: {target_dir}")
        sys.exit(1)

    # 1. Locate the agents-cli executable inside the template's virtual environment
    cli_path = os.path.join(template_path, ".venv", "bin", "agents-cli")
    if not os.path.exists(cli_path):
        # Fallback for Windows
        cli_path = os.path.join(template_path, ".venv", "Scripts", "agents-cli.exe")
    if not os.path.exists(cli_path):
        # Fallback to path execution if virtual environment is not initialized yet
        cli_path = "agents-cli"

    cmd = [
        cli_path, "create", package_name,
        "--agent", f"local@{template_path}",
        "--output-dir", output_dir,
        "-dir", package_name,
        "-y"
    ]

    print(f"Running command: {' '.join(cmd)}")
    subprocess.check_call(cmd, cwd=root_dir)

    # 2. Update placeholders in pyproject.toml and agents-cli-manifest.yaml
    pyproject_path = os.path.join(target_dir, "pyproject.toml")
    if os.path.exists(pyproject_path):
        with open(pyproject_path, "r") as f:
            content = f.read()
        content = content.replace('name = "template_agent_py"', f'name = "{package_name}"')
        with open(pyproject_path, "w") as f:
            f.write(content)
        print(f"Updated pyproject.toml: {pyproject_path}")
 
    manifest_path = os.path.join(target_dir, "agents-cli-manifest.yaml")
    if os.path.exists(manifest_path):
        with open(manifest_path, "r") as f:
            content = f.read()
        content = content.replace('name: "template_agent_py"', f'name: "{package_name}"')
        with open(manifest_path, "w") as f:
            f.write(content)
        print(f"Updated agents-cli-manifest.yaml: {manifest_path}")

    # 3. Add tasks to root mise.toml
    mise_path = os.path.join(root_dir, "mise.toml")
    if os.path.exists(mise_path):
        # Format task additions
        task_additions = f"""
# - - - Task definitions for scaffolded agent: {dir_name}
packages-agent-{dir_name} = "cd agents/{dir_name} && mise install && mise exec -- uv sync"
lint-agent-{dir_name} = "cd agents/{dir_name} && ruff format --check . && ruff clean && ruff check ."
dev-agent-{dir_name} = "cd agents/{dir_name} && uv run app.py"
deploy-agent-{dir_name} = "cd agents/{dir_name} && uv run deploy.py"
"""
        with open(mise_path, "a") as f:
            f.write(task_additions)
        print(f"Registered tasks in root mise.toml: {mise_path}")

    print("\n✅ Success! Scaffolding completed successfully.")
    print(f"To initialize packages, run: mise run packages-agent-{dir_name}")
    print(f"To run the agent locally, run: mise run dev-agent-{dir_name}")

if __name__ == "__main__":
    main()
