#!/usr/bin/env bash
# Build all production backend images with durable cache + resumable phases.
#
# Shows live progress bar + elapsed timer + ETA (disable: NESTLANCER_PROGRESS=0).
#
# Default (phased — recommended):
#   1) monorepo-builder checkpoint → writes local BuildKit cache (mode=max)
#   2) gateways  3) services  4) workers
#   Interrupt mid-phase → re-run this script; finished layers reuse from cache.
#
# One-shot (single bake graph, still uses durable cache):
#   NESTLANCER_BUILD_PHASED=0 ./scripts/docker/build-all-prod-images.sh
#
# Push instead of local --load:
#   NESTLANCER_BAKE_OUTPUT=push ./scripts/docker/build-all-prod-images.sh
#
# Override:
#   REGISTRY=ghcr.io/nestlancer TAG=1.0.0 ./scripts/docker/build-all-prod-images.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/docker/_build-common.sh
source "$ROOT/scripts/docker/_build-common.sh"

REGISTRY="${NESTLANCER_IMAGE_REGISTRY:-ghcr.io/nestlancer}"
TAG="${NESTLANCER_IMAGE_TAG:-latest}"
PHASED="${NESTLANCER_BUILD_PHASED:-1}"

if [ "$PHASED" = "1" ]; then
  echo "==> Building all production runtime images (phased checkpoints + durable cache)..."
  bake_all_runtime_phased
else
  echo "==> Building all production runtime images (one bake graph, durable cache)..."
  bake_runtime_targets all-runtime
fi

echo "All images built with tag ${TAG}"
