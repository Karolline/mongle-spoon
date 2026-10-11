# Versioning

The app has one version, `MAJOR.MINOR.PATCH` ([Semantic Versioning](https://semver.org/)), shared by the frontend, the backend and the API contract.

## Which number to raise

| Raise | When | Example |
|---|---|---|
| MAJOR (`2.0.0`) | A change that breaks how the app is used or stored data | Kakao login replacing the shared password |
| MINOR (`1.1.0`) | A new feature | Photos, pinning a recipe |
| PATCH (`1.0.1`) | A fix, or a small change to how an existing screen behaves | The list count ignoring filters |

Raising one resets the numbers to its right (`1.2.3` → `1.3.0`).

## Where the version is written

All of these must match. `backend/tests/unit/test_versions.py` fails if they don't.

- `backend/pyproject.toml` (`version`), then run `uv lock` in `backend/` to update `uv.lock`
- `backend/app/main.py` (`FastAPI(..., version=...)`, shown at `/docs`)
- `frontend/package.json`: run `npm version X.Y.Z --no-git-tag-version` in `frontend/` (also updates `package-lock.json`). `vite.config.ts` reads it into `__APP_VERSION__`, shown at the bottom of the list screen.
- `openapi.yaml` (`info.version`)

## Releasing a version

1. Add the version and its changes to the top of [`CHANGELOG.md`](../CHANGELOG.md).
2. Update the version in every file above, run the tests, and commit (`Release vX.Y.Z`).
3. Tag that commit: `git tag -a vX.Y.Z -m "vX.Y.Z"`.
4. The user pushes the commit and the tag (`git push && git push --tags`), which deploys it to dev. CI also adds the `vX.Y.Z` tag to the GHCR image built from that commit.
5. After checking it on dev, the user promotes it to production: Actions → Promote to prod → Run workflow with the tag `vX.Y.Z` (see Deployment in [`AGENTS.md`](../AGENTS.md)).
