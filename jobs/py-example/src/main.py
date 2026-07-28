# ruff: noqa: E402
import os
import sys

# ADD path for local modules
current_dir = os.path.abspath(os.path.dirname(os.path.realpath(__file__)))
sys.path.append(current_dir)

# ADD path for shared directory
root_dir = os.path.abspath(os.path.join(current_dir, "../../.."))
sys.path.insert(0, root_dir)

#
# ABORT if we are using the wrong service account or GCP project id
#
from shared.py.components.env_guard import check

valid = check()
if valid:
    #
    # - - - LOCAL imports
    #

    from shared.py.config import GCP_PROJECT_ID

    import job

    # ENSURE no operations are attempted without a valid GCP project, which could fallback to an
    # different project based on settings in the dev's environment that this app does not control
    if GCP_PROJECT_ID == "":
        print("Fatal error, GCP_PROJECT_ID is None. Exiting...")
        sys.exit()

    # Start script
    if __name__ == "__main__":
        job.run()
