# Runtime image: the final stage for shipping a built JavaScript/TypeScript app.
# Distroless: no shell, no package manager. Runs as the non-root user 65532 (nonroot).
# Use it as the last stage:  FROM ghcr.io/yi-john-huang/js-ci-runner/runtime:<version>
FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:9eeb7f5887d0e239e78264b06f7f11d2e14be534050481803a9e4728fcdd278e

WORKDIR /app
USER 65532:65532

LABEL org.opencontainers.image.title="js-ci-runner/runtime" \
      org.opencontainers.image.description="Distroless non-root Node.js 24 runtime for JavaScript/TypeScript apps" \
      org.opencontainers.image.source="https://github.com/yi-john-huang/js-ci-runner" \
      org.opencontainers.image.licenses="MIT"
