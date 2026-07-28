# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - ✅ Code Template: ADD the custom demo functionality ✅ - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

# ruff: noqa: E402

# - - - System and Package imports
#
#   Note: do not import local modules here, do so below
#   (after the directories are added to the path and env has been checked)
#
import os
import sys

from flask import Flask

#
# - - - ADD current directory to path
#
current_dir = os.path.abspath(os.path.dirname(os.path.realpath(__file__)))
sys.path.append(current_dir)

#
# - - - ADD shared directory to path
#
#   In cloud environments, the /shared dir is copied to this folder as a local module
#   In local environments, the /hsared dir is a few directories up, needs to be added to the path
#
ENV = os.getenv("ENV", "dev")
if ENV == "dev":
    root_dir = os.path.abspath(os.path.join(current_dir, "../../../.."))
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

    # Initialize Firebase app
    from shared.py.components.firebase import (
        firebase_app,  # pyright: ignore[reportUnusedImport] # noqa: F401
    )

    from components.core.flask_config import flask_setup
    from components.genapis import genapis_setup
    from routes.core.functions import functions_bp
    from routes.core.genapis import genapis_bp
    from routes.core.jobs import jobs_bp
    from routes.core.services import services_bp
    from routes.core.storage import storage_bp
    from routes.event import event_bp
    from routes.session import session_bp

    # For cloud environments, the port env var is set during build
    # For local environments, the port must match that specified for this app/service
    # in /shared/config.urls.json
    PORT = int(os.getenv("PORT", default=3001))

    # INITIALIZE Flask application
    app = Flask(__name__)
    flask_setup(app)

    # INITIALIZE GenApi instances
    genapis_setup()

    # REGISTER demo-template core API endpoint groups
    app.register_blueprint(jobs_bp, url_prefix="/api/jobs")
    app.register_blueprint(genapis_bp, url_prefix="/api/genapis")
    app.register_blueprint(storage_bp, url_prefix="/api/storage")
    app.register_blueprint(services_bp, url_prefix="/api/services")
    app.register_blueprint(functions_bp, url_prefix="/api/functions")

    # REGISTER application specific API endpoint groups
    app.register_blueprint(session_bp, url_prefix="/api/session")
    app.register_blueprint(event_bp, url_prefix="/api/event")
    #
    # ADD more api endpoint groups here as needed
    #

    if __name__ == "__main__":
        app.run(host="0.0.0.0", port=PORT, debug=(ENV == "dev"))
