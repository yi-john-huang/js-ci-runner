# Project Structure

## Repository map
| Path | Responsibility |
|---|---|
| `images/ci/Dockerfile` | CI job-container image and build-stage tools. |
| `images/runtime/Dockerfile` | Distroless Node.js runtime base. |
| `tests/smoke-ci.sh`, `tests/smoke-runtime.sh` | Image contract checks after Docker builds. |
| `scripts/release.mjs`, `scripts/release.test.mjs` | Release version/changelog logic and its Node tests. |
| `scripts/setup-repo.sh` | One-time GitHub repository and release setup. |
| `examples/hello-app/` | Working consumer example: Dockerfile, ES-module service, manifest, and Node test. |
| `.github/workflows/` | CI, release preparation, and release publication. |
| `.github/dependabot.yml` | Docker and Actions dependency update configuration. |
| `.spec/steering/` | Product, technology, and structure guidance for SDD work. |
| `VERSION`, `CHANGELOG.md`, `README.md`, `CONTRIBUTING.md` | Version source, release history, usage, and contribution rules. |

## Module boundaries
- Keep CI image tooling in `images/ci/` and the minimal application runtime in `images/runtime/`; do not add build tools to the distroless runtime.
- Release decisions and file updates belong in `scripts/release.mjs`; workflows call that script rather than duplicating version logic.
- `examples/hello-app/` is a consumer example, not the source for the published images. No root `src/`, `dist/`, or `package.json` exists.
- Keep image contract assertions in `tests/smoke-*.sh`; keep release logic tests adjacent to the release script as `scripts/release.test.mjs`. The example's own test is `examples/hello-app/server.test.js`.

## Naming and change points
- Image definitions use `images/<image>/Dockerfile` with `ci` and `runtime` as the image names. Their smoke scripts use `tests/smoke-<image>.sh`.
- Node tests use `.test.mjs` for the release script and `.test.js` for the example app; no general filename convention is declared for future modules.
- A base-image or UID change must update the relevant Dockerfile, smoke assertion, and usage documentation. A release-behavior change must update `scripts/release.test.mjs` and the release workflow or contributor guidance where its contract changes.
- Follow `CONTRIBUTING.md` for Conventional Commits, `CHANGELOG.md` entries, and the `feature/*` → `develop` / `hotfix/*` → `master` branch flow.
