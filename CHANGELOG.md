# Changelog

Versions follow [`docs/versioning.md`](docs/versioning.md).

## v1.2.1 (2026-10-12)

- On iPhone, tapping a text field no longer zooms the page (which stayed zoomed on the detail screen after saving): every text field now uses 16px text. Pinch zoom still works.
- The detail screen's "다른 날" date picker is now a button with a calendar icon; the chosen day shows in the "마지막으로 만든 날" line above.
- The "몽글스푼" title on the list screen is no longer cut off at the bottom.

## v1.2.0 (2026-10-12)

- Each recipe can record how much is left (e.g. frozen cubes): a whole number from 0 to 999, with a unit set per recipe in the add/edit form ("남은 양 단위", empty means "개").
- The detail screen has a "남은 양" section: [−]/[+] change it by one, [숫자 입력] sets a number, and [기록 지우기] removes it. 0 shows "다 먹었어요". Changing it needs the write password and doesn't change the recipe's "updated" time.
- Cards show what's left (e.g. "5큐브 남음") when 1 or more is left.
- Database: two new columns (`recipes.leftover`, nullable, and `recipes.leftover_unit`, empty by default), added by a migration that runs when the app starts.

## v1.1.1 (2026-10-12)

- The list shows pinned recipes first, then the rest by the more recent of the day they were last made and their last update. A recipe just added or edited now comes right after the pinned ones, and never-made recipes are no longer always last. On the same day, the update counts as more recent.

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
