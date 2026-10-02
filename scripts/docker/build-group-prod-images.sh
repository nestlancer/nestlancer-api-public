#!/usr/bin/env bash
# Build one production image group or checkpoint.
#
# Usage:
#   ./scripts/docker/build-group-prod-images.sh gateways
#   ./scripts/docker/build-group-prod-images.sh services
#   ./scripts/docker/build-group-prod-images.sh workers
#   ./scripts/docker/build-group-prod-images.sh monorepo-builder
#   ./scripts/docker/build-group-prod-images.sh checkpoints
#   ./scripts/docker/build-group-prod-images.sh all-runtime

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/docker/_build-common.sh
source "$ROOT/scripts/docker/_build-common.sh"

REGISTRY="${NESTLANCER_IMAGE_REGISTRY:-ghcr.io/nestlancer}"
TAG="${NESTLANCER_IMAGE_TAG:-latest}"

group="${1:-}"
if [ -z "$group" ]; then
  echo "Usage: $0 gateways|services|workers|monorepo-builder|monorepo-deps|monorepo-compile|checkpoints|all-runtime" >&2
  exit 1
fi

case "$group" in
  monorepo-builder | monorepo-deps | monorepo-compile | checkpoints)
    echo "==> Checkpoint bake: ${group}"
    NESTLANCER_CACHE_EXPORT=1 bake_monorepo_checkpoint "$group"
    ;;
  gateways | services | workers)
    echo "==> Building group: ${group}"
    NESTLANCER_BUILD_TARGETS="$(resolve_group_deploy_targets "$group")" \
    NESTLANCER_CACHE_EXPORT="${NESTLANCER_CACHE_EXPORT:-0}" \
      bake_runtime_targets "$group"
    ;;
  all-runtime)
    echo "==> Building group: ${group}"
    NESTLANCER_CACHE_EXPORT="${NESTLANCER_CACHE_EXPORT:-0}" bake_runtime_targets "$group"
    ;;
  *)
    echo "Unknown group: ${group}" >&2
    exit 1
    ;;
esac

echo "Done: ${group} (tag ${TAG})"
