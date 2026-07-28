import json
import os
import sys
import time

# Initialize Firebase app
from shared.py.components.firebase import (
    firebase_app,  # pyright: ignore[reportUnusedImport] # noqa: F401
)

# Retrieve Job-defined env vars
TASK_INDEX = int(os.getenv("CLOUD_RUN_TASK_INDEX", 0))
TASK_ATTEMPT = int(os.getenv("CLOUD_RUN_TASK_ATTEMPT", 0))


#
# - - - Write your job here
#
def task():
    """Program that simulates work using the sleep method and random failures.

    Args:
        firestore_query: string representing the path to the data that should be fetched
    """

    print(f"Starting Task #{TASK_INDEX}, Attempt #{TASK_ATTEMPT}...")

    #
    # Read env vars specific to this execution
    #
    FIRESTORE_QUERY = os.getenv("FIRESTORE_QUERY")
    if FIRESTORE_QUERY is None:
        print("No value found for FIRESTORE_QUERY env variable")
        raise Exception("Incomplete env var set, missing: FIRESTORE_QUERY")
    else:
        print(f"ENV value for FIRESTORE_QUERY: {FIRESTORE_QUERY}")

    sleep_ms = 1000

    # Simulate work
    time.sleep(float(sleep_ms) / 1000)

    # Simulate an error
    # fail_rate = 0.0
    # random_failure = random.random()
    # if random_failure < fail_rate:
    #     raise Exception("Task failed.")

    # Simulate work
    time.sleep(float(sleep_ms) / 1000)
    print("Job: working 1")
    # Simulate work
    time.sleep(float(sleep_ms) / 1000)
    print("Job: working 2")
    # Simulate work
    time.sleep(float(sleep_ms) / 1000)
    print("Job: working 3")
    # Simulate work
    time.sleep(float(sleep_ms) / 1000)
    print("Job: working 4")

    # Success
    print(f"Completed Task #{TASK_INDEX}.")


#
# - - - JOB execution wrapper
#
#   Not intended to be modified! This serves to:
#   1. Wraps in a try/except block, to catch and log any failures in a way that can be debugged
#   in the GCP console
#
#   2. Exit with an error code as expected by Cloud Run Jobs, so that the task will be reattempted
#   in the event of an error.
#
def run():
    try:
        task()
    except Exception as err:
        # Log the error
        message = f"Task #{TASK_INDEX}, " + f"Attempt #{TASK_ATTEMPT} failed: {str(err)}"
        print(json.dumps({"message": message, "severity": "ERROR"}))

        # Exit process with error so Cloud Run Jobs automatically retries the job
        sys.exit(1)
