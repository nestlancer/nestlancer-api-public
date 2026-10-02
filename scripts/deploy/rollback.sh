#!/usr/bin/env bash
# Roll back VPS deploy to a previous git commit and restart compose.
#
# Usage (on VPS):
#   ./scripts/deploy/rollback.sh <git-sha>
#   ./scripts/deploy/rollback.sh   # uses .deploy-previous-sha if present

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"
TARGET_SHA="${1:-}"

if [ -z "$TARGET_SHA" ] && [ -f .deploy-previous-sha ]; then
  TARGET_SHA="$(cat .deploy-previous-sha)"
fi

if [ -z "$TARGET_SHA" ]; then
  echo "ERROR: provide a git SHA or ensure .deploy-previous-sha exists" >&2
  exit 1
fi

echo "Rolling back to ${TARGET_SHA}"
git fetch origin main --tags
git checkout "$TARGET_SHA"

if [ "${COMPOSE_FILE}" = "docker-compose.prod.yml" ]; then
  # Production stack uses pre-built GHCR images.
  # During failures, the caller typically exported NESTLANCER_IMAGE_TAG for the
  # "current" release, so we must override it with the tag that belongs to
  # TARGET_SHA (best-effort).
  PREV_TAG="$(git describe --tags --abbrev=0 --match 'v*' "$TARGET_SHA" 2>/dev/null || true)"
  if [ -n "$PREV_TAG" ]; then
    export NESTLANCER_IMAGE_TAG="${PREV_TAG#v}"
    echo "Resolved prod rollback image tag: ${NESTLANCER_IMAGE_TAG} (from ${PREV_TAG})"
  else
    echo "WARN: no 'v*' git tag found for ${TARGET_SHA}; using existing NESTLANCER_IMAGE_TAG value" >&2
  fi
fi

if [ -f .env.infisical ]; then
  docker compose -f "$COMPOSE_FILE" build
  docker compose -f "$COMPOSE_FILE" up -d
else
  echo "WARN: .env.infisical missing — run Infisical export before compose up" >&2
fi

GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:3000}" ./scripts/deploy/smoke-health.sh
echo "Rollback complete"
