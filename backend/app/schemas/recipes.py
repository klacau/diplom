from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# --------- Nested (JSON fields) ---------

class Ingredient(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    amount: str = Field(min_length=1, max_length=120)
    image_url: Optional[str] = None


class Step(BaseModel):
    step: int = Field(ge=1)
    text: str = Field(min_length=1, max_length=2000)


# --------- Requests ---------

class GenerateRecipeRequest(BaseModel):
    products: List[str] = Field(min_length=1, max_length=40)
    servings: Optional[int] = Field(default=2, ge=1, le=20)
    recipes_count: int = Field(default=3, ge=1, le=10)
    preferences: Optional[str] = Field(default=None, max_length=400)


class RecipeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=4000)

    ingredients: List[Ingredient] = Field(default_factory=list)
    steps: List[Step] = Field(default_factory=list)


# --------- Responses ---------

class RecipeCardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    created_at: datetime


class RecipeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int

    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None

    ingredients: List[Ingredient]
    steps: List[Step]

    created_at: datetime


class RecipeListOut(BaseModel):
    items: List[RecipeCardOut]
    total: int
    skip: int
    limit: int
