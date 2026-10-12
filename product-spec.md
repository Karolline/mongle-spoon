# Mongle Spoon — Specification

> Status: confirmed for the first version (MVP).

## Purpose

Save the recipes I cook for my baby, and look them up easily on my phone when I need them.

## Users and access

- One person (me) manages the recipes. There are no user accounts.
- Anyone with the URL can view the app. The URL is shared only with family.
- Adding, editing, pinning, recording when a recipe was made or how much is left, and deleting recipes needs a single shared password, set on the server.
  - The password is asked for the first time a write action is used ([+ 추가], [수정], [삭제], [고정]/[고정 해제], [오늘 만들었어요] or another day, [−]/[+] or saving a typed number for the amount left, either [기록 지우기], or saving the form), then remembered in that browser.
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
| Leftover amount | No | How much of the made batch is left (e.g. 5 frozen cubes): a whole number from 0 to 999, or not recorded. 0 means all eaten. Changed on the detail screen, not in the form. Changing it doesn't change the recipe's "updated" time. |
| Leftover unit | No | Free text (e.g. "큐브", "통"), set in the add / edit form. Empty is shown as "개". Shown right after the number, with no space (e.g. "5큐브"). |

## Finding recipes

- **List:** pinned recipes first (most recently pinned first), then the rest sorted by the more recent of the day they were last made and their last update (added or edited), most recent first. Recipes never made use their last update, so a recipe just added or edited shows right after the pinned ones. On the same day, the update counts as more recent than being made (a day counts as its start, midnight UTC). Recipes that still tie are sorted by most recently updated first.
- **Pin:** any number of recipes can be pinned to the top of the list (e.g. what to cook today). Pinning and unpinning don't change the recipe's "updated" time.
- **Last made:** each recipe can record the day it was last made (a date, no time). [오늘 만들었어요] records today, in the phone's time zone; another day (e.g. yesterday) can be picked instead, but not a future day. Recording a day replaces the previous one, so an earlier day fixes a mistake, and [기록 지우기] removes it. Recording doesn't change the recipe's "updated" time.
- **Search:** one search box that matches both recipe names and ingredient names.
- **Filter:** meal time buttons [전체] [아침] [점심·저녁] [간식]. The filter works together with search. Pinned recipes only show when they match the search and filter, and then come first. Tapping the active meal time button again clears the filter (same as [전체]).

## MVP scope

Three screens:

1. **List (home):** search box, meal time filter buttons, and recipe cards (name, meal times, servings), plus an [+ 추가] button. Each card has a pin button; a pinned card shows a 고정 badge. A card shows when the recipe was last made (e.g. "오늘 만듦", "3일 전 만듦"), if it was, and how much is left (e.g. "5큐브 남음") after the meal times when 1 or more is left (nothing at 0 or when not recorded). Shows a message when there are no recipes or no search results.
   - The count in the top right is the number of recipes currently shown (after search and filter).
   - The app version (e.g. `v1.0.2`) is shown in small text at the bottom, so each deployment shows which version it runs.
   - While the first load is in progress, it shows "레시피를 불러오는 중이에요…" instead of a count or the empty message. If loading fails, it retries automatically a few times (about 30 seconds in total, e.g. while a free host wakes up), then shows "서버에 연결 중이에요" with a [다시 시도] button.
2. **Detail:** all fields of one recipe, with [고정] (or [고정 해제]), [수정] and [삭제] buttons. A "마지막으로 만든 날" section shows the day it was last made (or that it hasn't been recorded), with [오늘 만들었어요], a date picker for another day, and [기록 지우기]. Below it, a "남은 양" section shows how much is left ("5큐브", "다 먹었어요" at 0, or that it hasn't been recorded) between [−] and [+] ([+] from not recorded gives 1; [−] is disabled at 0 and when not recorded, [+] at 999). [숫자 입력] opens a number field to type the amount (whole numbers 0-999) with [저장] and [취소], and [기록 지우기] (shown when an amount is recorded, including 0) sets it back to not recorded. [오늘 만들었어요] doesn't change the amount. Deleting asks for confirmation.
3. **Add / edit form:** one screen for both. Ingredients are added and removed row by row. A "남은 양 단위" field below 분량 sets the leftover unit (the amount itself is changed on the detail screen). The recipe cannot be saved without a name.

## Out of scope (later)

- Photos
- Cooking history (every day a recipe was made; only the last day is kept), and tracking how long food has been stored in the fridge or freezer (a larger feature, planned separately)
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
