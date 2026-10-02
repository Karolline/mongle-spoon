import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import admin_password_from_env
from app.routers import auth, recipes
from app.store import RecipeStore

DEFAULT_CORS_ORIGINS = "http://localhost:5173"

logger = logging.getLogger(__name__)


def create_app(store: RecipeStore | None = None) -> FastAPI:
    """Build the app. Without a store, one backed by DATABASE_URL is used.

    The admin password for writes is read from ADMIN_PASSWORD (see app/auth.py).
    """
    if store is None:
        store = RecipeStore()

    app = FastAPI(title="Mongle Spoon API", version="0.1.0")
    app.state.store = store
    app.state.admin_password = admin_password_from_env()
    if app.state.admin_password is None:
        logger.warning("ADMIN_PASSWORD is not set: creating, editing and deleting are disabled")

    origins = os.environ.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in origins.split(",") if o.strip()],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(recipes.router)
    app.include_router(auth.router)
    return app


app = create_app()
