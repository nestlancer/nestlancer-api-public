#!/usr/bin/env bash
# Validate all Kustomize overlays compile (no cluster required).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "ERROR: kubectl is required (install kubectl or k3d)" >&2
  exit 1
fi

node scripts/deploy/generate-k3s-manifests.mjs

OVERLAYS_DIR="$ROOT/deploy/k3s/overlays"
for overlay in "$OVERLAYS_DIR"/*/; do
  name="$(basename "$overlay")"
  echo "kustomize build: overlays/${name}"
  kubectl kustomize "$overlay" >/dev/null
done

echo "All backend K3s overlays validated."
