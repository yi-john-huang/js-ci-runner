#!/usr/bin/env bash
# Smoke test for the CI image. Usage: tests/smoke-ci.sh <image>
set -euo pipefail
IMAGE="${1:?usage: smoke-ci.sh <image>}"
failures=0

check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then printf 'ok    %s\n' "$name"; else printf 'FAIL  %s\n' "$name"; failures=$((failures + 1)); fi
}
run() { docker run --rm "$IMAGE" "$@"; }

check "runs as UID 1001"               test "$(run id -u)" = "1001"
check "is not root"                    test "$(run id -un)" = "runner"
check "has Node.js 24"                 bash -c "docker run --rm '$IMAGE' node --version | grep -q '^v24\.'"
check "has npm"                        run npm --version
check "has corepack"                   run corepack --version
for tool in bash git tar gzip zstd ssh jq curl; do
  check "has $tool"                    run sh -c "command -v $tool"
done
check "cannot install packages"        bash -c "! docker run --rm '$IMAGE' apk add --no-cache htop"

# The workspace on a GitHub-hosted runner belongs to UID 1001. The container user must write to it.
workspace=$(mktemp -d)
chmod 0755 "$workspace"
sudo_chown() { if [ "$(id -u)" = "0" ]; then chown "$@"; else sudo chown "$@"; fi; }
sudo_chown 1001:1001 "$workspace"
check "writes a workspace owned by 1001" docker run --rm -v "$workspace:/work" -w /work "$IMAGE" bash -c 'git init -q && echo ok > file && npm init -y'

if [ "$failures" -gt 0 ]; then
  printf '\n%d check(s) failed for %s\n' "$failures" "$IMAGE"
  exit 1
fi
printf '\nAll CI image checks passed for %s\n' "$IMAGE"
