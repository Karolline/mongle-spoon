import logging
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import admin_password_from_env
from app.frontend import mount_frontend
from app.routers import auth, recipes
from app.store import RecipeStore

DEFAULT_CORS_ORIGINS = "http://localhost:5173"
API_PREFIX = "/api"

logger = logging.getLogger(__name__)


def create_app(store: RecipeStore | None = None, frontend_dist: Path | None = None) -> FastAPI:
    """Build the app. Without a store, one backed by DATABASE_URL is used.

    The admin password for writes is read from ADMIN_PASSWORD (see app/auth.py).
    The API lives under /api. When a frontend build directory is given (or set in
    FRONTEND_DIST, as the Docker image does), every other path serves the frontend.
    """
    if store is None:
        store = RecipeStore()
    if frontend_dist is None and os.environ.get("FRONTEND_DIST"):
        frontend_dist = Path(os.environ["FRONTEND_DIST"])

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

    app.include_router(recipes.router, prefix=API_PREFIX)
    app.include_router(auth.router, prefix=API_PREFIX)
    if frontend_dist is not None:
        mount_frontend(app, frontend_dist)
    return app


app = create_app()
