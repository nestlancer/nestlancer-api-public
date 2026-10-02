#!/usr/bin/env bash
# Apply pending Prisma migrations manually — NOT part of CD/deploy.
#
# Run on the VPS (or any machine on Tailscale) after you commit new migration files:
#   cd /root/nestlancer-backend-api
#   ./scripts/db/migrate-deploy.sh
#
# Uses MIGRATION_DATABASE_URL (nl_platform_migrate). Loads .env.infisical when present.

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

DB_HOST="$(node -pe "try{new URL(process.env.DATABASE_URL).host}catch{'?'}" 2>/dev/null || echo "?")"
echo "Database host: $DB_HOST (migrate user via MIGRATION_DATABASE_URL)"
echo "Pending migrations (status):"
"${PRISMA_CLI[@]}" migrate status || true
echo ""
read -r -p "Apply pending migrations with prisma migrate deploy? [y/N] " reply
if [[ ! "$reply" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

"${PRISMA_CLI[@]}" migrate deploy
echo "Done."
