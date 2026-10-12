# Testing

## Backend (`backend/tests/`)

Run inside `backend/`:

```
uv run pytest                     # everything
uv run pytest tests/unit          # unit tests only
uv run pytest tests/integration   # integration tests only
```

| Folder | What it covers | Database |
|---|---|---|
| `tests/unit/test_store.py` | `RecipeStore` on its own: search, meal-time filtering, sorting (pinned first, then by the day last made), create/update/delete, pin/unpin, recording and clearing the day made, seeding, long text. | In-memory SQLite (`sqlite://`) |
| `tests/unit/test_copy_db.py` | `copy_recipes()`: copies every recipe unchanged from a SQLite database, refuses a target that already has recipes, and the target still accepts new recipes. `main()` migrates a new target before copying. | In-memory SQLite as the source, `TEST_DATABASE_URL` as the target; SQLite files for `main()` |
| `tests/unit/test_db.py` | `normalize_url()`: plain PostgreSQL URLs get the psycopg driver, others are unchanged. | None |
| `tests/unit/test_devserver.py` | The dev server's port check: refuses to start uvicorn when the port is taken. Migrates before starting, and doesn't start on an unstamped database. | None |
| `tests/unit/test_migrations.py` | Alembic: upgrading an empty database builds exactly the tables of the models (fails when a model changed without a migration), downgrade and upgrade again, stamping a pre-Alembic database (built by migrating to the baseline) keeps its recipes, `app.migrate.upgrade()` refuses an unstamped database and reads `DATABASE_URL`. | SQLite file in a temp folder, or `TEST_DATABASE_URL` |
| `tests/unit/test_seed.py` | `python -m app.seed`: refuses a database without tables, seeds a migrated one. | SQLite file in a temp folder |
| `tests/unit/test_versions.py` | The app version is the same in `pyproject.toml`, `frontend/package.json`, `openapi.yaml` and the FastAPI app (see [`versioning.md`](versioning.md)). | None |
| `tests/integration/test_recipes_api.py` | Each endpoint in `openapi.yaml` through HTTP: status codes, validation errors, camelCase JSON, CORS, and that every route goes through `require_access`. | In-memory SQLite |
| `tests/integration/test_auth.py` | Write protection: reads need no password; create, update, pin, unpin, recording or clearing the day made, and delete return 401 without or with a wrong password and 503 when `ADMIN_PASSWORD` is unset; `/auth/verify`; CORS allows the `Authorization` header. | In-memory SQLite |
| `tests/integration/test_frontend.py` | Serving the built frontend (a fake `dist` folder): app routes get `index.html`, built files are served, `/api` keeps answering JSON and unknown `/api/...` paths stay 404. | In-memory SQLite |
| `tests/integration/test_workflows.py` | Key user workflows from [`product-spec.md`](../product-spec.md) end to end (add, find by search and meal time, edit, delete), plus persistence across an app restart. Uses the default app wiring on a migrated database, so `DATABASE_URL` is read like in the dev server. | SQLite file in a temp folder, or `TEST_DATABASE_URL` |

Shared fixtures live in `tests/conftest.py`. It sets `DATABASE_URL=sqlite://` before the app is imported, so no test touches the real `mongle_spoon.db`, and sets `ADMIN_PASSWORD=test-password`. `client` and `empty_client` send that password with every request; `anon_client` sends none. A fake clock makes `updatedAt` ordering deterministic.

### On PostgreSQL

The tables marked "In-memory SQLite" above (and the workflows) run on PostgreSQL when `TEST_DATABASE_URL` is set:

```
TEST_DATABASE_URL=postgresql://USER:PASS@127.0.0.1:5432/DBNAME uv run pytest
```

Use a throwaway database, never the dev or production one: every test drops and recreates all tables. With the local Docker database, use `127.0.0.1`, not `localhost` (on Windows `localhost` tries IPv6 first and can hang). `test_store.py::test_data_persists_in_a_database_file` always uses a SQLite file.

A throwaway PostgreSQL in Docker (not the compose `db` service, whose volume holds the dev data):

```
docker run -d --rm --name mongle-spoon-testpg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test -p 127.0.0.1:55432:5432 postgres:18
docker exec mongle-spoon-testpg pg_isready -U postgres -d test   # repeat until "accepting connections"
TEST_DATABASE_URL=postgresql://postgres:test@127.0.0.1:55432/test uv run pytest
docker stop mongle-spoon-testpg   # --rm deletes it
```

If `docker info` fails because the daemon isn't running, start Docker Desktop first (on this machine: `C:\Users\hyejin\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe`, e.g. `Start-Process` in PowerShell) and wait until `docker info` succeeds. Leave Docker Desktop running afterwards; only stop the containers you started.

### Against docker-compose.yaml

`tests/compose/test_compose.py` builds and starts the real stack (`docker compose up --build`) and checks two things: the frontend was built into the image and is served, and the backend stores recipes in the PostgreSQL container (read back with `psql`). It needs Docker, takes about a minute, and is not part of the default run:

```
uv run pytest tests/compose
```

It uses its own project name, volume and ports (app on 18000, PostgreSQL on 15432), so a stack running for development keeps its data and can stay up. The test volume is deleted afterwards. The build does re-tag the `mongle-spoon` image.

## Frontend (`frontend/src/**/*.test.ts(x)`)

Run inside `frontend/`:

```
npm test
```

All frontend tests are unit and component tests; none need a running backend.

| File | What it covers |
|---|---|
| `services/mockRecipeService.test.ts` | The in-memory mock: search, meal-time filtering, sorting (pinned first, then by the day last made), CRUD, pin/unpin, recording the day made, and rejecting writes until unlocked. |
| `lib/format.test.ts` | Date helpers: today's date in the device's time zone, and "오늘" / "어제" / "3일 전" labels for the day a recipe was made. |
| `services/httpRecipeService.test.ts` | The HTTP service with a stubbed `fetch` and in-memory password storage: URLs, query parameters, request bodies, error handling, and the password (sent on writes only, remembered, forgotten on 401). |
| `components/screens.test.tsx` | The list, detail, and form screens rendered against the mock service. Most tests start unlocked; the "write protection" group covers the password dialog. |

`VITE_USE_MOCK_API=true` is always set for Vitest (in `vite.config.ts`), so component tests never call a server.
