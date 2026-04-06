from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.routers import auth, recipes
from app.database import init_db
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Food AI API", version="1.0.0")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    first_error = exc.errors()[0] if exc.errors() else None
    message = "Некорректные данные"

    if first_error:
        error_type = first_error.get("type", "")
        field_name = first_error.get("loc", [])[-1]

        if field_name == "email":
            message = "Введите корректный email"
        elif field_name == "password":
            if "too_short" in error_type:
                message = "Пароль не может быть короче 6 символов"
            else:
                message = "Некорректный пароль"
        elif field_name == "name":
            if "too_short" in error_type:
                message = "Имя должно содержать минимум 2 символа"
            else:
                message = "Некорректное имя"
        else:
            message = first_error.get("msg", message)

    return JSONResponse(status_code=422, content={"detail": message})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"], 
)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(recipes.router)

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.get("/")
async def root():
    return {"message": "Food AI API is running!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
