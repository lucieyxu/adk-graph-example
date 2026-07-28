import json
import os

from pydantic import BaseModel, TypeAdapter
from shared.py.components.utils import snake_case_dict
from shared.py.config import ENV

cwd = os.path.dirname(__file__)


# - - - URL SET
#
#   Contains a map of all the urls for the app, organized by ENV
#   KEEP in sync with the structure of /shared/config/urls.json, using snake_case,
#   and ignoring the "storybook" urls for local frontend development
#
class UrlSet(BaseModel):
    appengine_default_frontend: str
    appengine_default_backend: str
    appengine_public_frontend: str
    appengine_public_backend: str
    services_py_example: str
    services_ts_example: str

    def get(self, search: str) -> str | None:
        dict_data: dict[str, str] = self.model_dump()

        if search not in dict_data:
            print(f"ERROR looking for app/service url not found in map: {search}")
            return None

        return dict_data[search]


#
# - - - READ urls from JSON file, create instance of UrlSet class
#
UrlSetAdapter = TypeAdapter(UrlSet)
data = {}
file_path = os.path.join(cwd, "..", "..", "config", "urls.json")
with open(file_path, "r", encoding="utf-8") as file:
    raw_data = json.load(file)[ENV]
    data = snake_case_dict(raw_data)

# IMPORT this from your app or service
urls = UrlSetAdapter.validate_python(data)
