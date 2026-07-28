# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - ⚠️ Code Template: NO changes are expected to this file ⚠️  - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - #
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

import logging
import time
from typing import Any, Dict, Generic, List, Tuple, TypeVar
from urllib.parse import urlparse

from flask import Blueprint, jsonify, request
from pydantic import TypeAdapter, ValidationError
from shared.py.components.models import models_dict
from shared.py.config import ENV
from shared.types.general import (
    ApiError,
    GenApiBaseGenerateTask,
    GenApiBaseInput,
    GenApiBaseOutput,
    GenApiDescription,
    ModelCategory,
)

T = TypeVar("T", bound=GenApiBaseInput[Any])
U = TypeVar("U", bound=GenApiBaseOutput)


#
# GenApi - a class to facilitate injecting type checked dynamic values into a template str to use
# in generative AI tools. These prompt template strings are allowed to be overriden in dev and
# staging, but not prod. All Prompt instances are registered so as to be served to the frontend on
# dev and staging to allow non-developers to contribute to prompt engineering efforts. These team
# members will iterate on staging, and then share their prompt result with a developer who will
# commit it to the repo.
#
class GenApi(Generic[T, U]):
    name: str
    url: str
    prompt: str
    preferred_model: str
    preferred_model_category: ModelCategory
    compatible_model_categories: List[ModelCategory]
    input_schema: type[T]
    input_schema_json: dict[str, Any]
    input_schema_adapter: TypeAdapter[T]
    input_values_schema: List[Tuple[str, str]]
    output_schema: type[U]
    output_schema_json: dict[str, Any]
    output_schema_adapter: TypeAdapter[U]
    flask_api_group: Blueprint

    def __init__(
        self,
        url: str,
        prompt: str,
        preferred_model: str,
        preferred_model_category: ModelCategory,
        compatible_model_categories: List[ModelCategory],
        input_schema: type[T],
        output_schema: type[U],
        generate_task: GenApiBaseGenerateTask[T, U],
        flask_api_group: Blueprint,
    ):
        self.url = url
        self.prompt = prompt
        self.preferred_model_category = preferred_model_category

        self.name = f"{ENV}-genapi-{urlparse(self.url).path.replace('/api/genapis/', '')}"

        # IF preferred model is not found or no longer active, switch to latest in category
        if preferred_model not in models_dict[self.preferred_model_category]:
            print(f" ⚠️ WARNING⚠️  -- GenApi {self.url} prefers expired model:'{preferred_model}'!")
            m = models_dict[self.preferred_model_category][0]
            print(f"Using latest in category, {preferred_model_category}: {m}")
            self.preferred_model = m
        else:
            self.preferred_model = preferred_model

        self.compatible_model_categories = compatible_model_categories
        self.input_schema = input_schema
        self.output_schema = output_schema
        self.generate_task = generate_task
        self.flask_api_group = flask_api_group

        self.input_schema_json = input_schema.model_json_schema()
        self.input_schema_adapter = TypeAdapter(self.input_schema)
        self.output_schema_json = output_schema.model_json_schema()
        self.output_schema_adapter = TypeAdapter(self.output_schema)

        # PARSE helpful reference list of all the values for string replacement in the prompt
        input_schema_dump: Dict[str, Any] = self.input_schema_json["properties"]["values"]
        self.input_values_schema = []
        if "$ref" in input_schema_dump:
            ref = str(input_schema_dump["$ref"]).replace("#/$defs/", "")
            values_dict: Dict[str, Any] = self.input_schema_json["$defs"][ref]["properties"]
            for k in values_dict.keys():
                t = values_dict[k]["type"]  # type: ignore
                self.input_values_schema.append((k.upper(), str(t)))

        # CREATE api endpoint listener on flask blueprint
        api_path = self.url.split("/api/genapis")[1]  # everything after /api/genapis/

        def handler():
            data = request.json
            try:
                if not data:
                    raise ValidationError("Empty request parameters")

                result = self.generate(data)

                return jsonify(result.model_dump()), 200

            except ValidationError as e:
                message = f"Malformed input: {e}"
                print(f"GenApi ERROR: {self.name} -- {message} -- {data}")
                api_error = ApiError(error=True, input=data, message=message)
                return jsonify(api_error.model_dump()), 400

            except Exception as e:
                message = f"Error generating content: {str(e)}"
                print(f"GenApi ERROR: {self.name} -- {message} -- {data}")
                api_error = ApiError(error=True, input=data, message=message)
                return jsonify(api_error.model_dump()), 500

        self.flask_api_group.add_url_rule(
            api_path,
            endpoint=self.name,
            view_func=handler,
            methods=["POST"],
        )

        all_apis.append(self)

    def generate(self, input: T):
        # VALIDATE values input, will raise an exception that should be excepted by the caller
        valid_input = self.input_schema_adapter.validate_python(input)

        # GUARD against prompt injection on prod
        prompt = f"{self.prompt}"
        if ENV == "prod" and valid_input.prompt_override:
            print(f"GenApi: WARNING, prompt override was supplied in prod for endpoint: {self.url}")
        elif not ENV == "prod" and valid_input.prompt_override:
            prompt = valid_input.prompt_override

        # REPLACE the template str with dynamic values
        populated_str = f"{prompt}"
        input_dict = valid_input.model_dump()
        for key, val in input_dict["values"].items():
            slug = f"__{key.upper()}__"
            if slug not in populated_str:
                logging.warning(
                    f"Populating prompt template for {self.url}, did not find expected key {slug} to populate with values"  # noqa: E501
                )
            populated_str = populated_str.replace(slug, str(val))

        # DETERMINE model to use
        model = f"{self.preferred_model}"
        if valid_input.model_override:
            model = f"{valid_input.model_override}"

        start_time = time.perf_counter()

        result = self.generate_task(
            model=model,
            prompt=populated_str,
            valid_input=valid_input,
            output_schema=self.output_schema,
        )

        end_time = time.perf_counter()

        valid_output = self.output_schema_adapter.validate_python(result)

        valid_output.meta.response_time = end_time - start_time
        valid_output.meta.model = model

        return valid_output

    def describe(self) -> Dict[str, Any]:
        m = GenApiDescription(
            url=self.url,
            prompt=self.prompt,
            preferred_model=self.preferred_model,
            compatible_model_categories=self.compatible_model_categories,
            prompt_substitutions=self.input_values_schema,
        )

        return m.model_dump()


all_apis: List[GenApi[Any, Any]] = []
