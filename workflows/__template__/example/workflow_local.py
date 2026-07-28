# ruff: noqa: E402
import json
import os
import sys
from typing import Any

# ADD path for local modules
current_dir = os.path.abspath(os.path.dirname(os.path.realpath(__file__)))
sys.path.append(current_dir)

# ADD path for shared directory
root_dir = os.path.abspath(os.path.join(current_dir, "../../.."))
sys.path.insert(0, root_dir)

from shared.py.components.workflows import use_service_local


def run():
    runtime_args_str = os.getenv("RUNTIME_ARGS")
    runtime_args: dict[str, Any] = json.loads(runtime_args_str) if runtime_args_str else {}

    # First service
    py_example_result = use_service_local("services_py_example", runtime_args["py_example"])

    # Second service
    ts_example_result = use_service_local("services_ts_example", runtime_args["ts_example"])

    output = {
        "service_py_example": py_example_result,
        "service_ts_example": ts_example_result,
    }

    print(output)


# Start script
if __name__ == "__main__":
    run()
