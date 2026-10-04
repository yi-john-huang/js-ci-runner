# Example: build and test with the CI image, then ship on the distroless runtime image.
# Replace <version> with a released version, for example 1.
FROM ghcr.io/yi-john-huang/js-ci-runner/ci:<version> AS build
WORKDIR /home/runner/app
COPY --chown=1001:1001 package.json server.js server.test.js ./
RUN npm test

FROM ghcr.io/yi-john-huang/js-ci-runner/runtime:<version>
WORKDIR /app
COPY --from=build /home/runner/app/package.json /home/runner/app/server.js ./
EXPOSE 3000
CMD ["server.js"]
