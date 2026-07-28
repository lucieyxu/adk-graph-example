from typing import Optional

from pydantic import BaseModel
from shared.types.general import GenApiBaseInput, GenApiBaseOutput
from shared.types.generate.image import GenerateImageOutput


class VisualizeValuesInput(BaseModel):
    image_style: str
    character_name: str
    character_type: str
    event_type: str
    items: str


class Edit(BaseModel):
    image_input: str
    prompt: str


class VisualizeInput(GenApiBaseInput[VisualizeValuesInput]):
    # values: VisualizeValuesInput # Just for FYI - this is set via generics - leave commented out
    edit: Optional[Edit] = None
    pass


class VisualizeOutput(GenerateImageOutput, GenApiBaseOutput):
    pass
