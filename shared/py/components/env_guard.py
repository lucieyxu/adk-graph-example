# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #


import sys

from shared.py.components.auth import CURRENT_ADC_SA
from shared.py.config import ENV, GCP_PROJECT_ID, GCP_PROJECT_NUMBER, GCP_SERVICE_ACCOUNT


def check():
    #
    # - - - ABORT if GCP_PROJECT_ID is not set in config
    #
    #   We want to exit the program if this GCP project ID is not set via the expected means, it
    #   will fall back to some other user's shell variable or other, and we could run operations in
    #   that GCP project accidentally.
    #
    if GCP_PROJECT_ID == "":
        print("- - - ")
        print("- - - ")
        print("- - - ")
        print("- - - Fatal error, value for GCP_PROJECT_ID env var is not set.")
        print("- - - ")
        if ENV == "dev":
            print(
                "- - - It is likely that you simply need to run 'mise daily' before launching VSCode from the terminal by running 'code .'"  # noqa: E501
            )
        else:
            print(
                "- - - It is likely that there is a misconfiguration in the build process, failing to set the ENV var for GCP_PROJECT_ID"  # noqa: E501
            )
        print("- - - ")
        print("- - - Exiting application!")
        print("- - - ")
        print("- - - ")
        print("- - - ")
        sys.exit()

    if GCP_PROJECT_NUMBER == "":
        print("- - - ")
        print("- - - ")
        print("- - - ")
        print("- - - Fatal error, value for GCP_PROJECT_NUMBER env var is not set.")
        print("- - - ")
        if ENV == "dev":
            print(
                "- - - It is likely that you simply need to run 'mise daily' before launching VSCode from the terminal by running 'code .'"  # noqa: E501
            )
        else:
            print(
                "- - - It is likely that there is a misconfiguration in the build process, failing to set the ENV var for GCP_PROJECT_NUMBER"  # noqa: E501
            )
        print("- - - ")
        print("- - - Exiting application!")
        print("- - - ")
        print("- - - ")
        print("- - - ")
        sys.exit()

    #
    # - - - ABORT if correct service account is not in use
    #
    #   We want to exit the program if the intended service account is not in use, as it will lead
    #   to IAM access and permission errors that do not need to be explicitly handled, and the root
    #   issue should be resolved before continuing.
    #
    if not CURRENT_ADC_SA == GCP_SERVICE_ACCOUNT:
        print("- - - ")
        print("- - - ")
        print("- - - ")
        print(
            "- - - Fatal error, value for env var GCP_SERVICE_ACCOUNT does not match actual service account in use by ADC."  # noqa: E501
        )
        print("- - - ")
        print(f"- - - Got:      {CURRENT_ADC_SA}")
        print(f"- - - Expected: {GCP_SERVICE_ACCOUNT}")
        print("- - - ")
        if ENV == "dev":
            print(
                "- - - It is likely that you simply need to run 'mise daily' before launching VSCode from the terminal by running 'code .'"  # noqa: E501
            )
        else:
            print(
                "- - - It is likely that there is a misconfiguration in the build process, failing to set the env var for GCP_SERVICE_ACCOUNT or to run the service with the correct service account"  # noqa: E501
            )
        print("- - - ")
        print("- - - Exiting application!")
        print("- - - ")
        print("- - - ")
        print("- - - ")
        sys.exit()

    return True
