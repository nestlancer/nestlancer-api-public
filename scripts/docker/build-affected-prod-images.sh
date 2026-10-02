#!/usr/bin/env bash
# Build production images only for workloads affected since NESTLANCER_AFFECTED_BASE.
#
# Uses turbo change detection (packages + dependents), then one bake graph.
# Compile is always `pnpm build` (turbo cache skips unchanged packages).
# Deploy is limited to affected slugs.
#
# Usage:
#   ./scripts/docker/build-affected-prod-images.sh
#   NESTLANCER_AFFECTED_BASE=origin/main ./scripts/docker/build-affected-prod-images.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/docker/_build-common.sh
source "$ROOT/scripts/docker/_build-common.sh"

REGISTRY="${NESTLANCER_IMAGE_REGISTRY:-ghcr.io/nestlancer}"
TAG="${NESTLANCER_IMAGE_TAG:-latest}"

eval "$(bash "$ROOT/scripts/docker/resolve-affected-targets.sh")"

if [ -z "${NESTLANCER_AFFECTED_TARGETS:-}" ]; then
  echo "No affected production image targets (base=${NESTLANCER_AFFECTED_BASE:-origin/main})."
  exit 0
fi

echo "==> Affected runtime targets: ${NESTLANCER_AFFECTED_TARGETS}"

# shellcheck disable=SC2206
bake_targets=(${NESTLANCER_AFFECTED_TARGETS//,/ })

NESTLANCER_BUILD_TARGETS="${NESTLANCER_AFFECTED_TARGETS}" \
  bake_runtime_targets "${bake_targets[@]}"

echo "Affected production images built with tag ${TAG}"
