#!/usr/bin/env bash
# Production Docker Compose helper (Infisical → .env.infisical).
#
# Usage:
#   INFISICAL_ENV=prod ./scripts/docker/compose-prod.sh up -d
#   ./scripts/docker/compose-prod.sh logs -f gateway

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.prod.yml"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"

if [ ! -f "$COMPOSE_FILE" ]; then
  node scripts/docker/generate-prod-compose.mjs
fi

if [ "${SKIP_INFISICAL_EXPORT:-}" != "1" ] && command -v infisical >/dev/null 2>&1; then
  if [ -z "${INFISICAL_TOKEN:-}" ]; then
    if [ -n "${INFISICAL_CLIENT_ID:-}" ] && [ -n "${INFISICAL_CLIENT_SECRET:-}" ]; then
      export INFISICAL_TOKEN
      INFISICAL_TOKEN="$(infisical login \
        --method=universal-auth \
        --client-id="$INFISICAL_CLIENT_ID" \
        --client-secret="$INFISICAL_CLIENT_SECRET" \
        --silent --plain)"
    elif ! infisical user get >/dev/null 2>&1; then
      echo "ERROR: Not logged in to Infisical. Run: infisical login" >&2
      echo "       Or set INFISICAL_TOKEN / INFISICAL_CLIENT_ID + INFISICAL_CLIENT_SECRET." >&2
      exit 1
    fi
  fi

  if [ -n "${INFISICAL_TOKEN:-}" ] || infisical user get >/dev/null 2>&1; then
    PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
    if [ -z "$PROJECT_ID" ] && [ -f .infisical.json ]; then
      PROJECT_ID="$(node -p "JSON.parse(require('fs').readFileSync('.infisical.json','utf8')).workspaceId")"
    fi
    export_args=(export --env="$INFISICAL_ENV" --format=dotenv)
    if [ -n "${PROJECT_ID:-}" ]; then
      export_args+=(--projectId="$PROJECT_ID")
    fi
    infisical "${export_args[@]}" > .env.infisical
    # Docker env_file does not strip shell quotes from Infisical dotenv export.
    bash scripts/docker/sanitize-infisical-env.sh .env.infisical
    chmod 600 .env.infisical
  fi
fi

if [ ! -f .env.infisical ]; then
  echo "WARN: .env.infisical missing — set SKIP_INFISICAL_EXPORT=1 if secrets are already present" >&2
fi

# Default: use images already on the VPS. Override with COMPOSE_PULL=always|missing.
# FORCE_RECREATE=1 → always recreate containers so updated .env.infisical is loaded
# (plain `up -d` can leave old env when only secrets changed).
args=("$@")
if [ "${#args[@]}" -gt 0 ] && [ "${args[0]}" = "up" ]; then
  pull_policy="${COMPOSE_PULL:-never}"
  has_pull=0
  has_force=0
  for a in "${args[@]}"; do
    if [ "$a" = "--pull" ]; then
      has_pull=1
    fi
    if [ "$a" = "--force-recreate" ]; then
      has_force=1
    fi
  done
  rest=("${args[@]:1}")
  args=(up)
  if [ "$has_pull" -eq 0 ]; then
    args+=(--pull "$pull_policy")
  fi
  if [ "${FORCE_RECREATE:-0}" = "1" ] && [ "$has_force" -eq 0 ]; then
    args+=(--force-recreate)
  fi
  args+=("${rest[@]}")
fi

exec docker compose -f "$COMPOSE_FILE" "${args[@]}"
