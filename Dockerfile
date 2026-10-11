# One image for the whole app: FastAPI serves the API under /api and the
# built frontend everywhere else.
#
#   docker build -t mongle-spoon .
#   docker run -p 8000:8000 -e ADMIN_PASSWORD=... -v mongle-data:/data mongle-spoon

# --- Stage 1: build the frontend -------------------------------------------
FROM node:24-alpine AS frontend

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# Same origin as the backend, so the API is just /api.
ENV VITE_API_BASE_URL=/api
# The commit shown next to the version on the list screen (CI passes it).
# Declared here, after npm ci, so a new commit doesn't reinstall packages.
ARG GIT_COMMIT=""
RUN npm run build

# --- Stage 2: backend + frontend build -------------------------------------
FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:0.12.21 /uv /bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app/backend
# Dependencies first, so code changes don't reinstall them.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY backend/app ./app
COPY --from=frontend /app/frontend/dist /app/frontend/dist

# SQLite lives in /data; mount a volume there or the data dies with the container.
RUN useradd --system --no-create-home app && mkdir /data && chown app /data
USER app

ENV PATH="/app/backend/.venv/bin:$PATH" \
    FRONTEND_DIST=/app/frontend/dist \
    DATABASE_URL=sqlite:////data/mongle_spoon.db

EXPOSE 8000
# Hosting platforms often pass the port in $PORT.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
