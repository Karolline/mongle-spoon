import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import recipes
from app.store import RecipeStore

DEFAULT_CORS_ORIGINS = "http://localhost:5173"


def create_app(store: RecipeStore | None = None) -> FastAPI:
    """Build the app. Without a store, one backed by DATABASE_URL is used."""
    if store is None:
        store = RecipeStore()

    app = FastAPI(title="Mongle Spoon API", version="0.1.0")
    app.state.store = store

    origins = os.environ.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in origins.split(",") if o.strip()],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(recipes.router)
    return app


app = create_app()
