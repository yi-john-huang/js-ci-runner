# Runtime image: the final stage for shipping a built JavaScript/TypeScript app.
# Distroless: no shell, no package manager. Runs as the non-root user 65532 (nonroot).
# Use it as the last stage:  FROM ghcr.io/yi-john-huang/js-ci-runner/runtime:<version>
FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:59c479c9b8c123e66047315c968aa2d35e31ae5149c856e4110a79c8b3563f0b

WORKDIR /app
USER 65532:65532

LABEL org.opencontainers.image.title="js-ci-runner/runtime" \
      org.opencontainers.image.description="Distroless non-root Node.js 24 runtime for JavaScript/TypeScript apps" \
      org.opencontainers.image.source="https://github.com/yi-john-huang/js-ci-runner" \
      org.opencontainers.image.licenses="MIT"
