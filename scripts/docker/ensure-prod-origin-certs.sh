#!/usr/bin/env bash
# Ensure docker/caddy/certs/origin.{pem,key} exist before starting nl-prod-proxy.
# Sources (in order):
#   1) Existing files in docker/caddy/certs/
#   2) CADDY_ORIGIN_CERT_B64 + CADDY_ORIGIN_KEY_B64 env / .env.infisical
#
# Usage:
#   bash scripts/docker/ensure-prod-origin-certs.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CERT_DIR="$ROOT/docker/caddy/certs"
CERT_FILE="$CERT_DIR/origin.pem"
KEY_FILE="$CERT_DIR/origin.key"

mkdir -p "$CERT_DIR"
chmod 750 "$CERT_DIR"

load_dotenv_infisical() {
  local f="$ROOT/.env.infisical"
  [ -f "$f" ] || return 0
  # shellcheck disable=SC1090
  set -a
  # Only pull the cert vars (avoid sourcing secrets into unrelated env broadly)
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      CADDY_ORIGIN_CERT_B64=*|CADDY_ORIGIN_KEY_B64=*)
        export "$line"
        ;;
    esac
  done <"$f"
  set +a
}

materialize_from_b64() {
  local cert_b64="${CADDY_ORIGIN_CERT_B64:-}"
  local key_b64="${CADDY_ORIGIN_KEY_B64:-}"
  if [ -z "$cert_b64" ] || [ -z "$key_b64" ]; then
    return 1
  fi
  printf '%s' "$cert_b64" | base64 -d >"$CERT_FILE"
  printf '%s' "$key_b64" | base64 -d >"$KEY_FILE"
  chmod 644 "$CERT_FILE"
  chmod 600 "$KEY_FILE"
  echo "Materialized origin TLS certs from CADDY_ORIGIN_*_B64 → $CERT_DIR"
}

validate_pair() {
  [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ] || return 1
  [ -s "$CERT_FILE" ] && [ -s "$KEY_FILE" ] || return 1
  openssl x509 -in "$CERT_FILE" -noout >/dev/null 2>&1 || {
    echo "ERROR: $CERT_FILE is not a valid X.509 certificate" >&2
    return 1
  }
  openssl pkey -in "$KEY_FILE" -noout >/dev/null 2>&1 || {
    echo "ERROR: $KEY_FILE is not a valid private key" >&2
    return 1
  }
  # Confirm key matches cert (works for RSA and EC)
  local cert_pub key_pub
  cert_pub="$(openssl x509 -in "$CERT_FILE" -pubkey -noout 2>/dev/null | openssl md5)"
  key_pub="$(openssl pkey -in "$KEY_FILE" -pubout 2>/dev/null | openssl md5)"
  if [ -z "$cert_pub" ] || [ -z "$key_pub" ] || [ "$cert_pub" != "$key_pub" ]; then
    echo "ERROR: origin.pem and origin.key do not match" >&2
    return 1
  fi
  return 0
}

print_help_and_fail() {
  cat >&2 <<'EOF'
ERROR: Production origin TLS certs are missing.

Cloudflare Full (strict) requires a trusted origin certificate.
`tls internal` / missing certs → public HTTPS returns Cloudflare HTTP 526.

Fix (recommended — Cloudflare Origin Certificate, 15y, no LE rate limits):
  1. Cloudflare → SSL/TLS → Origin Server → Create Certificate
     Hostnames: api/web/admin/landing.nestlancer.com (+ *.nestlancer.com)
  2. Install into the project (persisted for reuse on fresh VPS):
       bash scripts/docker/install-prod-origin-certs.sh --cert ./origin.pem --key ./origin.key
  3. Optional: store Base64 in Infisical prod as CADDY_ORIGIN_CERT_B64 / CADDY_ORIGIN_KEY_B64
       bash scripts/docker/install-prod-origin-certs.sh --print-infisical
  4. pnpm docker:prod:proxy:up

See: docker/caddy/certs/README.md and docs/operations/prod-origin-tls.md
EOF
  exit 1
}

if validate_pair; then
  echo "OK: origin TLS certs present at $CERT_DIR"
  openssl x509 -in "$CERT_FILE" -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null || true
  exit 0
fi

load_dotenv_infisical
if materialize_from_b64 && validate_pair; then
  openssl x509 -in "$CERT_FILE" -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null || true
  exit 0
fi

print_help_and_fail
