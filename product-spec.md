# Mongle Spoon — Specification

> Status: confirmed for the first version (MVP).

## Purpose

Save the recipes I cook for my baby, and look them up easily on my phone when I need them.

## Users and access

- One person (me) manages the recipes. There are no user accounts.
- Anyone with the URL can view the app. The URL is shared only with family.
- Adding, editing, and deleting recipes needs a single shared password, set on the server.
  - The password is asked for the first time a write action is used ([+ 추가], [수정], [삭제], or saving the form), then remembered in that browser.
  - A [잠금] button on the list screen forgets the remembered password.
  - Viewing, searching, and filtering never need the password.

## Platform and language

- Mobile-first web app, used mainly in a phone browser.
- All UI text (buttons, labels, messages) is in Korean.
- All project documentation is in English.

## Recipe

| Field | Required | Notes |
|---|---|---|
| Name | Yes | The only required field. Everything else can be left empty and filled in later. |
| Ingredients | No | A list. Each ingredient has a name and an amount. The amount is free text (e.g. "30g", "1/2개"). |
| Instructions | No | Free text. |
| Servings | No | Free text (e.g. "3~4회분"). |
| Meal times | No | Any combination of: 아침 (breakfast), 점심·저녁 (lunch/dinner), 간식 (snack). Lunch and dinner are one option because the baby eats the same menu for both. |
| Notes | No | Free text. |

## Finding recipes

- **List:** sorted by most recently updated first.
- **Search:** one search box that matches both recipe names and ingredient names.
- **Filter:** meal time buttons [전체] [아침] [점심·저녁] [간식]. The filter works together with search.

## MVP scope

Three screens:

1. **List (home):** search box, meal time filter buttons, and recipe cards (name, meal times, servings), plus an [+ 추가] button. Shows a message when there are no recipes or no search results.
2. **Detail:** all fields of one recipe, with [수정] and [삭제] buttons. Deleting asks for confirmation.
3. **Add / edit form:** one screen for both. Ingredients are added and removed row by row. The recipe cannot be saved without a name.

## Out of scope (later)

- Photos
- Cooking history, and tracking how long food has been stored in the fridge or freezer (a larger feature, planned separately)
- User accounts, per-person permissions
- Sort options (by name, etc.)
- Baby food stage, baby's age in months, cooking time, allergens, baby's reaction
- Deployment (Module 3 and later)

## Tech stack

- Frontend: Node.js, React + Vite + TypeScript, tested with Vitest
- Backend: Python (managed with `uv`) + FastAPI
- Database: SQLAlchemy + SQLite
- All tests must pass.

## Development order

Following Module 2 of the course:

1. Frontend prototype with a mocked backend. All backend calls go through one services layer, which has a mock implementation.
2. OpenAPI spec (`openapi.yaml`) written from the frontend's services layer
3. FastAPI backend with an in-memory store, connected to the frontend
4. Replace the in-memory store with SQLite through SQLAlchemy, keeping the code database-agnostic
