import os
import shutil
from pathlib import Path
import subprocess

# Local directory where skills from remote repos will be cached
CACHE_DIR = Path(
    os.environ.get("SKILLS_CACHE_DIR", os.path.join(os.path.expanduser("~"), ".skills_cache"))
)


class RemoteSkillsManager:
    """Manages downloading, caching, and dynamically loading skills from remote repositories."""

    def __init__(self, cache_dir: Path = CACHE_DIR):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def sync_repo(self, repo_url: str, branch: str = "main", force_update: bool = False) -> Path:
        """Clones or pulls a remote git repository to cache it.

        Args:
            repo_url: Git clone URL (e.g., 'https://github.com/google/skills.git')
            branch: Git branch/tag to checkout (default: 'main')
            force_update: If True, deletes cache and re-clones.
        """
        # Generate a safe folder name from URL
        repo_name = repo_url.split("/")[-1].replace(".git", "")
        target_dir = self.cache_dir / repo_name

        if force_update and target_dir.exists():
            shutil.rmtree(target_dir)

        if not target_dir.exists():
            print(f"Cloning remote skills repository: {repo_url} (branch: {branch})...")
            try:
                subprocess.run(
                    ["git", "clone", "-b", branch, "--depth", "1", repo_url, str(target_dir)],
                    check=True,
                    capture_output=True,
                )
            except subprocess.CalledProcessError as e:
                raise RuntimeError(
                    f"Failed to clone remote skills repository {repo_url}: {e.stderr.decode()}"
                ) from e
        else:
            # Repository already exists in cache, perform a git pull to fetch updates
            print(f"Syncing existing remote skills repository in cache: {repo_name}...")
            try:
                subprocess.run(
                    ["git", "-C", str(target_dir), "pull", "origin", branch],
                    check=True,
                    capture_output=True,
                )
            except subprocess.CalledProcessError as e:
                # Catch issues e.g. if offline, just use cached version
                print(f"Warning: Failed to pull updates for {repo_name}, using cached version: {e}")

        return target_dir

    def get_skill_prompt(self, repo_url: str, skill_name: str) -> str:
        """Returns the content of a skill's prompt (SKILL.md) from the synced cache."""
        repo_dir = self.sync_repo(repo_url)
        skill_dir = repo_dir / skill_name
        skill_md = skill_dir / "SKILL.md"

        if not skill_md.exists():
            # Fallback check directly in root/skills of repo
            skill_md = repo_dir / "skills" / skill_name / "SKILL.md"
            if not skill_md.exists():
                raise FileNotFoundError(
                    f"SKILL.md not found for skill '{skill_name}' in repository '{repo_url}'"
                )

        with open(skill_md, "r", encoding="utf-8") as f:
            return f.read()

