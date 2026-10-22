# For Submitting

This section is for the reviewers of the [AI Dev Tools Zoomcamp Project 1](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp/tree/main/project). It maps each evaluation criterion to where it is covered in this repository. The rest of this README is the normal project documentation.

| # | Criterion | Where / status |
|---|---|---|
| 1 | Problem Description | [Problem description](#1-problem-description) |
| 2 | Product Specification | [`product-spec.md`](product-spec.md) + [GitHub Issues](https://github.com/Karolline/mongle-spoon/issues) (see [2](#2-product-specification)) |
| 3 | Agent Team Specification | [Agent team](#3-agent-team-specification) |
| 4 | Context Management | [`AGENTS.md`](AGENTS.md), [`CLAUDE.md`](CLAUDE.md), [`docs/`](docs/), [`.claude/`](.claude/) (see [4](#4-context-management)) |
| 5 | Application | [Running locally](#running-locally) (see [5](#5-application)) |
| 6 | Testing | [Testing](#testing), [`docs/testing.md`](docs/testing.md) |
| 7 | Containerization | [Docker](#docker), [Docker Compose](#docker-compose-app--postgresql) |
| 8 | Deployment | Live at https://mongle-spoon.onrender.com/ (see [8](#8-deployment)) |
| 9 | CI/CD | [`.github/workflows/`](.github/workflows/) (see [9](#9-cicd)) |
| 10 | Observability | Not implemented (see [10](#10-observability-11-alerting-12-on-call-agent)) |
| 11 | Alerting on User Impact | Not implemented |
| 12 | On-Call Agent | Not implemented |

## 1. Problem description

**Problem.** A parent cooking homemade baby food ends up with recipes scattered across chat messages, screenshots and memory. When deciding what to cook, they need to quickly find a recipe on a phone, often with one hand, and know which ingredients are left over.

**What the system does.** Mongle Spoon is a mobile-first web app (UI in Korean, docs in English) that:

- stores recipes: name (the only required field), ingredients with free-text amounts, servings, meal times (breakfast/lunch/dinner/snack), steps and notes;
- lists recipes sorted by recently cooked or pinned, and searches them by name or ingredient;
- filters by meal time;
- records "I cooked this today" (or another date) and how much of a batch is left;
- lets only the owner write: add, edit, pin, record and delete need a shared password set on the server (`ADMIN_PASSWORD`); anyone with the URL can read.

**Expected behavior.** Open the URL on a phone, see the recipe list, search or filter it, open a recipe. After entering the password once, add/edit/delete recipes and record cooking. Data persists in the database across restarts and deployments. The full behavior is in [`product-spec.md`](product-spec.md); the HTTP contract is [`openapi.yaml`](openapi.yaml).

## 2. Product specification

- Written spec, written before the code and updated as features land: [`product-spec.md`](product-spec.md) (purpose, users and access, recipe fields, search, MVP scope, out of scope, tech stack, development order).
- Public task tracker: [GitHub Issues](https://github.com/Karolline/mongle-spoon/issues) (open and closed). Each issue has a difficulty label, an area label, and a "시작 전에 정할 것" section listing what must be decided first. Issues are written in Korean (the author's language); everything else is English. When work on an issue starts, its feature moves into `product-spec.md`, and the release commit closes the issue with `Closes #N`.
- Agent use of the tracker: the planning skill reads the open issues first and plans from them, and its task brief (goal, behavior, "Done when" acceptance criteria) is handed to the developer agent. See below.

## 3. Agent team specification

The project is built with [Claude Code](https://claude.com/claude-code). The team is defined in [`.claude/`](.claude/), and the human owner is the product owner who answers questions, approves merges and pushes.

| Role | Definition | Responsibility |
|---|---|---|
| **Main session (planner / integrator)** | [`.claude/skills/plan-task/SKILL.md`](.claude/skills/plan-task/SKILL.md) (`/plan-task`) | Reads the backlog, asks the human every user-visible question, shows a mockup of changed screens, writes the task brief, launches the developer, relays the review, merges, and releases. |
| **Developer agent** | [`.claude/agents/developer.md`](.claude/agents/developer.md) | Implements one brief in its own git worktree and branch, with tests and small commits. Cannot ask questions (it stops and reports instead), never commits to `main`, never pushes, never bumps the version. |
| **Reviewer agent** | [`.claude/agents/reviewer.md`](.claude/agents/reviewer.md) | Read-only review of the branch against `AGENTS.md`, the spec and the brief; runs all tests (also on PostgreSQL for DB changes) and reports must-fix findings. |
| **Release-notes skill** | [`.claude/skills/release-notes/SKILL.md`](.claude/skills/release-notes/SKILL.md) | Writes bilingual GitHub release notes, published only after the human OKs them. |

**Workflow**

```
GitHub issue / request
        │
        ▼
 /plan-task (main session) ── asks the human, shows mockup, writes the brief
        │  human approves the brief
        ▼
 developer agent (background, own worktree + branch)
        │  tests + small commits, reports back
        ▼
 reviewer agent (read-only) ── must-fix findings go back to the developer
        │  review passes
        ▼
 main session: human OKs → fast-forward merge into main → full tests
        │
        ▼
 release commit (CHANGELOG, version, tag, "Closes #N") → release notes
        │  the human pushes
        ▼
 CI → dev deploy (automatic) → human checks dev → "Promote to prod" (manual)
```

Rules that keep the team safe are in [`AGENTS.md`](AGENTS.md) (for example: ask before adding a dependency, don't push, tests must pass before committing, Render MCP is read-only).

## 4. Context management

- [`AGENTS.md`](AGENTS.md) describes the project, the fixed tech stack, every command, the frontend and backend structure, the deployment model and the rules for agents. [`CLAUDE.md`](CLAUDE.md) imports it for Claude Code.
- It links to modular docs: [`product-spec.md`](product-spec.md) (what to build), [`docs/testing.md`](docs/testing.md) (test suites), [`docs/versioning.md`](docs/versioning.md) (release process), [`openapi.yaml`](openapi.yaml) (API contract), and the agent/skill definitions in [`.claude/`](.claude/) (process and team).
- When the human corrects an agent, the relevant doc is updated so the correction sticks (a rule in `AGENTS.md`).

## 5. Application

Frontend (React + Vite + TypeScript), backend (FastAPI) and a database (SQLAlchemy; SQLite locally, PostgreSQL in production, Alembic migrations) are connected through the HTTP API, and data persists. Run it locally with one command per process (`make run back`, `make run front`), or the whole stack with one command: `docker compose up -d --build` (http://localhost:8000). Details in [Running locally](#running-locally).

## 8. Deployment

Live app: **https://mongle-spoon.onrender.com/** (the UI is in Korean; reading is public, writes need the password).

- It runs on Render's **free tier**, so the first request after a period of inactivity can take a while (the service has to wake up). Please wait and retry if the page does not load right away.
- The free tier also has a **monthly limit on running hours**, so the app may be unavailable late in the month.
- How the deployment works (Docker image on GHCR, Render, Neon PostgreSQL, dev and prod environments) is described in [Production](#production).

## 9. CI/CD

- **CI** ([`ci.yml`](.github/workflows/ci.yml)): on every push and pull request, backend tests on SQLite and PostgreSQL 18, and frontend test, lint and build. A separate [`compose.yml`](.github/workflows/compose.yml) smoke-tests the Docker Compose stack when image inputs change.
- **CD to dev**: on `main`, after CI passes, the image is built once, pushed to GHCR and deployed to the Render **dev** service automatically.
- **Production is manual**: the "Promote to prod" workflow ([`promote.yml`](.github/workflows/promote.yml)) deploys a chosen, already-tested image to the prod service.
- **Rollback**: run "Promote to prod" again with an older tag (`sha-<commit>` or `vX.Y.Z`). Database migrations are kept compatible with the previous image. See [Production](#production) and the Deployment section of [`AGENTS.md`](AGENTS.md).

## 10. Observability, 11. Alerting, 12. On-call agent

These three criteria are **not implemented**. The app is a small personal tool shared with family, so there is no need for them yet. They are in the public backlog for later: [#7 basic low-cost observability](https://github.com/Karolline/mongle-spoon/issues/7) and [#8 OpenTelemetry](https://github.com/Karolline/mongle-spoon/issues/8). Today the app only has the platform logs that Render provides and CI/deployment status on GitHub.

---

# Mongle Spoon

A small web app for saving the recipes I cook for my baby and looking them up quickly on my phone.

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
