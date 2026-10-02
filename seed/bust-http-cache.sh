#!/usr/bin/env bash
# Bust Redis HTTP response cache keys (http:cache:*) after seed/reset/migrate.
# Prevents stale empty public payloads (portfolio featured, blog lists, etc.)
# from surviving a reseed until FEATURED_CACHE_TTL / PUBLIC_CACHE_TTL expire.
#
# Usage (from repo root, with .env.infisical present):
#   bash prod-data/bust-http-cache.sh
#   REDIS_URL='redis://…' bash prod-data/bust-http-cache.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${INFISICAL_ENV_FILE:-.env.infisical}"

if [[ -z "${REDIS_URL:-}" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "[cache-bust] SKIP: no REDIS_URL and missing ${ENV_FILE}" >&2
    exit 0
  fi
  REDIS_URL="$(grep -E '^REDIS_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d \"\' )"
fi

if [[ -z "${REDIS_URL:-}" ]]; then
  echo "[cache-bust] SKIP: REDIS_URL empty" >&2
  exit 0
fi

if ! command -v redis-cli >/dev/null 2>&1; then
  echo "[cache-bust] SKIP: redis-cli not installed" >&2
  exit 0
fi

PREFIX="${HTTP_CACHE_PREFIX:-http:cache:}"

# Prefer host/port/-a over redis-cli -u (some builds mishandle URL-encoded passwords).
REDIS_HOST="$(python3 - <<'PY' "$REDIS_URL"
import sys, urllib.parse
u = urllib.parse.urlparse(sys.argv[1])
print(u.hostname or '')
PY
)"
REDIS_PORT="$(python3 - <<'PY' "$REDIS_URL"
import sys, urllib.parse
u = urllib.parse.urlparse(sys.argv[1])
print(u.port or 6379)
PY
)"
REDIS_PASS="$(python3 - <<'PY' "$REDIS_URL"
import sys, urllib.parse
u = urllib.parse.urlparse(sys.argv[1])
print(u.password or '')
PY
)"
REDIS_DB="$(python3 - <<'PY' "$REDIS_URL"
import sys, urllib.parse
u = urllib.parse.urlparse(sys.argv[1])
print((u.path or '/0').lstrip('/') or '0')
PY
)"

CLI=(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -n "$REDIS_DB" --no-auth-warning)
if [[ -n "$REDIS_PASS" ]]; then
  CLI+=(-a "$REDIS_PASS")
fi

echo "[cache-bust] Scanning Redis ${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB} for ${PREFIX}* …"

deleted=0
while IFS= read -r key; do
  [[ -z "$key" ]] && continue
  "${CLI[@]}" DEL "$key" >/dev/null
  deleted=$((deleted + 1))
done < <("${CLI[@]}" --scan --pattern "${PREFIX}*")

echo "[cache-bust] Deleted ${deleted} key(s) matching ${PREFIX}*"
