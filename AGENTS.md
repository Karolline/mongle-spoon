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

Backend dependencies are managed with `uv`:

- Install: `uv sync`
- Add a dependency: `uv add <package>`
- Run Python: `uv run python ...`

Frontend, backend run, and test commands will be added here once those parts exist.

## Rules

- Every backend call from the frontend goes through one services layer, which has a mock implementation with the same interface.
- Ask before adding a new dependency.
- Write tests with every change. All tests must pass before committing.
- Commit regularly, in small commits that each leave the app working.
- When I correct you during a session, update the relevant doc so the correction sticks.
