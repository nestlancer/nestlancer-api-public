#!/usr/bin/env bash
# Install / generate production origin TLS certs into docker/caddy/certs/
# for reuse across VPS resets (avoids Let's Encrypt rate-limit burns).
#
# Usage:
#   bash scripts/docker/install-prod-origin-certs.sh --cert ./origin.pem --key ./origin.key
#   bash scripts/docker/install-prod-origin-certs.sh --self-signed   # CF SSL=Full only (not Full strict)
#   bash scripts/docker/install-prod-origin-certs.sh --print-infisical

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CERT_DIR="$ROOT/docker/caddy/certs"
CERT_FILE="$CERT_DIR/origin.pem"
KEY_FILE="$CERT_DIR/origin.key"

CERT_SRC=""
KEY_SRC=""
SELF_SIGNED=0
PRINT_INFISICAL=0

HOSTS=(
  api.nestlancer.com
  app.nestlancer.com
  admin.nestlancer.com
  landing.nestlancer.com
  nestlancer.com
  www.nestlancer.com
)

usage() {
  sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --cert) CERT_SRC="${2:-}"; shift 2 ;;
    --key) KEY_SRC="${2:-}"; shift 2 ;;
    --self-signed) SELF_SIGNED=1; shift ;;
    --print-infisical) PRINT_INFISICAL=1; shift ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown arg: $1" >&2; usage 1 ;;
  esac
done

mkdir -p "$CERT_DIR"
chmod 750 "$CERT_DIR"

install_from_files() {
  [ -n "$CERT_SRC" ] && [ -n "$KEY_SRC" ] || {
    echo "ERROR: --cert and --key are required together" >&2
    exit 1
  }
  [ -f "$CERT_SRC" ] || { echo "ERROR: cert not found: $CERT_SRC" >&2; exit 1; }
  [ -f "$KEY_SRC" ] || { echo "ERROR: key not found: $KEY_SRC" >&2; exit 1; }
  cp -f "$CERT_SRC" "$CERT_FILE"
  cp -f "$KEY_SRC" "$KEY_FILE"
  chmod 644 "$CERT_FILE"
  chmod 600 "$KEY_FILE"
  echo "Installed origin TLS certs → $CERT_DIR"
}

install_self_signed() {
  echo "WARN: Generating long-lived self-signed cert." >&2
  echo "WARN: Cloudflare Full (strict) will still return HTTP 526." >&2
  echo "WARN: Use Cloudflare Origin Certificate for Full (strict)." >&2
  local san=""
  local h
  for h in "${HOSTS[@]}"; do
    if [ -z "$san" ]; then
      san="DNS:${h}"
    else
      san="${san},DNS:${h}"
    fi
  done
  san="${san},DNS:*.nestlancer.com"

  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
    -days 825 -nodes \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/O=Nestlancer/CN=nestlancer.com" \
    -addext "subjectAltName=${san}"
  chmod 644 "$CERT_FILE"
  chmod 600 "$KEY_FILE"
  echo "Wrote self-signed origin TLS certs → $CERT_DIR"
}

print_infisical() {
  [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ] || {
    echo "ERROR: install certs first" >&2
    exit 1
  }
  local cert_b64 key_b64
  cert_b64="$(base64 -w0 <"$CERT_FILE")"
  key_b64="$(base64 -w0 <"$KEY_FILE")"
  cat <<EOF
# Add these to Infisical backend project → env \`prod\` (shared secrets).
# Fresh VPS: ensure-prod-origin-certs.sh materializes docker/caddy/certs/ from them.

CADDY_ORIGIN_CERT_B64=${cert_b64}
CADDY_ORIGIN_KEY_B64=${key_b64}
EOF
}

if [ "$PRINT_INFISICAL" -eq 1 ]; then
  print_infisical
  exit 0
fi

if [ "$SELF_SIGNED" -eq 1 ]; then
  install_self_signed
elif [ -n "$CERT_SRC" ] || [ -n "$KEY_SRC" ]; then
  install_from_files
else
  usage 1
fi

bash "$ROOT/scripts/docker/ensure-prod-origin-certs.sh"
echo
echo "Next: pnpm docker:prod:proxy:up"
echo "Optional Infisical backup: bash scripts/docker/install-prod-origin-certs.sh --print-infisical"
