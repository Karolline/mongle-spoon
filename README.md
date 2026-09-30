# Mongle Spoon

A small web app for saving the recipes I cook for my baby and looking them up quickly on my phone.

Built as the Module 2 homework project for [AI Dev Tools Zoomcamp 2026](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp) by DataTalks.Club.

## Status

Frontend prototype with a mocked backend is done; the FastAPI backend is next. See [`_docs/specs.md`](_docs/specs.md).

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
backend/      # FastAPI backend and tests (not yet created)
AGENTS.md     # Instructions for coding agents
```

## Running locally

### Frontend

Requires Node.js 20.19+ or 22.12+. The frontend currently runs against an in-memory mock backend.

```
cd frontend
npm install
npm run dev     # http://localhost:5173
npm test
```

### Backend

Not available yet.
