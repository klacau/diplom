from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.pplx import (
    generate_ingredient_image,
    generate_recipe_image,
    generate_recipes_pplx,
    save_generated_image,
)
from app.database import get_db
from app.models.recipes import Recipe
from app.models.users import User
from app.schemas.recipes import GenerateRecipeRequest, RecipeOut

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Recipe).where(Recipe.id == recipe_id, Recipe.owner_id == user.id)
    )
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    await db.delete(obj)
    await db.commit()


@router.post("/generate", response_model=List[RecipeOut])
async def generate(
    req: GenerateRecipeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    recipes = generate_recipes_pplx(
        req.products,
        req.servings,
        req.recipes_count,
        req.preferences,
    )

    if not recipes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Из этих продуктов не получается нормальный рецепт. Добавь еще ингредиенты.",
        )

    created: List[Recipe] = []

    for r in recipes:
        recipe_image_url = None

        try:
            print("Generating recipe image for:", r["title"])
            recipe_image_bytes = generate_recipe_image(
                r["title"],
                r.get("ingredients", []),
            )
            if recipe_image_bytes:
                recipe_image_url = save_generated_image(recipe_image_bytes)
                print("Recipe image saved:", recipe_image_url)
            else:
                print("Recipe image was not generated for:", r["title"])
        except Exception as e:
            print("Recipe image error:", r["title"], e)
            recipe_image_url = None

        ingredients_with_images = []

        for ingredient in r.get("ingredients", []):
            ingredient_image_url = None

            try:
                print("Generating ingredient image for:", ingredient["name"])
                ingredient_image_bytes = generate_ingredient_image(ingredient["name"])
                if ingredient_image_bytes:
                    ingredient_image_url = save_generated_image(ingredient_image_bytes)
                    print("Ingredient image saved:", ingredient["name"], ingredient_image_url)
                else:
                    print("Ingredient image was not generated for:", ingredient["name"])
            except Exception as e:
                print("Ingredient image error:", ingredient["name"], e)
                ingredient_image_url = None

            ingredient_payload = {
                "name": ingredient["name"],
                "amount": ingredient["amount"],
                "image_url": ingredient_image_url,
            }
            print("Ingredient payload appended:", ingredient_payload)
            ingredients_with_images.append(ingredient_payload)

        print("FINAL ingredients_with_images:", ingredients_with_images)

        obj = Recipe(
            owner_id=user.id,
            title=r["title"],
            description=r.get("description"),
            image_url=recipe_image_url,
            ingredients=ingredients_with_images,
            steps=r.get("steps", []),
        )

        db.add(obj)
        created.append(obj)

    await db.commit()

    for obj in created:
        await db.refresh(obj)
        print("Saved recipe ingredients from DB:", obj.ingredients)

    return created


@router.get("", response_model=List[RecipeOut])
async def list_recipes(
    skip: int = 0,
    limit: int = 6,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Recipe)
        .where(Recipe.owner_id == user.id)
        .order_by(Recipe.id.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/{recipe_id}", response_model=RecipeOut)
async def get_recipe(
    recipe_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Recipe).where(Recipe.id == recipe_id, Recipe.owner_id == user.id)
    )
    obj = result.scalars().first()
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )
    return obj


