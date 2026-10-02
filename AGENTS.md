# AGENTS.md

Instructions for coding agents working in this repository.

## Project

Mongle Spoon: a mobile-first web app for saving and looking up baby food recipes.
The spec is [`_docs/specs.md`](_docs/specs.md). Read it before starting any task. If a request conflicts with the spec, ask instead of guessing.

## Language

- All UI text is in Korean.
- All code, comments, commit messages, and docs are in English.

## Tech stack (fixed, do not change)

- Frontend: React + Vite + TypeScript (Node.js), tested with Vitest, in `frontend/`
- Backend: Python + FastAPI, in `backend/`
- Database: SQLAlchemy + SQLite. Keep the code database-agnostic (no SQLite-only features); the DB URL comes from an environment variable.

## Commands

Backend (run inside `backend/`, dependencies managed with `uv`, Python 3.13+):

- Install: `uv sync`
- Add a dependency: `uv add <package>` (dev-only: `uv add --dev <package>`)
- Run Python: `uv run python ...`
- Dev server: `uv run uvicorn app.main:app --reload`, or `make run back` from the repo root (http://localhost:8000, interactive docs at `/docs`)
- Test: `uv run pytest`
- Allowed CORS origins: `CORS_ORIGINS` env var, comma-separated (default `http://localhost:5173`)

Frontend (run inside `frontend/`, requires Node.js 20.19+ or 22.12+):

- Install: `npm install`
- Dev server: `npm run dev`, or `make run front` from the repo root (http://localhost:5173)
- Test: `npm test`
- Typecheck + build: `npm run build`
- Lint: `npm run lint`

## Frontend structure

- `src/services/`: the services layer. `types.ts` is the interface; `httpRecipeService.ts` calls the backend and `mockRecipeService.ts` is the in-memory mock. `index.ts` picks one: HTTP to `VITE_API_BASE_URL` (default `http://localhost:8000`), or the mock when `VITE_USE_MOCK_API=true` (always set for Vitest in `vite.config.ts`, so component tests never hit a server). Components never do search, meal-time filtering, or sorting themselves.
- `src/components/*Screen.tsx`: screens. They receive navigation callbacks as props and never import the router, so they can be tested directly.
- `src/router.tsx`: routes (TanStack Router, client-side only). Route components own navigation.

## Backend structure

- `app/main.py`: `create_app()` wires CORS, the store, and routers. Without a store argument it uses an in-memory store seeded with sample recipes (data resets on restart).
- `app/models.py`: Pydantic schemas. JSON is camelCase (aliases) to match the frontend types and `openapi.yaml`.
- `app/store.py`: `RecipeStore`. Search, meal-time filtering, and sorting live here, not in routers.
- `app/auth.py`: `require_access`, attached to every router. It allows everything, since the spec has no authentication; it is the one place to add access control later.
- `app/routers/`: HTTP endpoints only. They get the store through the `get_store` dependency.
- `openapi.yaml` (repo root) is the contract. Keep it and the backend in sync.

## Rules

- Every backend call from the frontend goes through one services layer, which has a mock implementation with the same interface.
- Ask before adding a new dependency.
- Write tests with every change. All tests must pass before committing.
- Commit regularly, in small commits that each leave the app working.
- When I correct you during a session, update the relevant doc so the correction sticks.
