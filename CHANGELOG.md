# Changelog

Versions follow [`docs/versioning.md`](docs/versioning.md).

## v1.0.2 (2026-10-10)

- The recipe list shows the app version in small text at the bottom.

## v1.0.1 (2026-10-10)

- The recipe list count shows the number of recipes matching the current search and meal-time filter, not every recipe.
- While the list first loads, it shows a loading message instead of "0개" and the empty-list message. If loading fails, it retries automatically for about 30 seconds, then offers a [다시 시도] button.

## v1.0.0

First version: list, search and meal-time filter, recipe detail, add/edit form, and a shared write password. Runs on SQLite locally and PostgreSQL in production, with Docker and CI.
