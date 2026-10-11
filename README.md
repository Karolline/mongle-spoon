# Mongle Spoon

A small web app for saving the recipes I cook for my baby and looking them up quickly on my phone.

Built as the Module 2 homework project for [AI Dev Tools Zoomcamp 2026](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp) by DataTalks.Club.

## Status

Frontend and FastAPI backend are connected over HTTP, and recipes are stored through SQLAlchemy: SQLite locally, PostgreSQL in production. The Docker image bundles both (see [Docker](#docker)). See [`product-spec.md`](product-spec.md).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript (Node.js), TanStack Router, Tailwind CSS, Vitest |
| Backend | Python (managed with `uv`) + FastAPI (OpenAPI) |
| Database | SQLAlchemy + SQLite (local) / PostgreSQL (production), schema migrations with Alembic |

## Production

Two environments, running the same Docker image. They differ only in their environment variables (`DATABASE_URL`, `ADMIN_PASSWORD`).

| | Dev (internal checks) | Prod (users) |
|---|---|---|
| Hosting | [Render](https://render.com) web service (image from GHCR) | [Render](https://render.com) web service (image from GHCR) |
| Deploys | every push to `main`, after CI passes | when a dev-tested image is promoted (Actions → Promote to prod) |
| Database | [Neon](https://neon.tech) PostgreSQL 18, branch `dev` | [Neon](https://neon.tech) PostgreSQL 18, production branch |

- **CI**: GitHub Actions runs the backend tests on SQLite and PostgreSQL 18, and the frontend test/lint/build, on every push and PR. Nothing deploys unless these checks pass.
- **Container registry**: on `main`, CI builds the Docker image once and pushes it to GHCR (`ghcr.io/karolline/mongle-spoon`, tags `sha-<commit>`, `dev`, and `vX.Y.Z` for releases), then calls the Render dev service's Deploy Hook to run it. Promoting sends that same image to prod, so prod runs exactly what was checked on dev.
- **Database schema**: changed only through Alembic migrations. Each container applies new migrations to its own database when it starts, so a push migrates the dev database and a promotion migrates prod.
- **Deployments** on the GitHub repo page shows which commit each environment last received.
- The app version at the bottom of the list screen shows which version each environment runs.

## Repository layout

```
product-spec.md  # Product specification
openapi.yaml     # API contract between frontend and backend
AGENTS.md        # Instructions for coding agents
docs/            # Supporting docs (testing, ...)
frontend/        # Frontend app
backend/         # FastAPI backend and tests
Dockerfile       # Single image: backend serving the built frontend
docker-compose.yaml  # The image plus a local PostgreSQL
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
uv run python -m app.devserver         # migrates the DB, then API at http://localhost:8000/api, docs at /docs
uv run python -m app.migrate            # only migrate the DB (create or update its tables)
uv run python -m app.seed               # optional: sample recipes, only into an empty DB (migrate first)
uv run python -m app.copy_db "<URL>"    # copy ./mongle_spoon.db into another, empty DB (e.g. production)
uv run pytest                           # all tests (unit + integration)
```

`app.devserver` runs uvicorn with `--reload`, but first refuses to start if port 8000 is already taken. On Windows uvicorn would otherwise share the port with a leftover server (e.g. one whose terminal was closed without `Ctrl+C`), and requests could silently go to that old server.

Recipes are stored in `backend/mongle_spoon.db` by default. Set `DATABASE_URL` to use another database. A PostgreSQL URL can be pasted as given by the host (e.g. Neon's `postgresql://...?sslmode=require`); the backend uses the psycopg driver for it. For a local PostgreSQL, write `127.0.0.1` rather than `localhost` (on Windows, `localhost` may try IPv6 first and hang).

### Database migrations

Tables are created and changed by [Alembic](https://alembic.sqlalchemy.org/) migrations in `backend/migrations/versions/`, never by hand. Each database records the last migration it has in an `alembic_version` table, and `app.migrate` applies only the newer ones. To change the schema:

1. Change the models in `backend/app/db.py`.
2. `uv run alembic revision --autogenerate -m "add pinned_at"` writes a draft migration. Read it and fix what autogenerate got wrong.
3. `uv run python -m app.migrate` applies it to your database (`uv run alembic current` shows where a database is).
4. Commit the model and the migration together. A test fails if the models and the migrations don't match.

Deployments migrate their own database on start. Keep a migration compatible with the previous release (adding a nullable column is fine), because rolling back the image doesn't roll back the database.

A database whose tables were created before Alembic (by older versions of the app) must be marked once as already having the first migration: `uv run alembic stamp f9e81a5676ed` with `DATABASE_URL` pointing at it. Until then, the app refuses to start on it and prints that command. The local SQLite file, the local compose database, and both Neon databases are already stamped.

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
- On start the container applies database migrations (`python -m app.migrate`), then runs uvicorn directly. If migrating fails, it stops instead of serving. `app.devserver` is for local development only.

### Docker Compose (app + PostgreSQL)

`docker-compose.yaml` runs the image against a local PostgreSQL 18, like production:

```
docker compose up -d --build   # build and start both; app on http://localhost:8000
docker compose logs -f app
docker compose down            # stop and remove the containers; data stays
```

- Writes use `ADMIN_PASSWORD` from your environment, default `dev`. `APP_PORT` changes the host port (e.g. `APP_PORT=8080` to run beside `make run back`).
- PostgreSQL is published on `127.0.0.1:5432` (user/password `mongle`, database `mongle_spoon`), so the dev server or `TEST_DATABASE_URL` can use it too. Its data lives in the `mongle-spoon-pgdata` volume; `docker compose down -v` deletes it.

## Testing

Backend tests are split into `backend/tests/unit/` (the store, migrations and scripts on their own) and `backend/tests/integration/` (HTTP endpoints and end-to-end user workflows against a real SQLite file). Run one group with `uv run pytest tests/unit` or `uv run pytest tests/integration`. To run the same tests on PostgreSQL, point `TEST_DATABASE_URL` at a throwaway database (its tables are dropped and recreated): `TEST_DATABASE_URL=postgresql://USER:PASS@127.0.0.1:5432/DBNAME uv run pytest`. See [`docs/testing.md`](docs/testing.md) for what each suite covers.
