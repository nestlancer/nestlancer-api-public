#!/usr/bin/env bash
# Load Infisical secrets into GITHUB_ENV for GitHub Actions (optional workflows).
# Backend CD (cd.yml) does NOT use this — build runs without DB; VPS exports Infisical on deploy.
# Infisical dotenv export wraps values in quotes; echoing those lines verbatim
# leaves quotes in the env value and breaks Prisma (P1013 invalid scheme).
set -euo pipefail

if [ -z "${GITHUB_ENV:-}" ]; then
  echo "ERROR: GITHUB_ENV is not set (run only in GitHub Actions)" >&2
  exit 1
fi

PROJECT_ID="${1:?usage: infisical-export-github-env.sh <projectId> [env]}"
INFISICAL_ENV="${2:-dev}"

ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT

infisical export --env="$INFISICAL_ENV" --format=dotenv --projectId="$PROJECT_ID" >"$ENV_FILE"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

while IFS= read -r line || [ -n "$line" ]; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  key="${line%%=*}"
  key="${key//$'\r'/}"
  [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
  val="${!key-}"
  delimiter="INFISICAL_ENV_${key}_EOF"
  {
    printf '%s<<%s\n' "$key" "$delimiter"
    printf '%s\n' "$val"
    printf '%s\n' "$delimiter"
  } >>"$GITHUB_ENV"
done <"$ENV_FILE"
