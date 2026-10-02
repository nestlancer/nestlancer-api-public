#!/usr/bin/env bash
# Post-deploy smoke: gateway liveness + readiness.
# On failure, dumps compose status and gateway logs for CD triage.

set -euo pipefail

if docker inspect nl-prod-gateway >/dev/null 2>&1; then
  GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:4000}"
  GATEWAY_CONTAINER="${GATEWAY_CONTAINER:-nl-prod-gateway}"
else
  GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:3000}"
  GATEWAY_CONTAINER="${GATEWAY_CONTAINER:-nl-gateway}"
fi

BASE="${GATEWAY_URL%/}/api/v1/health"
MAX_ATTEMPTS="${SMOKE_MAX_ATTEMPTS:-90}"
SLEEP_SECS="${SMOKE_SLEEP_SECS:-3}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"

echo "Smoke checks against ${BASE} (max ${MAX_ATTEMPTS} attempts, sleep ${SLEEP_SECS}s)"

dump_diagnostics() {
  echo "──── smoke diagnostics ────" >&2
  docker ps -a --filter "name=nl-" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || true
  echo "──── ${GATEWAY_CONTAINER} logs (tail 120) ────" >&2
  docker logs --tail 120 "$GATEWAY_CONTAINER" 2>&1 || true
  echo "──── curl -sS -D- ${BASE}/live ────" >&2
  curl -sS -D- --max-time 5 "${BASE}/live" 2>&1 || true
  echo "──────────────────────────" >&2
}

for path in live ready; do
  url="${BASE}/${path}"
  attempt=1
  until curl -sf "$url" >/dev/null; do
    if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
      echo "ERROR: ${url} did not return 2xx after ${MAX_ATTEMPTS} attempts" >&2
      dump_diagnostics
      exit 1
    fi
    if [ $((attempt % 10)) -eq 0 ]; then
      echo "  waiting for ${path} (${attempt}/${MAX_ATTEMPTS})..."
      # Periodic status so CD logs show whether the container is up/restarting.
      docker inspect --format '{{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}}' \
        "$GATEWAY_CONTAINER" 2>/dev/null || echo "  (container ${GATEWAY_CONTAINER} not found yet)"
    fi
    sleep "$SLEEP_SECS"
    attempt=$((attempt + 1))
  done
  echo "  OK ${path}"
done

echo "Smoke checks passed"
