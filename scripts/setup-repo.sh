#!/usr/bin/env bash
# One-time Gitflow and release setup for this repository.
#
# What this script does:
#   1. Checks that the GitHub CLI is signed in as an admin of the repository.
#   2. Makes develop the default branch, so pull requests target develop by default.
#   3. Creates the release:patch, release:minor, and release:major labels.
#   4. Stores your fine-grained GitHub token as the Actions secret RELEASE_TOKEN.
#      release-prepare.yml uses it only to push the version-bump commit to the protected develop branch.
#   5. Optionally protects master and develop: pull request required, CI must pass, admins may bypass.
#
# The token is read from a hidden prompt, checked, sent to GitHub on stdin, and never printed or saved.
# Images publish to GHCR with the built-in GITHUB_TOKEN; no registry secret is needed.
#
# Usage: scripts/setup-repo.sh [owner/repo]     (default: yi-john-huang/js-ci-runner)
set -euo pipefail

REPO="${1:-yi-john-huang/js-ci-runner}"

fail() { printf 'Error: %s\n' "$1" >&2; exit 1; }
step() { printf '\n== %s\n' "$1"; }

command -v gh >/dev/null 2>&1 || fail "Install the GitHub CLI (https://cli.github.com), then run this script again."
gh auth status >/dev/null 2>&1 || fail "Sign in first with: gh auth login"

step "1. Check your access to $REPO"
login=$(gh api user --jq .login)
[ "$(gh api "repos/$REPO" --jq .permissions.admin)" = "true" ] \
  || fail "$login is not an admin of $REPO. Only admins can change branch settings and bypass branch protection."
printf 'Signed in as %s (admin of %s).\n' "$login" "$REPO"

step "2. Make develop the default branch"
gh api "repos/$REPO/branches/develop" >/dev/null 2>&1 || fail "The develop branch does not exist yet. Push it first."
gh api -X PATCH "repos/$REPO" -f default_branch=develop >/dev/null
printf 'Default branch: develop.\n'

step "3. Create the release labels"
gh label create "release:patch" --repo "$REPO" --color 0E8A16 --description "Release as a patch version" --force >/dev/null
gh label create "release:minor" --repo "$REPO" --color FBCA04 --description "Release as a minor version" --force >/dev/null
gh label create "release:major" --repo "$REPO" --color D93F0B --description "Release as a major version" --force >/dev/null
printf 'Labels ready: release:patch, release:minor, release:major.\n'

step "4. Create the GitHub token for the version bump"
cat <<EOF
Create a fine-grained personal access token on this page:
  https://github.com/settings/personal-access-tokens/new

Use these settings:
  - Token name:         js-ci-runner release bump
  - Resource owner:     ${REPO%%/*}
  - Expiration:         your choice (set a reminder to rotate it)
  - Repository access:  Only select repositories -> $REPO
  - Permissions:        Repository permissions -> Contents -> Read and write
                        (Metadata: Read-only is added automatically. Add nothing else.)

Paste it at the next prompt. The input stays hidden.
EOF
token=""
read -r -s -p "Paste the token: " token
printf '\n'
[ -n "$token" ] || fail "No token entered."
GH_TOKEN="$token" gh api "repos/$REPO" --jq .full_name >/dev/null 2>&1 \
  || { unset token; fail "The token cannot read $REPO. Check its repository access."; }
token_login=$(GH_TOKEN="$token" gh api user --jq .login 2>/dev/null || true)
if [ "$token_login" != "$login" ]; then
  unset token
  fail "The token belongs to '${token_login:-unknown}', not the admin account $login."
fi
printf '%s' "$token" | gh secret set RELEASE_TOKEN --repo "$REPO"
unset token
printf 'Stored RELEASE_TOKEN. Make sure you granted Contents: Read and write; the first release pull request confirms the push.\n'

step "5. Protect master and develop (optional)"
read -r -p "Require pull requests and passing CI on master and develop? [y/N] " answer
if [ "${answer:-N}" = "y" ] || [ "${answer:-N}" = "Y" ]; then
  for branch in master develop; do
    gh api -X PUT "repos/$REPO/branches/$branch/protection" --input - >/dev/null <<JSON
{
  "required_status_checks": { "strict": true, "contexts": ["lint", "images (ci)", "images (runtime)"] },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
    printf 'Protected %s. Admins can still bypass, which the release bump relies on.\n' "$branch"
  done
else
  printf 'Skipped. Run this script again to add protection later.\n'
fi

cat <<EOF

Setup is complete.
After the first push to develop publishes images, make each GHCR package public if other repositories should pull it:
  https://github.com/$login?tab=packages  -> js-ci-runner/ci and js-ci-runner/runtime -> Package settings -> Change visibility
EOF
