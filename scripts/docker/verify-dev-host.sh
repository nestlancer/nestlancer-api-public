#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DEV_HOST="${DEV_API_HOST:-dev-api.nestlancer.com}"
HEALTH_PATH="${HEALTH_PATH:-/api/v1/health/live}"
DOCS_PATH="${DOCS_PATH:-/docs}"

pass() { echo "PASS: $1"; }
warn() { echo "WARN: $1"; }
fail() { echo "FAIL: $1" >&2; exit 1; }

echo "Verifying dev host routing for ${DEV_HOST}"

if [ "$(docker inspect --format '{{.State.Running}}' nl-dev-proxy 2>/dev/null || true)" != "true" ]; then
  fail "dev proxy container is not running (start with: pnpm docker:up)"
fi
pass "dev proxy container is running"

LOCAL_HEALTH="$(curl -k -sS -m 20 --resolve "${DEV_HOST}:443:127.0.0.1" "https://${DEV_HOST}${HEALTH_PATH}" || true)"
if [[ "$LOCAL_HEALTH" == *'"status":"success"'* ]]; then
  pass "local HTTPS proxy health check passed"
else
  fail "local HTTPS proxy health check failed for ${HEALTH_PATH}"
fi

LOCAL_DOCS="$(curl -k -sS -m 20 --resolve "${DEV_HOST}:443:127.0.0.1" "https://${DEV_HOST}${DOCS_PATH}" || true)"
if [[ "$LOCAL_DOCS" == *"Swagger"* ]] || [[ "$LOCAL_DOCS" == *"Nestlancer API"* ]]; then
  pass "local docs endpoint is reachable at ${DOCS_PATH}"
else
  fail "local docs endpoint not reachable at ${DOCS_PATH}"
fi

PUBLIC_HEALTH_HEADERS="$(curl -sSI -m 20 "https://${DEV_HOST}${HEALTH_PATH}" || true)"
if [[ "$PUBLIC_HEALTH_HEADERS" == *" 200 "* ]]; then
  pass "public HTTPS health endpoint returned 200"
else
  warn "public HTTPS health is not 200 yet (check Cloudflare DNS/proxy origin mapping)"
fi

PUBLIC_DOCS_HEADERS="$(curl -sSI -m 20 "https://${DEV_HOST}${DOCS_PATH}" || true)"
if [[ "$PUBLIC_DOCS_HEADERS" == *" 200 "* ]]; then
  pass "public HTTPS docs endpoint returned 200"
else
  warn "public HTTPS docs is not 200 yet (this is external routing, not local docker proxy)"
fi

echo "Verification complete."
