#!/usr/bin/env python3
import json
import os
import sys
import shutil
from pathlib import Path

# Add workspace root and shared directory to python path
script_dir = Path(__file__).resolve().parent
root_dir = script_dir.parent.parent
sys.path.insert(0, str(root_dir))

from shared.py.components.skills import RemoteSkillsManager


def main():
    config_path = root_dir / "skills.json"
    skills_output_dir = root_dir / "skills"

    if not config_path.exists():
        print(f"Error: {config_path} not found.")
        sys.exit(1)

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    # Clean and recreate the workspace skills target folder
    if skills_output_dir.exists():
        print("Cleaning previous local workspace skills...")
        shutil.rmtree(skills_output_dir)
    skills_output_dir.mkdir(exist_ok=True)

    manager = RemoteSkillsManager()

    for repo in config.get("repositories", []):
        name = repo.get("name")
        url = repo.get("url")
        branch = repo.get("branch", "main")
        skills = repo.get("skills", [])

        print(f"\nSynchronizing skills repository '{name}' ({url})...")
        try:
            repo_dir = manager.sync_repo(url, branch=branch)
        except Exception as e:
            print(f"Error: Failed to sync repository {url}: {e}")
            continue

        for skill_path in skills:
            src_skill_dir = repo_dir / skill_path

            # Fallback check if the skill path does not contain skills/ prefix in the synced repo
            if not src_skill_dir.exists():
                src_skill_dir = repo_dir / skill_path.replace("skills/", "")
                if not src_skill_dir.exists():
                    print(f"Warning: Skill folder '{skill_path}' not found in repo.")
                    continue

            skill_name_slug = Path(skill_path).name
            dest_skill_dir = skills_output_dir / skill_name_slug

            print(f"  -> Syncing skill to workspace: /skills/{skill_name_slug}")
            shutil.copytree(src_skill_dir, dest_skill_dir, dirs_exist_ok=True)

    print("\n✅ Successfully synchronized all coding assistant workspace skills!")


if __name__ == "__main__":
    main()
