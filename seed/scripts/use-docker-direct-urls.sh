#!/usr/bin/env bash
# Resolve Nestlancer microservice URLs via the Docker compose network.
#
# Prod compose does NOT publish app HTTP ports on the host (only metrics).
# Infisical *_SERVICE_URL values point at 127.0.0.1:30xx which are unreachable,
# so run-seed.sh used to fall back to the public gateway — which rate-limits
# burst seed traffic. Calling containers by bridge IP / DNS avoids the gateway.
#
# Usage (from repo root, after prod stack is up):
#   source prod-data/scripts/use-docker-direct-urls.sh
#   unset API_BASE_URL
#   bash prod-data/run-seed.sh --env=prod --layers=demo --skip-export
#
set -euo pipefail

_nl_container_ip() {
  local name="$1"
  docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$name" 2>/dev/null || true
}

_nl_export_svc() {
  local env_key="$1"
  local container="$2"
  local port="$3"
  local ip
  ip="$(_nl_container_ip "$container")"
  if [[ -z "$ip" ]]; then
    echo "[seed] WARN: container ${container} not found — leave ${env_key} unchanged" >&2
    return 0
  fi
  export "${env_key}=http://${ip}:${port}"
  echo "[seed] ${env_key}=http://${ip}:${port}"
}

if ! command -v docker >/dev/null 2>&1; then
  echo "[seed] docker not available — cannot resolve direct service URLs" >&2
  return 1 2>/dev/null || exit 1
fi

# Prefer prod container names; fall back to common compose service aliases via DNS
# is not available on the host, so we resolve IPs from running containers.
_nl_export_svc AUTH_SERVICE_URL nl-prod-auth 3001
_nl_export_svc USERS_SERVICE_URL nl-prod-users 3002
_nl_export_svc PAYMENTS_SERVICE_URL nl-prod-payments 3003
_nl_export_svc WEBHOOKS_SERVICE_URL nl-prod-webhooks 3004
_nl_export_svc ADMIN_SERVICE_URL nl-prod-admin 3005
_nl_export_svc REQUESTS_SERVICE_URL nl-prod-requests 3006
_nl_export_svc QUOTES_SERVICE_URL nl-prod-quotes 3007
_nl_export_svc PROJECTS_SERVICE_URL nl-prod-projects 3008
_nl_export_svc PROGRESS_SERVICE_URL nl-prod-progress 3009
_nl_export_svc MESSAGING_SERVICE_URL nl-prod-messaging 3010
_nl_export_svc NOTIFICATIONS_SERVICE_URL nl-prod-notifications 3011
_nl_export_svc MEDIA_SERVICE_URL nl-prod-media 3012
_nl_export_svc PORTFOLIO_SERVICE_URL nl-prod-portfolio 3013
_nl_export_svc BLOG_SERVICE_URL nl-prod-blog 3014
_nl_export_svc CONTACT_SERVICE_URL nl-prod-contact 3015

# Critical: do not route seed HTTP through the rate-limited gateway.
unset API_BASE_URL || true
export API_BASE_URL=""
echo "[seed] Direct docker-network seeding enabled (gateway rate limits bypassed)"
