#!/usr/bin/env bash
# Start production Caddy proxy only after origin TLS certs are present.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/docker/ensure-prod-origin-certs.sh"
docker compose -f docker-compose.prod.proxy.yml up -d "$@"
echo "nl-prod-proxy started (ports 80/443)."
echo "Verify: curl -sS -o /dev/null -w '%{http_code}\\n' https://api.nestlancer.com/api/v1/health/live"
