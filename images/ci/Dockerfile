# CI image: the environment that GitHub Actions job steps run in.
# Use it as a job container:  container: ghcr.io/yi-john-huang/js-ci-runner/ci:<version>
FROM node:26-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80

# Tools that actions and CI scripts expect: bash for `run:` steps, git for actions/checkout,
# tar/gzip/zstd for actions/cache, ssh for git over SSH, jq/curl for scripts.
# Package versions follow the pinned base image digest; Dependabot updates that digest.
# hadolint ignore=DL3018
RUN apk add --no-cache \
      bash \
      ca-certificates \
      curl \
      git \
      gzip \
      jq \
      openssh-client \
      tar \
      zstd \
  && corepack enable

# GitHub-hosted Ubuntu runners create the workspace as UID 1001.
# The container user must have the same UID, or actions/checkout fails with "permission denied".
RUN addgroup -g 1001 runner \
  && adduser -D -u 1001 -G runner -h /home/runner -s /bin/bash runner

ENV COREPACK_HOME=/home/runner/.cache/corepack \
    NPM_CONFIG_UPDATE_NOTIFIER=false

USER 1001:1001
WORKDIR /home/runner

LABEL org.opencontainers.image.title="js-ci-runner/ci" \
      org.opencontainers.image.description="Non-root Alpine Node.js 24 image for JavaScript/TypeScript CI job steps" \
      org.opencontainers.image.source="https://github.com/yi-john-huang/js-ci-runner" \
      org.opencontainers.image.licenses="MIT"
