#!/usr/bin/env bash
# Resolve Docker image targets affected by git changes (for partial prod builds).
#
# Usage:
#   eval "$(./scripts/docker/resolve-affected-targets.sh)"
#   NESTLANCER_AFFECTED_BASE=origin/main ./scripts/docker/resolve-affected-targets.sh
#
# Exports:
#   NESTLANCER_AFFECTED_TARGETS  — comma-separated bake slugs (auth,users,gateway,...)
#   NESTLANCER_AFFECTED_FILTERS  — comma-separated turbo filters (./services/auth...,...)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

AFFECTED_BASE="${NESTLANCER_AFFECTED_BASE:-origin/main}"

package_to_slug() {
  local pkg="$1"
  case "$pkg" in
    @nestlancer/gateway) echo gateway ;;
    @nestlancer/ws-gateway) echo ws-gateway ;;
    @nestlancer/*-service)
      local name="${pkg#@nestlancer/}"
      echo "${name%-service}"
      ;;
    @nestlancer/document-worker | @nestlancer/export-worker | @nestlancer/outbox-poller | @nestlancer/*-worker)
      echo "${pkg#@nestlancer/}"
      ;;
    *)
      return 1
      ;;
  esac
}

slug_to_filter() {
  local slug="$1"
  case "$slug" in
    gateway | ws-gateway) echo "./${slug}..." ;;
    document-worker | export-worker | outbox-poller | *-worker) echo "./workers/${slug}..." ;;
    *) echo "./services/${slug}..." ;;
  esac
}

if ! git rev-parse --verify "${AFFECTED_BASE}" >/dev/null 2>&1; then
  echo "# WARN: ${AFFECTED_BASE} not found; falling back to HEAD~1" >&2
  AFFECTED_BASE="HEAD~1"
fi

json="$(pnpm turbo run build --dry-run=json --filter="...[${AFFECTED_BASE}]" 2>/dev/null || echo '{}')"

mapfile -t packages < <(echo "$json" | jq -r '.tasks[]? | select(.task == "build") | .package' | sort -u)

targets=()
filters=()

for pkg in "${packages[@]}"; do
  [ -z "$pkg" ] && continue
  slug="$(package_to_slug "$pkg" || true)"
  [ -z "${slug:-}" ] && continue
  targets+=("$slug")
  filters+=("$(slug_to_filter "$slug")")
done

join_by_comma() {
  local IFS=,
  echo "$*"
}

export NESTLANCER_AFFECTED_TARGETS="$(join_by_comma "${targets[@]+"${targets[@]}"}")"
export NESTLANCER_AFFECTED_FILTERS="$(join_by_comma "${filters[@]+"${filters[@]}"}")"

printf 'export NESTLANCER_AFFECTED_TARGETS=%q\n' "$NESTLANCER_AFFECTED_TARGETS"
printf 'export NESTLANCER_AFFECTED_FILTERS=%q\n' "$NESTLANCER_AFFECTED_FILTERS"

if [ "${NESTLANCER_AFFECTED_VERBOSE:-}" = "1" ]; then
  echo "# affected base: ${AFFECTED_BASE}" >&2
  echo "# runtime targets: ${NESTLANCER_AFFECTED_TARGETS:-<none>}" >&2
fi
