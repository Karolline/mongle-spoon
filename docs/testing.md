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
| `tests/unit/` | `RecipeStore` on its own: search, meal-time filtering, sorting, create/update/delete, seeding. | In-memory SQLite (`sqlite://`) |
| `tests/integration/test_recipes_api.py` | Each endpoint in `openapi.yaml` through HTTP: status codes, validation errors, camelCase JSON, CORS, and that every route goes through `require_access`. | In-memory SQLite |
| `tests/integration/test_workflows.py` | Key user workflows from [`product-spec.md`](../product-spec.md) end to end (add, find by search and meal time, edit, delete), plus persistence across an app restart. Uses the default app wiring, so `DATABASE_URL` is read like in the dev server. | SQLite file in a temp folder |

Shared fixtures live in `tests/conftest.py`. It sets `DATABASE_URL=sqlite://` before the app is imported, so no test touches the real `mongle_spoon.db`. A fake clock makes `updatedAt` ordering deterministic.

## Frontend (`frontend/src/**/*.test.ts(x)`)

Run inside `frontend/`:

```
npm test
```

All frontend tests are unit and component tests; none need a running backend.

| File | What it covers |
|---|---|
| `services/mockRecipeService.test.ts` | The in-memory mock: search, meal-time filtering, sorting, CRUD. |
| `services/httpRecipeService.test.ts` | The HTTP service with a stubbed `fetch`: URLs, query parameters, request bodies, error handling. |
| `components/screens.test.tsx` | The list, detail, and form screens rendered against the mock service. |

`VITE_USE_MOCK_API=true` is always set for Vitest (in `vite.config.ts`), so component tests never call a server.
