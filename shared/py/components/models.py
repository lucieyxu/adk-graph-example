# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

import re
from typing import List

import google.genai as genai
from shared.py.config import GCP_LOCATION, GCP_PROJECT_ID
from shared.types.general import ModelRecord, ModelsInfo

AcceptablePreviewModels = [
    #
    # ADD all models that are experimental or preview that should be allowed
    #
    # Gemini Pro
    "gemini-3.1-pro-preview",
    "gemini-3-pro-preview",
    #
    # ... add more here as necessary
    #
]

GlobalOnlyGaModels = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-3-pro-image",
    "gemini-3.1-flash-image",
]


models = ModelsInfo()
models_dict = models.model_dump()


def expand_endpoint(model: str, is_ga: bool):
    if is_ga:
        return (
            f"projects/{GCP_PROJECT_ID}/locations/{GCP_LOCATION}/publishers/google/models/{model}"
        )
    else:
        return f"projects/{GCP_PROJECT_ID}/locations/global/publishers/google/models/{model}"


def get_model_version(base_name: str, model_name: str):
    # pattern = rf"{base_name}-([\d.]+)-"
    pattern = rf"(?<={base_name}-)[0-9]+\.?[0-9]*(?=-|$)"
    match = re.search(pattern, model_name)
    if match:
        version = float(match.group(0))
        return version
    else:
        return 0


def get_model_by_name(name: str):
    return models.get(name)


def query_models():
    global models
    global models_dict

    # HARDCODE any missing model names that are not returned in client.modelds.list()
    all_models: List[str] = []

    client_local = genai.Client(vertexai=True, project=GCP_PROJECT_ID, location=GCP_LOCATION)
    client_global = genai.Client(vertexai=True, project=GCP_PROJECT_ID, location="global")

    models_local = [m for m in client_local.models.list()]
    models_global = [m for m in client_global.models.list()]

    for model in [*models_local, *models_global]:
        name = str(model.name).replace("publishers/google/models/", "")
        if name not in all_models:
            all_models.append(name)

    for name in [*AcceptablePreviewModels, *GlobalOnlyGaModels]:
        if name not in all_models:
            all_models.append(name)

    for name in all_models:
        ga = "preview" not in name and "experimental" not in name and name not in GlobalOnlyGaModels
        allowed = ga or name in AcceptablePreviewModels or name in GlobalOnlyGaModels

        # GEMINI models
        if name.startswith("gemini"):
            version = get_model_version("gemini", name)
            is_pro = "pro" in name
            is_lite = "lite" in name
            is_image = "image" in name
            m = ModelRecord(name=name, version=version, ga=ga)
            if version > 0 and allowed:
                if is_image:
                    if is_pro:
                        models.gemini_pro_image.append(m)
                    else:
                        models.gemini_flash_image.append(m)
                else:
                    if is_pro:
                        models.gemini_pro.append(m)
                    elif is_lite:
                        models.gemini_lite.append(m)
                    else:
                        models.gemini_flash.append(m)

        # IMAGEN models
        if name.startswith("imagen"):
            version = get_model_version("imagen", name)
            is_fast = "fast" in name
            m = ModelRecord(name=name, version=version, ga=ga)
            if version > 0 and allowed:
                if is_fast:
                    models.imagen_fast.append(m)
                else:
                    models.imagen.append(m)

        # VEO models
        elif name.startswith("veo"):
            version = get_model_version("veo", name)
            is_fast = "fast" in name
            m = ModelRecord(name=name, version=version, ga=ga)
            if version > 0 and allowed:
                if is_fast:
                    models.veo_fast.append(m)
                else:
                    models.veo.append(m)

        # LYRIA models
        elif name.startswith("lyria"):
            version = get_model_version("lyria", name)
            m = ModelRecord(name=name, version=version, ga=ga)
            if version > 0 and allowed:
                models.lyria.append(m)

        #
        # ADD any other models here
        #

    # SORT each category by model version, GA status, and string length (shorter is better, if all
    # else matches)
    for category in models:
        list: List[ModelRecord] = getattr(models, category[0])
        list.sort(key=lambda x: (-float(x.version), not x.ga, len(x.name)))
        if len(list) == 0:
            print(f"CRITICAL ERROR: no active models found for model category {category}")

    models_dict = models.model_dump()
    for category in models_dict:
        models_dict[category] = [x["name"] for x in models_dict[category]]


def get_model_location(model_name: str) -> str:
    model = get_model_by_name(model_name)
    if not model:
        print(f"ERROR looking up model location, model name not found: {model_name}")
        return GCP_LOCATION

    if not model.ga:
        # Model is in preview or experimental state, use global
        return "global"
    else:
        # Model is in GA status, use project location
        return GCP_LOCATION


query_models()

#
# - - - DEFAULT model names per category
#
DEFAULT_GEMINI_FLASH_MODEL = models.gemini_flash[0].name if len(models.gemini_flash) > 0 else ""
DEFAULT_GEMINI_LITE_MODEL = models.gemini_lite[0].name if len(models.gemini_lite) > 0 else ""
DEFAULT_GEMINI_PRO_MODEL = models.gemini_pro[0].name if len(models.gemini_pro) > 0 else ""
DEFAULT_IMAGEN_MODEL = models.imagen[0].name if len(models.imagen) > 0 else ""
DEFAULT_IMAGEN_FAST_MODEL = models.imagen_fast[0].name if len(models.imagen_fast) > 0 else ""
DEFAULT_VEO_MODEL = models.veo[0].name if len(models.veo) > 0 else ""
DEFAULT_VEO_FAST_MODEL = models.veo_fast[0].name if len(models.veo_fast) > 0 else ""
DEFAULT_GEMINI_PRO_IMAGE_MODEL = (
    models.gemini_pro_image[0].name if len(models.gemini_pro_image) > 0 else ""
)
DEFAULT_GEMINI_FLASH_IMAGE_MODEL = (
    models.gemini_flash_image[0].name if len(models.gemini_flash_image) > 0 else ""
)
