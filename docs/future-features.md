# Future features

Ideas to build later. Nothing here is in scope yet; when one is picked up, move it into [`product-spec.md`](../product-spec.md) first.

Difficulty: ★☆☆ easy (an afternoon) · ★★☆ medium (a few days) · ★★★ hard (a week or more, new concepts to learn)

## A. Small extensions to existing features

### 1. Pin a recipe to the top (e.g. "making this today") — ★★☆

Pinned recipes always show first on the list, above the usual sort.

- Backend: nullable `pinned_at` datetime on `recipes`; `RecipeStore` sorts pinned first (newest pin first), then as today. Expose it in `models.py` and `openapi.yaml`, plus a way to toggle it (a field on update, or `POST/DELETE /api/recipes/{id}/pin`). Pinning is a write, so it needs `require_write`.
- Frontend: pin toggle on the card or detail screen (gated by `useUnlockGate()`), pin badge on the card. Update both `httpRecipeService` and `mockRecipeService`.
- Watch out: there are no migrations yet. `make_engine()` only creates missing *tables*, so the new column will not appear in an existing database (local SQLite file, production PostgreSQL). Needs a manual `ALTER TABLE`, or this is the moment to introduce Alembic.

### 2. Show "connecting to the database" instead of 0 recipes — ★☆☆

When the server or database is slow to wake up (e.g. a free-tier host after idling), the list currently shows `0개` and the empty state, which looks like all recipes are gone.

- Cause: `RecipeListScreen` starts with `totalCount = 0` and shows the count before the first load finishes, and a failed load is not handled at all.
- Fix (frontend only): track `loading` / `error` state. While loading, show a message such as "레시피를 불러오는 중이에요…" instead of the count and empty state. On error, show "서버에 연결 중이에요. 잠시 후 다시 시도해 주세요." with a retry button (optionally retry automatically a few times).
- Tests: make the mock service slow or failing in a test and check the messages.

### 3. Header count shows the filtered result count — ★☆☆

The count in the top-right corner (e.g. `14개`) always shows the total number of recipes, even while a meal time filter or search is active.

- Cause: `RecipeListScreen.load()` sets `totalCount` from a second, unfiltered `listRecipes()` call.
- Fix (frontend only): while filtering, show the number of filtered results instead (or both, e.g. `3 / 14개`; decide which reads better). Without a filter, keep the total. If only the filtered count is needed, the second unfiltered request can be dropped.
- Tests: pick a meal time filter in a `RecipeListScreen` test and check the header count.

## B. New features

### 4. Recipe photos — ★★★

Attach one or more photos to a recipe, shown on the detail screen (and maybe a thumbnail on the card).

- Storage is the hard part: the deployed server's disk is not permanent, so files must go to object storage (e.g. Cloudflare R2, S3, Cloudinary). Storing images in the database is possible but not recommended.
- Backend: upload endpoint (multipart, size/type limits), a `recipe_photos` table (recipe id, storage key, order), deleting photos when the recipe is deleted. New dependencies (storage SDK, maybe image resizing): ask first.
- Frontend: file picker / camera on mobile, upload progress, resize before upload to save data.
- Listed as "out of scope (later)" in the spec.

### 5. Kakao login, each user sees only their own recipes — ★★★

Replaces the shared write password with real accounts.

- Kakao side: register an app on Kakao Developers, set redirect URLs for local and production.
- Backend: OAuth login flow (redirect → Kakao → callback), a `users` table, `owner_id` on `recipes`, sessions or tokens, and every store query filtered by the current user. `require_access` / `require_write` in `app/auth.py` become "logged-in user owns this".
- Existing data: decide which user owns the recipes already saved.
- Frontend: login screen, logout, logged-in state in the services layer (the mock needs a fake user).
- Security matters here (token storage, CSRF, cookie settings). Listed as "out of scope (later)" in the spec ("User accounts, per-person permissions").

## Suggested order

2 → 3 → 1 → 4 → 5. Items 2 and 3 are quick wins (both in `RecipeListScreen`, so they can be done together); item 1 is a good reason to set up migrations, which 4 and 5 will need anyway.
