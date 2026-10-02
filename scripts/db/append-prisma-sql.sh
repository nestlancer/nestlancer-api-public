#!/usr/bin/env bash
# Append Prisma-unsupported SQL fragments to a generated migration file.
# Constraints/triggers must run after table DDL, so they are appended at the end.
#
# Usage: append-prisma-sql.sh <path/to/migration.sql>
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SQL_DIR="$ROOT/prisma/sql"
# Marker shared with prisma/sql/check_constraints.sql — used to prevent double-append.
CHECK_MARKER='Business-rule CHECK constraints (Prisma-unsupported)'
EXPECTED_CHECK_COUNT=41

if [ $# -lt 1 ]; then
  echo "Usage: append-prisma-sql.sh <migration.sql>" >&2
  exit 1
fi

migration_file="$1"

if [ ! -f "$migration_file" ]; then
  echo "ERROR: migration file not found: $migration_file" >&2
  exit 1
fi

if grep -qF "$CHECK_MARKER" "$migration_file"; then
  echo "ERROR: CHECK constraints block already present in $migration_file (double-append guard)" >&2
  exit 1
fi

if [ ! -d "$SQL_DIR" ]; then
  echo "==> No prisma/sql directory — skipping append"
  exit 0
fi

_validate_sql_file() {
  local file="$1"
  if grep -qE '&gt;|&lt;|&amp;' "$file"; then
    echo "ERROR: HTML-escaped operators found in $file — use >=, <=, >, < instead" >&2
    exit 1
  fi
}

appended=0
for file in "$SQL_DIR"/*.sql; do
  [ -f "$file" ] || continue

  case "$(basename "$file")" in
    check_constraints.sql|*constraints*.sql|*triggers*.sql)
      _validate_sql_file "$file"
      echo "" >> "$migration_file"
      cat "$file" >> "$migration_file"
      echo "==> Appended $(basename "$file") to migration"
      appended=$((appended + 1))
      ;;
  esac
done

if [ "$appended" -eq 0 ]; then
  echo "ERROR: No constraint/trigger SQL fragments found in prisma/sql/" >&2
  exit 1
fi

actual_count="$(grep -c 'ADD CONSTRAINT.*_check"' "$migration_file" || true)"
if [ "$actual_count" -ne "$EXPECTED_CHECK_COUNT" ]; then
  echo "ERROR: Expected $EXPECTED_CHECK_COUNT CHECK constraints after append, found $actual_count" >&2
  exit 1
fi

echo "==> Verified $actual_count CHECK constraints in migration"
