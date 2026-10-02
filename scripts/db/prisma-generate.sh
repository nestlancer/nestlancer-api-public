#!/usr/bin/env bash
# Prisma 7 CLI requires Node >= 20.19 (see package.json engines).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/db/_prisma-node.sh
source "$ROOT/scripts/db/_prisma-node.sh"
_prisma_node_resolve

export DATABASE_URL="${DATABASE_URL:-postgresql://127.0.0.1:5432/postgres}"
exec "$NODE_BIN" "$ROOT/node_modules/prisma/build/index.js" generate --config "$ROOT/prisma.config.ts" "$@"
