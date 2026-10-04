# Contributing

This repository uses Gitflow. `develop` holds the next release. `master` holds released versions only.

## Branches

| Branch | Starts from | Merges into | Purpose |
|---|---|---|---|
| `feature/<name>` | `develop` | `develop` | A change for the next release |
| `develop` | — | `master` | Integration. A pull request to `master` starts a release. |
| `hotfix/<name>` | `master` | `master`, then `develop` | An urgent fix to a released version |
| `master` | — | — | Released versions. Each merge publishes a release. |

## Make a change

1. Create `feature/<name>` from `develop`.
2. Write Conventional Commit messages, for example `feat(ci): add pnpm`, `fix(runtime): pin digest`, or `docs: explain UID`. The release version comes from these messages.
3. Add a line under `## [Unreleased]` in `CHANGELOG.md`. The GitHub Release uses that section.
4. Open a pull request to `develop`. CI must pass.

## Release

1. Open a pull request from `develop` to `master`.
2. `release-prepare.yml` commits `chore(release): prepare X.Y.Z` to `develop`. To change the bump, add one `release:patch`, `release:minor`, or `release:major` label.
3. Merge the pull request. `release-publish.yml` publishes the images and creates the tag and Release.

## Hotfix

1. Create `hotfix/<name>` from `master`, and fix the problem.
2. Bump `VERSION` and date the changelog with `node scripts/release.mjs apply --to X.Y.Z`. The prepare job only runs for `develop`.
3. Open a pull request to `master`. The merge publishes the release.
4. Merge `master` back into `develop`, so `develop` gets the fix.

## Local checks

```bash
node --test 'scripts/*.test.mjs'
docker build -t local/ci images/ci && bash tests/smoke-ci.sh local/ci
docker build -t local/runtime images/runtime && bash tests/smoke-runtime.sh local/runtime
```
