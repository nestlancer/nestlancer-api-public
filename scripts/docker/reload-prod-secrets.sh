#!/usr/bin/env bash
# Re-export Infisical prod → .env.infisical and force-recreate containers
# so updated secrets (e.g. RAZORPAY_WEBHOOK_SECRET) are actually loaded.
#
# Usage:
#   INFISICAL_ENV=prod bash scripts/docker/reload-prod-secrets.sh
#   INFISICAL_ENV=prod bash scripts/docker/reload-prod-secrets.sh svc-webhooks svc-payments worker-webhook

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

export INFISICAL_ENV="${INFISICAL_ENV:-prod}"
export COMPOSE_PULL="${COMPOSE_PULL:-never}"

# Always re-export (compose-prod.sh honors SKIP_INFISICAL_EXPORT)
export SKIP_INFISICAL_EXPORT=0

SERVICES=("$@")

echo "Re-exporting Infisical env=${INFISICAL_ENV} → .env.infisical"
./scripts/docker/compose-prod.sh config >/dev/null

if [ ! -f .env.infisical ]; then
  echo "ERROR: .env.infisical missing after export" >&2
  exit 1
fi

if grep -q '^RAZORPAY_WEBHOOK_SECRET=' .env.infisical; then
  # Show length only — never print the secret
  len="$(grep '^RAZORPAY_WEBHOOK_SECRET=' .env.infisical | cut -d= -f2- | wc -c)"
  echo "RAZORPAY_WEBHOOK_SECRET present (bytes≈$((len - 1)))"
fi

if [ "${#SERVICES[@]}" -eq 0 ]; then
  echo "Force-recreating entire prod stack so env_file is reloaded..."
  FORCE_RECREATE=1 ./scripts/docker/compose-prod.sh up -d --force-recreate
else
  echo "Force-recreating services: ${SERVICES[*]}"
  FORCE_RECREATE=1 ./scripts/docker/compose-prod.sh up -d --force-recreate "${SERVICES[@]}"
fi

echo "Done. Containers now use the latest .env.infisical values."
echo "Tip: gateway local smoke → GATEWAY_URL=http://127.0.0.1:4000 ./scripts/deploy/smoke-health.sh"
