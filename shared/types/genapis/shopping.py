from typing import List

from pydantic import BaseModel
from shared.types.general import GenApiBaseInput, GenApiBaseOutput


class ShoppingValuesInput(BaseModel):
    character_name: str
    character_type: str
    event_type: str
    spending_limit: int
    min_items: int
    max_items: int


class ShoppingInput(GenApiBaseInput[ShoppingValuesInput]):
    # values: ShoppingValuesInput # Just for FYI - this is set via generics - leave commented out
    pass


class ShoppingItem(BaseModel):
    item_name: str
    total_price: int
    quantity: int


class ShoppingOutput(GenApiBaseOutput):
    summary: str
    total_price: int
    list: List[ShoppingItem]
