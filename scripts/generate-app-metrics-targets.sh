#!/usr/bin/env bash
# Print APP_METRICS_TARGETS for Infra VPS Prometheus (see observability-implementation-plan.md).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -f "${ROOT_DIR}/.env.infisical" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env.infisical"
  set +a
fi

HOST="${APP_VPS_HOST:-}"
if [[ -z "${HOST}" ]]; then
  if command -v tailscale >/dev/null 2>&1; then
    HOST="$(tailscale ip -4 2>/dev/null | head -1 || true)"
  fi
fi
if [[ -z "${HOST}" ]]; then
  echo "Set APP_VPS_HOST in .env.infisical (Tailscale IP of this app VPS)" >&2
  exit 1
fi

TARGETS=(
  "${HOST}:13000:gateway"
  "${HOST}:13100:ws-gateway"
  "${HOST}:14001:auth"
  "${HOST}:14002:users"
  "${HOST}:14003:payments"
  "${HOST}:14004:webhooks"
  "${HOST}:14005:admin"
  "${HOST}:14006:requests"
  "${HOST}:14007:quotes"
  "${HOST}:14008:projects"
  "${HOST}:14009:progress"
  "${HOST}:14010:messaging"
  "${HOST}:14011:notifications"
  "${HOST}:14012:media"
  "${HOST}:14013:portfolio"
  "${HOST}:14014:blog"
  "${HOST}:14015:contact"
  "${HOST}:14016:health"
  "${HOST}:15001:analytics-worker"
  "${HOST}:15002:audit-worker"
  "${HOST}:15003:cdn-worker"
  "${HOST}:15004:document-worker"
  "${HOST}:15005:email-worker"
  "${HOST}:15006:export-worker"
  "${HOST}:15007:media-worker"
  "${HOST}:15008:notification-worker"
  "${HOST}:15009:outbox-poller"
  "${HOST}:15010:webhook-worker"
)

IFS=,
echo "APP_METRICS_TARGETS=${TARGETS[*]}"
