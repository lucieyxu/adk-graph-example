# Backend

Python + Flask webserver

### Dependencies

To add a dependency, you must use `uv`, as provided by `mise`. See top level instructions for installation if you have not already completed them. This will automatically manage a local `venv` for you as well as ensuring that new dependencies added during development are also installed during deployment.

So for example, to add flask as a dependency simply run: `uv add flask`

Instead of `requirements.txt`, package dependencies are tracked in pyproject.toml