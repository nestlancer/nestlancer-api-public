#!/usr/bin/env bash
# Build one production image. Usage:
#   ./scripts/docker/build-prod-image.sh gateway
#   ./scripts/docker/build-prod-image.sh service auth
#   ./scripts/docker/build-prod-image.sh worker email-worker
#   ./scripts/docker/build-prod-image.sh pdf document-worker

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/docker/_build-common.sh
source "$ROOT/scripts/docker/_build-common.sh"

REGISTRY="${NESTLANCER_IMAGE_REGISTRY:-ghcr.io/nestlancer}"
TAG="${NESTLANCER_IMAGE_TAG:-latest}"

kind="${1:-}"
name="${2:-}"

if [ -z "$kind" ]; then
  echo "Usage: $0 gateway|ws-gateway|service <name>|worker <name>|pdf <document-worker|export-worker>" >&2
  exit 1
fi

resolve_target() {
  case "$kind" in
    gateway) echo gateway ;;
    ws-gateway) echo ws-gateway ;;
    service)
      [ -n "$name" ] || { echo "service name required" >&2; exit 1; }
      echo "$name"
      ;;
    worker | pdf)
      [ -n "$name" ] || { echo "worker name required" >&2; exit 1; }
      echo "$name"
      ;;
    *)
      echo "Unknown kind: $kind" >&2
      exit 1
      ;;
  esac
}

target="$(resolve_target)"
image_ref="${REGISTRY}/${target}:${TAG}"
build_monorepo_target "$target" "$image_ref"
