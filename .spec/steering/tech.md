# Technology Stack

## Architecture and runtimes
- This repository builds **container images**, not a Node.js package or web framework. There is no root `package.json`, transpilation step, or application server to deploy from this repository.
- `images/ci/Dockerfile`: digest-pinned `node:24-alpine`, with npm, corepack, and CI tools; user `runner` (UID 1001).
- `images/runtime/Dockerfile`: digest-pinned `gcr.io/distroless/nodejs24-debian13:nonroot`; Node.js runs directly as UID 65532, without a shell or package manager.
- JavaScript ES modules (`scripts/release.mjs`, `examples/hello-app/`) and Bash (`scripts/setup-repo.sh`, `tests/*.sh`) support the images. Workflows and Dependabot configuration are YAML under `.github/`.
- Node.js 24 is the image and CI workflow target. The repository does not declare a separate minimum host Node.js version for the release script.

## Dependencies and tooling
- No root npm dependencies or package manager lockfile. The example app has no external npm dependencies.
- Tests use built-in `node:test`; image smoke scripts require Docker. CI uses hadolint for Dockerfiles, shellcheck for shell scripts, and Trivy for vulnerability scans.
- Docker builds the images; GitHub Actions handles checks and GHCR publishing. Weekly Dependabot updates target Docker base digests and GitHub Actions on `develop`.

## Local commands (repository root unless noted)
```bash
node --test 'scripts/*.test.mjs'
(cd examples/hello-app && npm test)
docker build -t local/ci images/ci && bash tests/smoke-ci.sh local/ci
docker build -t local/runtime images/runtime && bash tests/smoke-runtime.sh local/runtime
```
- The first two commands run on Node.js 24 locally. Image commands require a working Docker daemon; `tests/smoke-ci.sh` also uses `sudo` to prepare a UID 1001 workspace unless run as root.
- CI runs `shellcheck tests/*.sh scripts/*.sh` and hadolint on each image Dockerfile. See `.github/workflows/ci.yml` for the exact jobs.

## Release and security contract
- `.github/workflows/ci.yml` checks pull requests into `develop` or `master`; pushes to `develop` publish `:develop` and `:sha-<commit>` and exercise a real CI job container.
- `.github/workflows/release-prepare.yml` plans and applies a version on `develop` for a `develop` → `master` PR; `.github/workflows/release-publish.yml` publishes signed multi-platform images from `master` when `VERSION` is new.
- `scripts/release.mjs` owns version planning, version-file/changelog edits, and release notes. Follow `CONTRIBUTING.md` for branch and changelog rules; do not bake tokens or private values into image definitions or steering.
