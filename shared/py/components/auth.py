# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #


import google.auth
import google.auth.transport.requests as tr_requests
import google.oauth2.id_token
import requests
from google.auth import impersonated_credentials
from google.auth.transport.requests import Request
from shared.py.config import ENV, GCP_SERVICE_ACCOUNT


def get_token():
    creds = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])[0]  # type: ignore

    if ENV == "dev":
        # SERVICE account is impersonated, and the token generation process is different
        impersonated_creds = impersonated_credentials.Credentials(
            source_credentials=creds,  # type: ignore
            target_principal=GCP_SERVICE_ACCOUNT,
            target_scopes=["https://www.googleapis.com/auth/cloud-platform"],
            lifetime=3600,  # Token lifetime in seconds (max 3600)
        )
        impersonated_creds.refresh(Request())  # type: ignore
        access_token = impersonated_creds.token  # type: ignore
        return str(access_token)  # type: ignore

    else:
        creds.refresh(Request())  # type: ignore
        access_token = creds.token  # type: ignore
        return str(access_token)  # type: ignore


def get_id_token(host_url: str):
    if not ENV == "dev":
        auth_req = Request()
        id_token = str(google.oauth2.id_token.fetch_id_token(auth_req, host_url))  # type: ignore
    else:
        id_token = ""
    return id_token


def get_creds():  # type: ignore
    creds = google.auth.default()[0]  # type: ignore

    if ENV == "dev":
        # SERVICE account is impersonated, and the token generation process is different
        impersonated_creds = impersonated_credentials.Credentials(
            source_credentials=creds,  # type: ignore
            target_principal=GCP_SERVICE_ACCOUNT,
            target_scopes=["https://www.googleapis.com/auth/cloud-platform"],
            lifetime=3600,  # Token lifetime in seconds (max 3600)
        )
        return impersonated_creds

    else:
        return creds  # type: ignore


def get_request_interface():
    if not ENV == "dev":
        # USE authed session in deployed environment
        creds = get_creds()  # type: ignore
        authed_session = tr_requests.AuthorizedSession(creds)  # type: ignore
        r = authed_session
    else:
        # USE standard requests module for local dev
        r = requests
    return r


def get_current_user() -> str:
    creds = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])[0]  # type: ignore
    request = Request()
    creds.refresh(request)  # type: ignore
    user = str(creds.service_account_email)  # type: ignore
    return user


CURRENT_ADC_SA = get_current_user()
