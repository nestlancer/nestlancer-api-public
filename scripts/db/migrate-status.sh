#!/usr/bin/env bash
# Prisma migrate status using MIGRATION_DATABASE_URL (DDL user).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/db/_load-env.sh
source "$ROOT/scripts/db/_load-env.sh"
# shellcheck source=scripts/db/_prisma-node.sh
source "$ROOT/scripts/db/_prisma-node.sh"

_db_load_dotenv
_db_use_migration_database_url
_prisma_node_resolve
_prisma_cli

"${PRISMA_CLI[@]}" migrate status
