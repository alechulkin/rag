#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

mkdir -p .git/hooks
cp -f scripts/hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push

echo "installed: .git/hooks/pre-push"

