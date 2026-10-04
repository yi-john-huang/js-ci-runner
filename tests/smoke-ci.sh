#!/usr/bin/env bash
# Smoke test for the CI image. Usage: tests/smoke-ci.sh <image>
set -euo pipefail
IMAGE="${1:?usage: smoke-ci.sh <image>}"
CONTAINER_CLI="${CONTAINER_CLI:-docker}"
failures=0

check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then printf 'ok    %s\n' "$name"; else printf 'FAIL  %s\n' "$name"; failures=$((failures + 1)); fi
}
run() { "$CONTAINER_CLI" run --rm "$IMAGE" "$@"; }
has_node24() { run node --version | grep -q '^v24\.'; }
cannot_install_packages() { ! run apk add --no-cache htop; }

check "runs as UID 1001"               test "$(run id -u)" = "1001"
check "is not root"                    test "$(run id -un)" = "runner"
check "has Node.js 24"                 has_node24
check "has npm"                        run npm --version
check "has corepack"                   run corepack --version
for tool in bash git tar gzip zstd ssh jq curl; do
  check "has $tool"                    run sh -c "command -v $tool"
done
check "cannot install packages"        cannot_install_packages

# A GitHub-hosted runner owns its workspace as UID 1001. Podman prepares an isolated
# workspace inside its VM; Docker tests the host bind mount used by GitHub Actions.
if [ "$CONTAINER_CLI" = podman ]; then
  check "writes a workspace owned by 1001" "$CONTAINER_CLI" run --rm --user 0 --tmpfs /work -w /work "$IMAGE" sh -c 'chown 1001:1001 /work && su runner -c "git init -q && echo ok > file && npm init -y"'
else
  workspace=$(mktemp -d)
  chmod 0755 "$workspace"
  sudo_chown() { if [ "$(id -u)" = "0" ]; then chown "$@"; else sudo chown "$@"; fi; }
  sudo_chown 1001:1001 "$workspace"
  check "writes a workspace owned by 1001" "$CONTAINER_CLI" run --rm -v "$workspace:/work" -w /work "$IMAGE" bash -c 'git init -q && echo ok > file && npm init -y'
fi

if [ "$failures" -gt 0 ]; then
  printf '\n%d check(s) failed for %s\n' "$failures" "$IMAGE"
  exit 1
fi
printf '\nAll CI image checks passed for %s\n' "$IMAGE"
