# Mongle Spoon

A small web app for saving the recipes I cook for my baby and looking them up quickly on my phone.

Built as the Module 2 homework project for [AI Dev Tools Zoomcamp 2026](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp) by DataTalks.Club.

## Status

Frontend and FastAPI backend are connected over HTTP, and recipes are stored in SQLite through SQLAlchemy. The Docker image bundles both (see [Docker](#docker)). See [`product-spec.md`](product-spec.md).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript (Node.js), TanStack Router, Tailwind CSS, Vitest |
| Backend | Python (managed with `uv`) + FastAPI (OpenAPI) |
| Database | SQLAlchemy + SQLite |

## Repository layout

```
product-spec.md  # Product specification
openapi.yaml     # API contract between frontend and backend
AGENTS.md        # Instructions for coding agents
docs/            # Supporting docs (testing, ...)
frontend/        # Frontend app
backend/         # FastAPI backend and tests
Dockerfile       # Single image: backend serving the built frontend
```

## Running locally

From the repo root, start each dev server in its own terminal:

```
make run back    # backend, http://localhost:8000
make run front   # frontend, http://localhost:5173
```

On Windows, install GNU make first (e.g. `winget install ezwinports.make`). The per-app commands below do the same without make.

### Frontend

Requires Node.js 20.19+ or 22.12+. The frontend calls the backend at `http://localhost:8000`, so start the backend first.

```
cd frontend
npm install
npm run dev     # http://localhost:5173
npm test
```

Optional settings (put them in `frontend/.env.local`, see `frontend/.env.example`):

- `VITE_API_BASE_URL`: backend API root (default `http://localhost:8000/api`)
- `VITE_USE_MOCK_API=true`: run against the in-memory mock instead of the backend (tests always use the mock)

### Backend

Requires Python 3.13+ and [`uv`](https://docs.astral.sh/uv/).

```
cd backend
uv sync
uv run python -m app.devserver         # API at http://localhost:8000/api, docs at /docs
uv run python -m app.seed               # optional: sample recipes, only into an empty DB
uv run pytest                           # all tests (unit + integration)
```

`app.devserver` runs uvicorn with `--reload`, but first refuses to start if port 8000 is already taken. On Windows uvicorn would otherwise share the port with a leftover server (e.g. one whose terminal was closed without `Ctrl+C`), and requests could silently go to that old server.

Recipes are stored in `backend/mongle_spoon.db` by default. Set `DATABASE_URL` (any SQLAlchemy URL) to use another file or database.

Allowed CORS origins come from `CORS_ORIGINS` (comma-separated, default `http://localhost:5173`).

### Write password

Anyone with the URL can view recipes, but adding, editing, and deleting need a password. The backend reads it from `ADMIN_PASSWORD`:

- `make run back` sets it to `dev` unless you pass another one (`make run back ADMIN_PASSWORD=...`).
- Running the server directly, set it yourself, e.g. `ADMIN_PASSWORD=dev uv run python -m app.devserver`.
- If it is unset, the app still runs but every write returns 503. A deployment that forgets it is read-only, not open.
- Use printable ASCII only (it is sent in an HTTP header). Always deploy behind HTTPS so it is not sent in plain text.

In the app, the first add, edit, or delete asks for the password and the browser remembers it. [잠금] on the list screen forgets it. With `VITE_USE_MOCK_API=true` the password is `1234`.

## Docker

The `Dockerfile` builds the frontend with Node, then a Python image where FastAPI serves the API under `/api` and the frontend everywhere else, on one port.

```
docker build -t mongle-spoon .
docker run -p 8000:8000 -e ADMIN_PASSWORD=change-me -v mongle-data:/data mongle-spoon
```

Then open http://localhost:8000.

- `ADMIN_PASSWORD`: required for writes (see [Write password](#write-password)).
- The SQLite file is `/data/mongle_spoon.db`. Mount a volume on `/data`, or the recipes are lost when the container is removed. Set `DATABASE_URL` to use another database.
- The server listens on `$PORT` when set (many hosting platforms set it), otherwise 8000.
- The image runs uvicorn directly; `app.devserver` is for local development only.

## Testing

Backend tests are split into `backend/tests/unit/` (the store on its own) and `backend/tests/integration/` (HTTP endpoints and end-to-end user workflows against a real SQLite file). Run one group with `uv run pytest tests/unit` or `uv run pytest tests/integration`. See [`docs/testing.md`](docs/testing.md) for what each suite covers.
