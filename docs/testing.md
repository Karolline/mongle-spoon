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
| `tests/unit/test_store.py` | `RecipeStore` on its own: search, meal-time filtering, sorting, create/update/delete, seeding, long text. | In-memory SQLite (`sqlite://`) |
| `tests/unit/test_db.py` | `normalize_url()`: plain PostgreSQL URLs get the psycopg driver, others are unchanged. | None |
| `tests/unit/test_devserver.py` | The dev server's port check: refuses to start uvicorn when the port is taken. | None |
| `tests/integration/test_recipes_api.py` | Each endpoint in `openapi.yaml` through HTTP: status codes, validation errors, camelCase JSON, CORS, and that every route goes through `require_access`. | In-memory SQLite |
| `tests/integration/test_auth.py` | Write protection: reads need no password; create, update and delete return 401 without or with a wrong password and 503 when `ADMIN_PASSWORD` is unset; `/auth/verify`; CORS allows the `Authorization` header. | In-memory SQLite |
| `tests/integration/test_frontend.py` | Serving the built frontend (a fake `dist` folder): app routes get `index.html`, built files are served, `/api` keeps answering JSON and unknown `/api/...` paths stay 404. | In-memory SQLite |
| `tests/integration/test_workflows.py` | Key user workflows from [`product-spec.md`](../product-spec.md) end to end (add, find by search and meal time, edit, delete), plus persistence across an app restart. Uses the default app wiring, so `DATABASE_URL` is read like in the dev server. | SQLite file in a temp folder, or `TEST_DATABASE_URL` |

Shared fixtures live in `tests/conftest.py`. It sets `DATABASE_URL=sqlite://` before the app is imported, so no test touches the real `mongle_spoon.db`, and sets `ADMIN_PASSWORD=test-password`. `client` and `empty_client` send that password with every request; `anon_client` sends none. A fake clock makes `updatedAt` ordering deterministic.

### On PostgreSQL

The tables marked "In-memory SQLite" above (and the workflows) run on PostgreSQL when `TEST_DATABASE_URL` is set:

```
TEST_DATABASE_URL=postgresql://USER:PASS@127.0.0.1:5432/DBNAME uv run pytest
```

Use a throwaway database, never the dev or production one: every test drops and recreates all tables. With the local Docker database, use `127.0.0.1`, not `localhost` (on Windows `localhost` tries IPv6 first and can hang). `test_store.py::test_data_persists_in_a_database_file` always uses a SQLite file.

## Frontend (`frontend/src/**/*.test.ts(x)`)

Run inside `frontend/`:

```
npm test
```

All frontend tests are unit and component tests; none need a running backend.

| File | What it covers |
|---|---|
| `services/mockRecipeService.test.ts` | The in-memory mock: search, meal-time filtering, sorting, CRUD, and rejecting writes until unlocked. |
| `services/httpRecipeService.test.ts` | The HTTP service with a stubbed `fetch` and in-memory password storage: URLs, query parameters, request bodies, error handling, and the password (sent on writes only, remembered, forgotten on 401). |
| `components/screens.test.tsx` | The list, detail, and form screens rendered against the mock service. Most tests start unlocked; the "write protection" group covers the password dialog. |

`VITE_USE_MOCK_API=true` is always set for Vitest (in `vite.config.ts`), so component tests never call a server.
