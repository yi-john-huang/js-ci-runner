# Product Overview

## Purpose and users
- `js-ci-runner` provides two container images for maintainers of JavaScript and TypeScript projects: a CI job container and a final application runtime base.
- The CI image is for GitHub Actions job steps and application build stages; the runtime image is for running a built Node.js application.
- Treat `VERSION` as the source of the release version; example image tags in `README.md` are not proof that a release was published.

## Capabilities
- `ci`: Node.js 24 on Alpine, npm and corepack, with bash, git, archive tools, SSH client, jq, and curl. Runs as `runner` (UID 1001) so checkout can write the GitHub-hosted Ubuntu workspace.
- `runtime`: Node.js 24 on a distroless Debian base, running as `nonroot` (UID 65532). The consuming project supplies its built application and dependencies.
- CI workflows build, smoke-test, lint, and scan both images. The release workflow is configured to publish amd64 and arm64 images to GHCR with signatures, SBOM, and provenance.

## Boundaries and trade-offs
- The CI image is a **job container**, not a self-hosted GitHub Actions runner. GitHub JavaScript actions in Alpine job containers require x64 runners; arm64 CI images still exist for other uses.
- Alpine uses musl; some native npm dependencies may not build. The runtime image has no shell or package manager: build and debug outside the final image.
- Both Dockerfiles pin base digests and run without root. Preserve these properties when changing image definitions; the CI workflow rejects fixable critical image vulnerabilities.
- Release versions follow Conventional Commits or a release label override. The release script changes `VERSION`, `README.md`, and `CHANGELOG.md`.

## Observable success
- The CI image can run a real GitHub Actions job container with a writable workspace; the runtime image executes an application script as UID 65532.
- Smoke checks cover the image contracts; release checks cover version planning and changelog updates. See `tests/`, `scripts/release.test.mjs`, and `.github/workflows/ci.yml`.
