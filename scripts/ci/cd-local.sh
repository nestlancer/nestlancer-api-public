#!/usr/bin/env bash
# Simulate Backend CD (Dev) locally — same steps as .github/workflows/cd.yml
# (install, Prisma generate, build). Does not run migrations or VPS SSH deploy.
#
# Usage:
#   ./scripts/ci/cd-local.sh
#
# Optional: run full workflow in Docker via act (needs secrets file):
#   act workflow_dispatch -W .github/workflows/cd.yml --secret-file .secrets.act
#
# After schema changes, apply migrations manually on the VPS (or locally on Tailscale):
#   ./scripts/db/migrate-deploy.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: '$1' not found" >&2
    exit 1
  }
}

need pnpm
need node

if [ "$(node -p "+process.versions.node.split('.')[1]")" -lt 19 ]; then
  echo "WARN: CD uses Node 20.19; you have $(node -v). Use nvm/fnm: nvm install 20.19 && nvm use 20.19" >&2
fi

export NODE_ENV=development

step() {
  echo ""
  echo "==> $*"
  echo ""
}

step "Install dependencies"
pnpm install

step "Generate Prisma client"
pnpm db:generate

step "Build (Turborepo)"
pnpm build

echo ""
echo "Local CD simulation finished (build only — no migrations, no VPS deploy)."
echo "Migrations: ./scripts/db/migrate-deploy.sh (manual, on a host that can reach the DB)."
echo "GitHub CD:  gh workflow run 'Backend CD (Dev)'"
echo ""
