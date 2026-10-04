#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [[ -f "${ROOT_DIR}/.env.infisical" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env.infisical"
  set +a
fi

HOST="${PROMETHEUS_URL:-}"
if [[ -z "${HOST}" ]]; then
  HOST="http://100.72.87.50:9090"
fi
INFRA_HOST="${HOST#http://}"
INFRA_HOST="${INFRA_HOST#https://}"
INFRA_HOST="${INFRA_HOST%%/*}"
INFRA_IP="${INFRA_HOST%%:*}"

PROM_USER="${PROMETHEUS_USERNAME:-${LOKI_USERNAME:-}}"
PROM_PASS="${PROMETHEUS_PASSWORD:-${LOKI_PASSWORD:-}}"
PROM_AUTH=()
[[ -n "${PROM_USER}" && -n "${PROM_PASS}" ]] && PROM_AUTH=(-u "${PROM_USER}:${PROM_PASS}")

PROM_URL="${PROMETHEUS_URL:-http://${INFRA_IP}:9090}"
LOKI_URL="${LOKI_PUSH_URL:-}"
LOKI_URL="${LOKI_URL%/loki/api/v1/push}"
LOKI_URL="${LOKI_URL:-http://${INFRA_IP}:3100}"
LOKI_AUTH=()
[[ -n "${LOKI_USERNAME:-}" && -n "${LOKI_PASSWORD:-}" ]] && LOKI_AUTH=(-u "${LOKI_USERNAME}:${LOKI_PASSWORD}")

API_LOCAL="${GATEWAY_URL:-http://127.0.0.1:3000}"
METRICS_LOCAL="${GATEWAY_METRICS_URL:-http://127.0.0.1:13000/metrics}"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; }
warn() { echo "  ⚠️  $1"; }

echo "==> Nestlancer backend monitoring verification"
echo "    Infra: ${INFRA_IP}"
echo ""

echo "── Local stack ──"
if curl -sf "${API_LOCAL}/api/v1/health/live" >/dev/null; then
  pass "nl-gateway health (${API_LOCAL})"
else
  fail "Gateway not reachable — run: pnpm docker:up"
fi

RUNNING=$(docker ps --filter 'name=nl-' --format '{{.Names}}' 2>/dev/null | grep -v 'nl-promtail' | wc -l || echo 0)
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^nl-promtail$'; then
  pass "Promtail container running (ships logs → Loki)"
  if docker logs nl-promtail 2>&1 | tail -20 | grep -q '401 Unauthorized'; then
    warn "Promtail getting 401 from Loki — set LOKI_USERNAME + LOKI_PASSWORD in .env.infisical"
  fi
else
  fail "nl-promtail not running — logs will NOT reach Loki"
fi

if [[ "${RUNNING}" -ge 20 ]]; then
  pass "Docker containers running: ${RUNNING} (expected ~28)"
else
  warn "Only ${RUNNING} nl-* containers running (expected ~28)"
fi

if curl -sf "${METRICS_LOCAL}" | grep -qE 'nestlancer_|nodejs_'; then
  pass "Gateway /metrics exposes Prometheus metrics (${METRICS_LOCAL})"
else
  fail "Metrics endpoint missing (${METRICS_LOCAL})"
fi

for PORT in 13000 14001 15001; do
  if curl -sf "http://127.0.0.1:${PORT}/metrics" | grep -qE 'nestlancer_|nodejs_'; then
    pass "Published metrics port :${PORT}/metrics reachable locally"
  else
    warn "Port :${PORT}/metrics not reachable — recreate stack: pnpm docker:up"
  fi
done

if [[ -n "${APP_VPS_HOST:-}" ]]; then
  pass "APP_VPS_HOST=${APP_VPS_HOST} (for infra APP_METRICS_TARGETS)"
  echo "    Infra line: $(bash "${SCRIPT_DIR}/generate-app-metrics-targets.sh" 2>/dev/null | head -c 120)..."
else
  warn "Set APP_VPS_HOST in .env.infisical — run: pnpm monitoring:targets"
fi

echo ""
echo "── Prometheus (${PROM_URL}) ──"
if curl -sf "${PROM_AUTH[@]}" "${PROM_URL}/-/healthy" >/dev/null 2>&1; then
  pass "Prometheus healthy"
else
  warn "Cannot reach Prometheus (check PROMETHEUS_URL and auth in .env.infisical)"
fi

METRICS_Q='count({__name__=~"nestlancer_.+"})'
ENC=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''${METRICS_Q}'''))" 2>/dev/null || echo "up")
R=$(curl -sf "${PROM_AUTH[@]}" "${PROM_URL}/api/v1/query?query=${ENC}" 2>/dev/null || echo '{}')
if echo "${R}" | grep -q '"value"'; then
  pass "Prometheus has nestlancer_* metric series"
else
  warn "No nestlancer_* series in Prometheus — update infra APP_METRICS_TARGETS with App VPS Tailscale IP"
fi

echo ""
echo "── Loki (${LOKI_URL}) ──"
if curl -sf "${LOKI_AUTH[@]}" "${LOKI_URL}/ready" >/dev/null 2>&1; then
  pass "Loki ready"
else
  warn "Cannot reach Loki (check LOKI_PUSH_URL and auth in .env.infisical)"
fi

NOW_NS=$(($(date +%s) * 1000000000))
START_NS=$((NOW_NS - 3600 * 1000000000))
for QUERY in '{container=~"nl-.*"}' '{container="nl-gateway"}'; do
  R=$(curl -sf "${LOKI_AUTH[@]}" -G "${LOKI_URL}/loki/api/v1/query_range" \
    --data-urlencode "query=${QUERY}" \
    --data-urlencode "start=${START_NS}" \
    --data-urlencode "end=${NOW_NS}" \
    --data-urlencode "limit=3" 2>/dev/null || echo '{}')
  if echo "${R}" | grep -q '"values"'; then
    pass "Loki query matched: ${QUERY}"
  else
    warn "No logs for: ${QUERY} — check nl-promtail and LOKI_PUSH_URL"
  fi
done

echo ""
echo "── Tracing ──"
if [[ "${TRACING_ENABLED:-false}" == "true" ]]; then
  pass "TRACING_ENABLED=true"
  [[ -n "${JAEGER_OTLP_URL:-}" ]] && pass "JAEGER_OTLP_URL set" || warn "Set JAEGER_OTLP_URL in .env.infisical"
else
  warn "TRACING_ENABLED is not true — set in .env.infisical to export traces"
fi

JAEGER_UI="http://${INFRA_IP}:16686"
if curl -sf "${JAEGER_UI}" >/dev/null 2>&1; then
  pass "Jaeger UI reachable at ${JAEGER_UI}"
else
  warn "Jaeger UI not reachable at ${JAEGER_UI}"
fi

echo ""
echo "Verification complete."
