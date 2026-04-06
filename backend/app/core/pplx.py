import json
import os
import re
import time
import uuid
from pathlib import Path

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

GIGACHAT_OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
GIGACHAT_API_URL = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions"
GIGACHAT_FILES_URL = "https://gigachat.devices.sberbank.ru/api/v1/files"
_TOKEN_CACHE: dict[str, float | str | None] = {"access_token": None, "expires_at": 0.0}


def _recipes_prompt(
    products: list[str],
    servings: int | None,
    preferences: str | None,
    recipes_count: int,
) -> str:
    prefs = preferences or "нет"
    serv = servings or 2
    products_text = ", ".join(products)

    return f"""
Ты кулинарный помощник. Твоя задача: предлагать только реальные, адекватные рецепты.

Доступные продукты пользователя:
{products_text}

Порций: {serv}
Пожелания: {prefs}

Жесткие правила:
1. Используй только продукты из списка пользователя.
2. Нельзя добавлять никакие новые ингредиенты: ни соль, ни сахар, ни масло, ни воду, ни специи, ни соусы.
3. Если из этих продуктов нельзя приготовить нормальное самостоятельное блюдо, верни:
{{"recipes":[]}}
4. Не придумывай абсурдные рецепты.
5. Пользователь запросил {recipes_count} рецептов.
6. Если из продуктов реально можно составить {recipes_count} разных адекватных рецептов, верни ровно {recipes_count} рецептов.
7. Если продуктов объективно недостаточно, можно вернуть меньше, но только если иначе пришлось бы выдумывать ерунду.
7. Каждый рецепт должен быть кулинарно правдоподобным.
8. Каждый ингредиент в recipes[].ingredients должен быть только из списка пользователя.
9. Ответ верни строго как валидный JSON без markdown и без пояснений.
10. Не возвращай больше {recipes_count} рецептов.

Формат ответа:
{{
  "recipes": [
    {{
      "title": "string",
      "description": "string",
      "ingredients": [{{"name":"string","amount":"string"}}],
      "steps": [{{"step":1,"text":"string"}}]
    }}
  ]
}}
""".strip()


def _ssl_verify() -> bool:
    return os.getenv("GIGACHAT_VERIFY_SSL", "false").lower() in {"1", "true", "yes", "on"}


def _extract_json(content: str) -> dict:
    text = content.strip()
    if text.startswith("```"):
        lines = [line for line in text.splitlines() if not line.strip().startswith("```")]
        text = "\n".join(lines).strip()
    return json.loads(text)


def _extract_file_id(content: str) -> str | None:
    patterns = [
        r'<img\s+src="([^"]+)"',
        r"<img\s+src='([^']+)'",
        r'src="([^"]+)"',
        r"src='([^']+)'",
    ]
    for pattern in patterns:
        match = re.search(pattern, content)
        if match:
            return match.group(1)
    return None

def _get_gigachat_token() -> str:
    cached_token = _TOKEN_CACHE["access_token"]
    expires_at = float(_TOKEN_CACHE["expires_at"] or 0.0)
    if cached_token and time.time() < expires_at - 30:
        return str(cached_token)

    auth_key = os.getenv("GIGACHAT_AUTH_KEY")
    scope = os.getenv("GIGACHAT_SCOPE", "GIGACHAT_API_PERS")
    if not auth_key:
        raise RuntimeError("GIGACHAT_AUTH_KEY is not set")

    headers = {
        "Authorization": f"Basic {auth_key}",
        "RqUID": str(uuid.uuid4()),
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    }

    resp = requests.post(
        GIGACHAT_OAUTH_URL,
        headers=headers,
        data={"scope": scope},
        timeout=60,
        verify=_ssl_verify(),
    )
    resp.raise_for_status()

    data = resp.json()
    access_token = data["access_token"]
    expires_at_ms = data.get("expires_at", 0)

    _TOKEN_CACHE["access_token"] = access_token
    _TOKEN_CACHE["expires_at"] = (float(expires_at_ms) / 1000) if expires_at_ms else (time.time() + 1800)
    return access_token


def _download_image(file_id: str, access_token: str) -> bytes | None:
    img_resp = requests.get(
        f"{GIGACHAT_FILES_URL}/{file_id}/content",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "image/jpg",
        },
        timeout=60,
        verify=_ssl_verify(),
    )
    img_resp.raise_for_status()
    return img_resp.content


def _generate_image_from_prompt(prompt: str, system_prompt: str, debug_label: str) -> bytes | None:
    access_token = _get_gigachat_token()

    payload = {
        "model": os.getenv("GIGACHAT_MODEL", "GigaChat-2"),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "function_call": "auto",
        "temperature": 0.2,
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    resp = requests.post(
        GIGACHAT_API_URL,
        headers=headers,
        json=payload,
        timeout=180,
        verify=_ssl_verify(),
    )
    resp.raise_for_status()

    content = resp.json()["choices"][0]["message"]["content"]
    print(f"{debug_label} content:", content)

    file_id = _extract_file_id(content)
    if not file_id:
        return None

    return _download_image(file_id, access_token)


def generate_recipes_pplx(
    products: list[str],
    servings: int | None = 2,
    recipes_count: int = 3,
    preferences: str | None = None,
) -> list[dict]:
    model = os.getenv("GIGACHAT_MODEL", "GigaChat-2")
    access_token = _get_gigachat_token()

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Ты отвечаешь только валидным JSON без markdown и пояснений."},
            {"role": "user", "content": _recipes_prompt(products, servings, preferences, recipes_count)},
        ],
        "temperature": 0.2,
        "max_tokens": 1200,
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    resp = requests.post(
        GIGACHAT_API_URL,
        headers=headers,
        json=payload,
        timeout=180,
        verify=_ssl_verify(),
    )
    resp.raise_for_status()

    data = resp.json()
    text = data["choices"][0]["message"]["content"]
    obj = _extract_json(text)

    recipes = obj.get("recipes", [])
    if not isinstance(recipes, list):
        raise ValueError("Invalid recipes format")
    return recipes[:recipes_count]


def generate_recipe_image(title: str, ingredients: list[dict]) -> bytes | None:
    ingredients_text = ", ".join(i["name"] for i in ingredients[:5])

    prompt = (
        f"Сгенерируй фотореалистичное изображение готового блюда '{title}'. "
        f"Основные ингредиенты: {ingredients_text}. "
        "Нужно именно готовое блюдо крупным планом, food photography, реалистично. "
        "Без текста, без коллажей, без упаковки."
    )

    system_prompt = "Ты генерируешь только фотореалистичные изображения готовых блюд."

    return _generate_image_from_prompt(prompt, system_prompt, "recipe image")


def generate_ingredient_image(name: str) -> bytes | None:
    prompt = (
        f"Сгенерируй фотореалистичное изображение одного ингредиента: {name}. "
        "Нужен только сам продукт на нейтральном фоне. "
        "Без тарелок, без готового блюда, без текста, без упаковки."
    )

    system_prompt = "Ты генерируешь только фотореалистичные изображения отдельных продуктов."

    return _generate_image_from_prompt(prompt, system_prompt, "ingredient image")


def save_generated_image(image_bytes: bytes) -> str:
    folder = Path("static/generated")
    folder.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4()}.jpg"
    path = folder / filename
    path.write_bytes(image_bytes)

    return f"/static/generated/{filename}"


