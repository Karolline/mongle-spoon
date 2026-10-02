# Mongle Spoon

A small web app for saving the recipes I cook for my baby and looking them up quickly on my phone.

Built as the Module 2 homework project for [AI Dev Tools Zoomcamp 2026](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp) by DataTalks.Club.

## Status

Frontend and FastAPI backend are connected over HTTP. The backend still uses an in-memory store (data resets on restart); SQLAlchemy persistence is next. See [`_docs/specs.md`](_docs/specs.md).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript (Node.js), TanStack Router, Tailwind CSS, Vitest |
| Backend | Python (managed with `uv`) + FastAPI (OpenAPI) |
| Database | SQLAlchemy + SQLite |

## Repository layout

```
_docs/        # Specs and supporting docs
frontend/     # Frontend app
backend/      # FastAPI backend and tests
AGENTS.md     # Instructions for coding agents
```

## Running locally

### Frontend

Requires Node.js 20.19+ or 22.12+. The frontend calls the backend at `http://localhost:8000`, so start the backend first.

```
cd frontend
npm install
npm run dev     # http://localhost:5173
npm test
```

Optional settings (put them in `frontend/.env.local`, see `frontend/.env.example`):

- `VITE_API_BASE_URL`: backend origin (default `http://localhost:8000`)
- `VITE_USE_MOCK_API=true`: run against the in-memory mock instead of the backend (tests always use the mock)

### Backend

Requires Python 3.13+ and [`uv`](https://docs.astral.sh/uv/).

```
cd backend
uv sync
uv run uvicorn app.main:app --reload   # http://localhost:8000, docs at /docs
uv run pytest
```

Allowed CORS origins come from `CORS_ORIGINS` (comma-separated, default `http://localhost:5173`).
