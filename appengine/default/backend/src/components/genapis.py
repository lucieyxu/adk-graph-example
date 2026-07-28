# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - ✅ Code Template: ADD the custom demo functionality ✅ - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

from shared.py.components import models
from shared.py.components.gemini import (
    edit_gemini_image,
    generate_gemini_image,
    generate_json_simple,
)
from shared.py.components.genapis import GenApi
from shared.py.components.imagen import edit_image, generate_image
from shared.py.components.urls import urls
from shared.py.config import GCP_BUCKET_NAME
from shared.types.genapis.shopping import ShoppingInput, ShoppingOutput
from shared.types.genapis.visualize import VisualizeInput, VisualizeOutput
from shared.types.general import Media
from shared.types.generate.image import (
    GenerateEditedImageInput,
    GenerateGeminiImageSimpleInput,
    GenerateGeminiImageWithMediaInput,
    GenerateNewImageInput,
)
from shared.types.generate.json import GenerateJsonSimpleInput

from routes.core.genapis import genapis_bp


def genapis_setup():
    #
    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  EXAMPLE shopping endpoint
    #

    def shopping_gen_api_generate_task(
        model: str, prompt: str, valid_input: ShoppingInput, output_schema: type[ShoppingOutput]
    ):
        gemini_input = GenerateJsonSimpleInput(
            variant="SIMPLE",
            response_schema=output_schema,
            prompt=prompt,
            model=model,
        )
        result = generate_json_simple(gemini_input)
        # Generate json returns an instance of ShoppingOutput, no further conversion necessary
        return result

    _shopping_gen_api = GenApi(
        url=f"{urls.appengine_default_backend}/api/genapis/shopping",
        preferred_model=models.DEFAULT_GEMINI_LITE_MODEL,
        preferred_model_category="gemini_lite",
        compatible_model_categories=["gemini_flash", "gemini_lite", "gemini_pro"],
        input_schema=ShoppingInput,
        output_schema=ShoppingOutput,
        generate_task=shopping_gen_api_generate_task,
        flask_api_group=genapis_bp,
        prompt="""
Create a shopping list of __MIN_ITEMS__ to __MAX_ITEMS__ items, for __CHARACTER_NAME__, who is a
__CHARACTER_TYPE__, and is getting ready to attend a __EVENT_TYPE__. __CHARACTER_NAME__ has
$__SPENDING_LIMIT__ to spend, and must buy everything they need to have a good time! Also include a
summary of why you chose these items, that is 1-2 sentences.
        """,
    )

    #
    # - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - EXAMPLE visualize endpoint
    #

    def visualize_gen_api_generate_task(
        model: str, prompt: str, valid_input: VisualizeInput, output_schema: type[VisualizeOutput]
    ):
        output_gcs_uri = f"gs://{GCP_BUCKET_NAME}/sessions/{valid_input.session_id}"

        if "gemini" in model:
            if valid_input.edit:
                gemini_input = GenerateGeminiImageWithMediaInput(
                    model=model,
                    prompt=valid_input.edit.prompt,
                    media=[Media(file=valid_input.edit.image_input)],
                    output_gcs_uri=output_gcs_uri,
                )
                result = edit_gemini_image(gemini_input)
            else:
                gemini_input = GenerateGeminiImageSimpleInput(
                    model=model,
                    prompt=prompt,
                    output_gcs_uri=output_gcs_uri,
                )
                result = generate_gemini_image(gemini_input)

        else:
            if valid_input.edit:
                imagen_input = GenerateEditedImageInput(
                    variant="EDIT",
                    prompt=valid_input.edit.prompt,
                    model=model,
                    input_image=valid_input.edit.image_input,
                    output_gcs_uri=output_gcs_uri,
                )
                result = edit_image(imagen_input)
            else:
                imagen_input = GenerateNewImageInput(
                    variant="NEW",
                    prompt=prompt,
                    model=model,
                    output_gcs_uri=output_gcs_uri,
                )
                result = generate_image(imagen_input)

        # Generate image returns an instance of GenerateImageOutput, but we need a dict dump so that
        # that dict will validate as VisualizeOutputAdapter
        output = result.model_dump()

        return output

    _visualize_gen_api = GenApi(
        url=f"{urls.appengine_default_backend}/api/genapis/visualize",
        preferred_model=models.DEFAULT_GEMINI_FLASH_IMAGE_MODEL,
        preferred_model_category="gemini_flash_image",
        compatible_model_categories=["gemini_flash_image", "gemini_pro_image"],
        input_schema=VisualizeInput,
        output_schema=VisualizeOutput,
        generate_task=visualize_gen_api_generate_task,
        flask_api_group=genapis_bp,
        prompt="""
Generate an image, in the style of __IMAGE_STYLE__, that shows __CHARACTER_NAME__, who is a
__CHARACTER_TYPE__, attending a __EVENT_TYPE__, and is fully prepared with __ITEMS__. Make sure to
use text to and lines to indicate each of the product items. Also he is wearing skis.
        """,
    )

    #
    # ADD other example prompts and types initialization here
    #
    #
