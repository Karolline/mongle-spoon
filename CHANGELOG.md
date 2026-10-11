# Changelog

Versions follow [`docs/versioning.md`](docs/versioning.md).

## v1.1.0 (2026-10-11)

- Recipes can be pinned to the top of the list, from a card's pin button or the detail screen's [고정] button. Pinned cards show a 고정 badge.
- Each recipe can record the day it was last made: [오늘 만들었어요] on the detail screen, or another day from a date picker, and [기록 지우기] to remove it. Cards show it (e.g. "3일 전 만듦").
- The list shows pinned recipes first, then the rest by the day they were last made (never-made ones last, by most recently updated).
- Database: two new nullable columns (`recipes.pinned_at`, `recipes.last_made_on`), added by migrations that run when the app starts.

## v1.0.3 (2026-10-10)

- Tapping the selected meal-time filter button again clears the filter, the same as tapping [전체].

## v1.0.2 (2026-10-10)

- The recipe list shows the app version in small text at the bottom.

## v1.0.1 (2026-10-10)

- The recipe list count shows the number of recipes matching the current search and meal-time filter, not every recipe.
- While the list first loads, it shows a loading message instead of "0개" and the empty-list message. If loading fails, it retries automatically for about 30 seconds, then offers a [다시 시도] button.

## v1.0.0

First version: list, search and meal-time filter, recipe detail, add/edit form, and a shared write password. Runs on SQLite locally and PostgreSQL in production, with Docker and CI.
