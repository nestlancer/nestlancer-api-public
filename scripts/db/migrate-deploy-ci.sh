#!/usr/bin/env bash
# Non-interactive Prisma migrate deploy for CI/CD (no prompts).
# Uses MIGRATION_DATABASE_URL (nl_platform_migrate — DDL only).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/db/_load-env.sh
source "$ROOT/scripts/db/_load-env.sh"
# shellcheck source=scripts/db/_prisma-node.sh
source "$ROOT/scripts/db/_prisma-node.sh"

_db_load_dotenv
_db_use_migration_database_url
_prisma_node_resolve
_prisma_cli

echo "==> Prisma migrate status (MIGRATION_DATABASE_URL)"
"${PRISMA_CLI[@]}" migrate status || true

echo "==> Applying pending migrations (migrate deploy)"
"${PRISMA_CLI[@]}" migrate deploy

echo "==> Migrations applied successfully"
