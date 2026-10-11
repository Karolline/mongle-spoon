# AGENTS.md

Instructions for coding agents working in this repository.

## Project

Mongle Spoon: a mobile-first web app for saving and looking up baby food recipes.
The spec is [`product-spec.md`](product-spec.md). Read it before starting any task. If a request conflicts with the spec, ask instead of guessing.

## Language

- All UI text is in Korean.
- All code, comments, commit messages, and docs are in English. Exception: [`docs/future-features.md`](docs/future-features.md) (the user's own wishlist) is in Korean.

## Tech stack (fixed, do not change)

- Frontend: React + Vite + TypeScript (Node.js), tested with Vitest, in `frontend/`
- Backend: Python + FastAPI, in `backend/`
- Database: SQLAlchemy. SQLite for local development and tests, PostgreSQL (psycopg) in production. Keep the code database-agnostic (no SQLite- or Postgres-only features); the DB URL comes from an environment variable.

## Commands

Backend (run inside `backend/`, dependencies managed with `uv`, Python 3.13+):

- Install: `uv sync`
- Add a dependency: `uv add <package>` (dev-only: `uv add --dev <package>`)
- Run Python: `uv run python ...`
- Dev server: `uv run python -m app.devserver`, or `make run back` from the repo root (http://localhost:8000, interactive docs at `/docs`). It runs uvicorn with `--reload` but exits if port 8000 is already taken: on Windows uvicorn would otherwise share the port with a leftover server and requests could silently hit old code. Don't start uvicorn directly for local dev.
- Test: `uv run pytest` (unit only: `uv run pytest tests/unit`, integration only: `uv run pytest tests/integration`). On PostgreSQL: set `TEST_DATABASE_URL` to a throwaway database (tests drop and recreate its tables). Run both before committing database changes. `uv run pytest tests/compose` builds and runs `docker-compose.yaml` (needs Docker, not in the default run); run it after changing the Dockerfile or compose file.
- Local PostgreSQL URLs: use `127.0.0.1`, not `localhost`. On this Windows machine `localhost` tries IPv6 first and hangs against a Docker port published on 127.0.0.1.
- Allowed CORS origins: `CORS_ORIGINS` env var, comma-separated (default `http://localhost:5173`)
- Write password: `ADMIN_PASSWORD` env var. Unset means writes return 503. `make run back` defaults it to `dev`.

Frontend (run inside `frontend/`, requires Node.js 20.19+ or 22.12+):

- Install: `npm install`
- Dev server: `npm run dev`, or `make run front` from the repo root (http://localhost:5173)
- Test: `npm test`
- Typecheck + build: `npm run build`
- Lint: `npm run lint`

## Frontend structure

- `src/services/`: the services layer. `types.ts` is the interface (including `isUnlocked`/`unlock`/`lock` for the write password); `httpRecipeService.ts` calls the backend and `mockRecipeService.ts` is the in-memory mock. `index.ts` picks one: HTTP to `VITE_API_BASE_URL` (default `http://localhost:8000/api`), or the mock when `VITE_USE_MOCK_API=true` (always set for Vitest in `vite.config.ts`, so component tests never hit a server). Components never do search, meal-time filtering, or sorting themselves.
- Write password: the HTTP service keeps it in localStorage and sends it as `Authorization: Bearer` on writes only; the mock accepts `MOCK_PASSWORD` (`1234`). Screens gate write actions with `useUnlockGate()` (`src/components/useUnlockGate.tsx`), which shows `PasswordDialog`.
- `src/components/*Screen.tsx`: screens. They receive navigation callbacks as props and never import the router, so they can be tested directly.
- `src/router.tsx`: routes (TanStack Router, client-side only). Route components own navigation.

## Backend structure

- `app/main.py`: `create_app()` wires CORS, the store, and routers. Without a store argument it uses a `RecipeStore` on `DATABASE_URL` (default `sqlite:///./mongle_spoon.db`, relative to `backend/`).
- `app/db.py`: SQLAlchemy tables (`recipes`, `ingredients`, `recipe_meal_times`) and `make_engine()`, which also creates missing tables (no migrations yet). Datetimes are stored as UTC. User-entered text columns are `Text` (PostgreSQL enforces VARCHAR lengths, SQLite doesn't). `normalize_url()` maps plain `postgresql://`/`postgres://` URLs (as Neon gives them) to the psycopg driver.
- `app/models.py`: Pydantic schemas. JSON is camelCase (aliases) to match the frontend types and `openapi.yaml`.
- `app/store.py`: `RecipeStore`, backed by SQLAlchemy. Search, meal-time filtering, and sorting live here (as portable SQL), not in routers. Tests use in-memory SQLite (`sqlite://`) unless `TEST_DATABASE_URL` is set.
- `app/seed.py`: `uv run python -m app.seed` inserts sample recipes, only into an empty database. Nothing is seeded automatically.
- `app/copy_db.py`: `uv run python -m app.copy_db <TARGET_URL> [--source URL]` copies every recipe (ids and timestamps kept) from the local SQLite file into another database, in one transaction. Refuses a target that already has recipes.
- `app/auth.py`: access control. `require_access` is attached to every router and allows everything (reads are public). `require_write` is attached to every write endpoint and checks `Authorization: Bearer <ADMIN_PASSWORD>` (constant-time compare); 401 when wrong, 503 when `ADMIN_PASSWORD` is unset. `POST /api/auth/verify` (`app/routers/auth.py`) lets the frontend check a password.
- `app/routers/`: HTTP endpoints only, mounted under `/api` (so they never clash with frontend routes like `/recipes/<id>`). They get the store through the `get_store` dependency.
- `app/frontend.py`: when `FRONTEND_DIST` is set (the Docker image), serves the built frontend for every non-`/api` path, falling back to `index.html` for client-side routes. Unknown `/api/...` paths stay JSON 404s.
- `tests/unit/`: store-level tests. `tests/integration/`: HTTP endpoint tests and end-to-end workflow tests. `tests/compose/`: smoke tests against the running compose stack. New tests go in the matching folder; see [`docs/testing.md`](docs/testing.md).
- `Dockerfile` (repo root): builds the frontend with Node, then a Python image running the backend with the frontend build. SQLite goes to `/data` (mount a volume) unless `DATABASE_URL` points elsewhere.
- `docker-compose.yaml` (repo root): services `db` (PostgreSQL 18, on `127.0.0.1:5432`, volume `mongle-spoon-pgdata`) and `app` (the image, pointed at `db`). `docker compose up -d --build` `APP_PORT`, `DB_PORT` and `PGDATA_VOLUME` override ports and volume (the compose tests use this to stay off the dev data).
- `.github/workflows/ci.yml`: on every push and PR, backend tests on SQLite and on PostgreSQL 18 (service container), and frontend test/lint/build. On `main`, after those pass, the `image` job builds the Docker image once and pushes it to GHCR (`ghcr.io/karolline/mongle-spoon`) as `sha-<short commit>` and `dev`, passing the commit as the `GIT_COMMIT` build arg. A pushed `vX.Y.Z` git tag adds that tag to the image already built from its commit (never a rebuild). Render doesn't use these images yet. `.github/workflows/compose.yml` runs `tests/compose` only when image or compose inputs change (keep its `paths` list in sync). Render deploys only after these checks pass (see Deployment).
- `openapi.yaml` (repo root) is the contract. Keep it and the backend in sync.
- Versions: one `MAJOR.MINOR.PATCH` for the whole app, in several files, tagged `vX.Y.Z` in git, with changes listed in `CHANGELOG.md`. See [`docs/versioning.md`](docs/versioning.md). Bump the version only when the user asks for a release.

## Deployment

Two environments on Render, built from the same repo and Dockerfile. They differ only in Render environment variables (`DATABASE_URL`, `ADMIN_PASSWORD`).

| | Dev (internal checks) | Prod (users) |
|---|---|---|
| Git branch | `main` | `prod` |
| Deploys | every push to `main`, after CI passes | only when the user promotes `main` to `prod`, after CI passes |
| Database | Neon branch `dev` | Neon production branch |

- Promote: after checking dev, the user runs `git push origin main:prod`. This is a fast-forward: `prod` moves to the commit already tested on dev, and no new commit is made. Never commit to `prod` directly or force-push it; if the push is rejected, find out why.
- Never point dev and prod at the same database.
- A schema change has to reach both databases (`make_engine()` only creates missing tables).
- The app version shown at the bottom of the list screen tells which version each environment runs.

## Rules

- Every backend call from the frontend goes through one services layer, which has a mock implementation with the same interface.
- Ask before adding a new dependency.
- Write tests with every change. All tests must pass before committing.
- Commit regularly, in small commits that each leave the app working.
- Don't push. The user pushes to GitHub themselves, unless they ask for a specific push.
- When I correct you during a session, update the relevant doc so the correction sticks.
