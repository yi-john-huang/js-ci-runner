# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-04

### Added
- CI image: non-root (UID 1001) Alpine image with Node.js 24, npm, corepack, bash, git, tar, gzip, zstd, ssh, jq, and curl, for GitHub Actions job containers.
- Runtime image: distroless, non-root (UID 65532) Node.js 24 image for shipping apps.
- Gitflow CI: lint, build, smoke tests, and vulnerability scans on every pull request; `:develop` images and a real job-container check on every push to `develop`.
- Automated releases: a `develop` to `master` pull request commits the next version; the merge publishes signed multi-arch images with an SBOM and provenance, and creates the tag and GitHub Release.

