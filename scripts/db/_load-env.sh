#!/usr/bin/env bash
# Shared env loading for database scripts.
# Source from scripts/db/*.sh — do not execute directly.

_db_load_dotenv_file() {
  local file="$1"
  local line key val
  while IFS= read -r line || [ -n "$line" ]; do
    # skip blanks / comments
    case "$line" in
      ''|\#*) continue ;;
    esac
    [[ "$line" == *=* ]] || continue
    key="${line%%=*}"
    val="${line#*=}"
    # strip one layer of wrapping quotes
    if [[ ${#val} -ge 2 && ${val:0:1} == '"' && ${val: -1} == '"' ]]; then
      val="${val:1:${#val}-2}"
    elif [[ ${#val} -ge 2 && ${val:0:1} == "'" && ${val: -1} == "'" ]]; then
      val="${val:1:${#val}-2}"
    fi
    export "$key=$val"
  done < "$file"
}

_db_load_dotenv() {
  local root="${ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
  cd "$root"

  if [ -f .env.infisical ]; then
    _db_load_dotenv_file .env.infisical
  elif [ -f .env.development ]; then
    _db_load_dotenv_file .env.development
  fi
}

# Prisma migrate deploy/status must use the DDL role (nl_platform_migrate).
_db_use_migration_database_url() {
  if [ -z "${MIGRATION_DATABASE_URL:-}" ]; then
    echo "ERROR: MIGRATION_DATABASE_URL is required for Prisma migrations." >&2
    echo "  Add to .env.infisical — DDL user (nl_platform_migrate), not app runtime." >&2
    echo "  Runtime app uses DATABASE_URL (nl_platform_app)." >&2
    exit 1
  fi
  export DATABASE_URL="$MIGRATION_DATABASE_URL"
}
