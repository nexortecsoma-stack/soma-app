#!/usr/bin/env bash
set -euo pipefail

# Find monorepo root (directory containing pnpm-workspace.yaml)
REPO_ROOT="$PWD"
while [ "$REPO_ROOT" != "/" ] && [ ! -f "$REPO_ROOT/pnpm-workspace.yaml" ]; do
  REPO_ROOT="$(dirname "$REPO_ROOT")"
done

echo "Monorepo root: $REPO_ROOT"
cd "$REPO_ROOT"

# Install with pnpm (no --frozen-lockfile to avoid version-mismatch failures)
pnpm install --no-frozen-lockfile
