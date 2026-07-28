# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

from typing import cast

import firebase_admin
from firebase_admin import firestore
from shared.py.config import ENV, GCP_PROJECT_ID, GCP_SERVICE_ACCOUNT

firebase_app: firebase_admin.App = cast(
    firebase_admin.App,
    firebase_admin.initialize_app(  # type: ignore
        options={
            "databaseURL": f"https://{GCP_PROJECT_ID}-{ENV}.firebaseio.com/",
            "serviceAccountId": GCP_SERVICE_ACCOUNT,
        }
    ),
)

db = firestore.client(database_id=f"{GCP_PROJECT_ID}-{ENV}")
