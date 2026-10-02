#!/bin/sh
# Hybrid Nest runner for docker-compose.dev.yml
# Usage: run-nest-workload.sh <compose-service> <pnpm-filter> <kind>
#   kind = gateway | service | worker
#
# WATCH_SERVICES=all-services (24GB default) → gateways + microservices use
# `pnpm ... dev` (nest --watch); workers remain compiled.
# WATCH_SERVICES=all also watches workers. A comma list enables focused watch.
set -eu

COMPOSE_SVC="${1:?compose service name required}"
PNPM_FILTER="${2:?pnpm filter required}"
KIND="${3:-service}"

WATCH_SERVICES="${WATCH_SERVICES:-all-services}"

should_watch=0
old_ifs=$IFS
IFS=','
for item in $WATCH_SERVICES; do
  item=$(printf '%s' "$item" | tr -d ' ')
  if [ "$item" = "all" ] \
    || { [ "$item" = "all-services" ] && [ "$KIND" != "worker" ]; } \
    || [ "$item" = "$COMPOSE_SVC" ]; then
    should_watch=1
    break
  fi
done
IFS=$old_ifs

cd /app

# Ensure pdfkit resolves for services that webpack-externalize it (@nestlancer/pdf / documents).
# pnpm may keep it only under .pnpm without a root hoist link.
if [ ! -e node_modules/pdfkit ]; then
  _pdfkit="$(ls -d node_modules/.pnpm/pdfkit@*/node_modules/pdfkit 2>/dev/null | head -1 || true)"
  if [ -n "$_pdfkit" ]; then
    ln -sfn "${_pdfkit#node_modules/}" node_modules/pdfkit
    echo "[nest-workload] linked node_modules/pdfkit -> ${_pdfkit#node_modules/}"
  fi
fi

# Same for puppeteer — required by @nestlancer/pdf for invoice/receipt generation.
if [ ! -e node_modules/puppeteer ]; then
  _puppeteer="$(ls -d node_modules/.pnpm/puppeteer@*/node_modules/puppeteer 2>/dev/null | head -1 || true)"
  if [ -n "$_puppeteer" ]; then
    ln -sfn "${_puppeteer#node_modules/}" node_modules/puppeteer
    echo "[nest-workload] linked node_modules/puppeteer -> ${_puppeteer#node_modules/}"
  fi
fi

if [ "$should_watch" -eq 1 ]; then
  echo "[nest-workload] ${COMPOSE_SVC}: WATCH → pnpm --filter ${PNPM_FILTER} dev"
  if [ "$KIND" = "gateway" ]; then
    export NODE_OPTIONS="${NODE_OPTIONS_WATCH:---max-old-space-size=1024}"
  else
    export NODE_OPTIONS="${NODE_OPTIONS_WATCH:---max-old-space-size=896}"
  fi
  exec pnpm --filter "$PNPM_FILTER" dev
fi

# Non-watch: compile once, and rebuild when package/shared TypeScript changed.
echo "[nest-workload] ${COMPOSE_SVC}: NON-WATCH → nest build (if needed) + node dist"
export NODE_OPTIONS="${NODE_OPTIONS_NONWATCH:-${NODE_OPTIONS:---max-old-space-size=768}}"

pnpm --filter "$PNPM_FILTER" exec sh -c \
  'if [ -f dist/main.js ]; then
     if find src /app/libs -type f \( -name "*.ts" -o -name "package.json" \) -newer dist/main.js 2>/dev/null | head -1 | grep -q .; then
       echo "[nest-workload] package/shared sources changed — rebuilding dist"
       rm -rf dist && nest build
     else
       echo "[nest-workload] dist/main.js is current — skip build"
     fi
   else
     echo "[nest-workload] dist/main.js missing — building"
     nest build
   fi'

export NODE_OPTIONS="${NODE_OPTIONS_RUNTIME:---max-old-space-size=512}"

case "$KIND" in
  gateway)
    exec pnpm --filter "$PNPM_FILTER" start
    ;;
  service|worker)
    exec pnpm --filter "$PNPM_FILTER" start:prod
    ;;
  *)
    echo "ERROR: unknown kind='$KIND'" >&2
    exit 1
    ;;
esac
