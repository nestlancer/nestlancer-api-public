#!/usr/bin/env bash
# Bootstrap Prisma for first-time / init flows:
#   1. Generate Prisma client when missing (uses DATABASE_URL — app user)
#   2. Regenerate migration SQL dirs when missing (or INIT_MIGRATE_REGEN=1)
#   3. Apply pending migrations (migrate deploy via MIGRATION_DATABASE_URL)
#
# Used by: bash seed/seed.sh --env=dev --phase=core --migrate
# Force fresh SQL: INIT_MIGRATE_REGEN=1 bash seed/seed.sh --env=dev --phase=core --migrate
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/db/_load-env.sh
source "$ROOT/scripts/db/_load-env.sh"
# shellcheck source=scripts/db/_prisma-node.sh
source "$ROOT/scripts/db/_prisma-node.sh"

_db_load_dotenv
_prisma_node_resolve
_prisma_cli

_reset_public_schema() {
  local db_url="${MIGRATION_DATABASE_URL:-}"
  if [ -z "$db_url" ]; then
    echo "ERROR: MIGRATION_DATABASE_URL is required for schema reset." >&2
    exit 1
  fi

  if [ "${INIT_MIGRATE_ALLOW_PROD_RESET:-0}" != "1" ]; then
    if echo "$db_url" | grep -qiE 'prod|production'; then
      echo "ERROR: Database URL looks like production — schema reset refused." >&2
      echo "  INIT_MIGRATE_REGEN replaces migration history; the DB must be reset too." >&2
      echo "  To proceed (destroys all data): INIT_MIGRATE_ALLOW_PROD_RESET=1" >&2
      exit 1
    fi
  fi

  if ! command -v psql >/dev/null 2>&1; then
    echo "ERROR: psql is required for schema reset after INIT_MIGRATE_REGEN." >&2
    exit 1
  fi

  echo "==> Resetting public schema (DROP CASCADE + CREATE) — clears tables and _prisma_migrations"
  psql "$db_url" -v ON_ERROR_STOP=1 -q <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
SQL
  echo "==> Public schema reset complete"
}

MIGRATIONS_DIR="$ROOT/prisma/migrations"
GENERATED_CLIENT="$ROOT/prisma/generated/client.js"
APP_DATABASE_URL="${DATABASE_URL:-postgresql://127.0.0.1:5432/postgres}"

echo "==> Prisma migrate bootstrap"

if [ ! -f "$GENERATED_CLIENT" ]; then
  echo "==> Generating Prisma client (prisma/generated missing)"
  DATABASE_URL="$APP_DATABASE_URL" bash "$ROOT/scripts/db/prisma-generate.sh"
else
  echo "==> Prisma client present (prisma/generated)"
fi

migration_sql_count=0
if [ -d "$MIGRATIONS_DIR" ]; then
  migration_sql_count="$(find "$MIGRATIONS_DIR" -mindepth 2 -maxdepth 2 -name 'migration.sql' 2>/dev/null | wc -l | tr -d ' ')"
fi

regen="${INIT_MIGRATE_REGEN:-0}"
if [ "$migration_sql_count" -eq 0 ] || [ "$regen" = "1" ]; then
  if [ "$regen" = "1" ]; then
    echo "==> INIT_MIGRATE_REGEN=1 — removing existing migration SQL dirs"
  else
    echo "==> No migration.sql files found — creating fresh migration from schema"
  fi

  mkdir -p "$MIGRATIONS_DIR"
  for dir in "$MIGRATIONS_DIR"/*/; do
    [ -d "$dir" ] || continue
    rm -rf "$dir"
  done

  ts="$(date +%Y%m%d%H%M%S)"
  migration_dir="$MIGRATIONS_DIR/${ts}_init"
  mkdir -p "$migration_dir"

  echo "==> Writing $migration_dir/migration.sql (migrate diff --from-empty)"
  DATABASE_URL="$APP_DATABASE_URL" "${PRISMA_CLI[@]}" migrate diff \
    --from-empty \
    --to-schema prisma/schema \
    --script \
    --output "$migration_dir/migration.sql"

  if [ ! -s "$migration_dir/migration.sql" ]; then
    echo "ERROR: migrate diff produced empty SQL" >&2
    exit 1
  fi

  echo "==> Appending Prisma-unsupported SQL from prisma/sql/"
  bash "$ROOT/scripts/db/append-prisma-sql.sh" "$migration_dir/migration.sql"

  echo "==> Fresh migration created: ${ts}_init"

  if [ "${INIT_MIGRATE_RESET_SCHEMA:-1}" = "1" ]; then
    _reset_public_schema
  else
    echo "==> INIT_MIGRATE_RESET_SCHEMA=0 — skipping schema reset (migrate deploy may fail if history drifted)"
  fi
else
  echo "==> Using existing migration SQL dirs ($migration_sql_count file(s))"
fi

_db_use_migration_database_url
echo "==> Migrate deploy user: nl_platform_migrate (MIGRATION_DATABASE_URL)"

echo "==> Prisma migrate status"
"${PRISMA_CLI[@]}" migrate status || true

echo "==> Applying pending migrations (migrate deploy)"
"${PRISMA_CLI[@]}" migrate deploy

echo "==> Prisma migrate bootstrap complete"
