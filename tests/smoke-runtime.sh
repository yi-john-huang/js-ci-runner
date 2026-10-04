#!/usr/bin/env bash
# Smoke test for the runtime image. Usage: tests/smoke-runtime.sh <image>
set -euo pipefail
IMAGE="${1:?usage: smoke-runtime.sh <image>}"
CONTAINER_CLI="${CONTAINER_CLI:-docker}"
failures=0

check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then printf 'ok    %s\n' "$name"; else printf 'FAIL  %s\n' "$name"; failures=$((failures + 1)); fi
}
run() { "$CONTAINER_CLI" run --rm "$@"; }
node_eval() { run "$IMAGE" -e "$1"; }
has_node24() { node_eval 'process.stdout.write(process.version)' | grep -q '^v24\.'; }
has_no_shell() { ! run --entrypoint /bin/sh "$IMAGE" -c true; }
has_no_package_manager() { ! run --entrypoint /usr/bin/apt-get "$IMAGE" --version; }
runs_script() { run -v "$PWD/examples/hello-app:/app:ro" "$IMAGE" /app/server.js --once | grep -q 'hello'; }

check "runs as UID 65532"         test "$(node_eval 'process.stdout.write(String(process.getuid()))')" = "65532"
check "has Node.js 24"            has_node24
check "has no shell"              has_no_shell
check "has no package manager"    has_no_package_manager
check "runs a JavaScript file"    runs_script

if [ "$failures" -gt 0 ]; then
  printf '\n%d check(s) failed for %s\n' "$failures" "$IMAGE"
  exit 1
fi
printf '\nAll runtime image checks passed for %s\n' "$IMAGE"
