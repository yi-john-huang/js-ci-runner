#!/usr/bin/env bash
# Smoke test for the runtime image. Usage: tests/smoke-runtime.sh <image>
set -euo pipefail
IMAGE="${1:?usage: smoke-runtime.sh <image>}"
failures=0

check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then printf 'ok    %s\n' "$name"; else printf 'FAIL  %s\n' "$name"; failures=$((failures + 1)); fi
}
node_eval() { docker run --rm "$IMAGE" -e "$1"; }

check "runs as UID 65532"         test "$(node_eval 'process.stdout.write(String(process.getuid()))')" = "65532"
check "has Node.js 24"            bash -c "docker run --rm '$IMAGE' -e 'process.stdout.write(process.version)' | grep -q '^v24\.'"
check "has no shell"              bash -c "! docker run --rm --entrypoint /bin/sh '$IMAGE' -c true"
check "has no package manager"    bash -c "! docker run --rm --entrypoint /usr/bin/apt-get '$IMAGE' --version"
check "runs a JavaScript file"    bash -c "docker run --rm -v '$PWD/examples/hello-app:/app:ro' '$IMAGE' /app/server.js --once | grep -q 'hello'"

if [ "$failures" -gt 0 ]; then
  printf '\n%d check(s) failed for %s\n' "$failures" "$IMAGE"
  exit 1
fi
printf '\nAll runtime image checks passed for %s\n' "$IMAGE"
