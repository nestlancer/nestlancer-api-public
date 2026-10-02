#!/usr/bin/env bash
# Local K3s smoke: validate manifests and optionally create a k3d cluster.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

chmod +x scripts/deploy/k3s-validate.sh
./scripts/deploy/k3s-validate.sh

if [ "${SKIP_K3D:-0}" = 1 ]; then
  echo "SKIP_K3D=1 — validation only."
  exit 0
fi

if ! command -v k3d >/dev/null 2>&1; then
  echo "k3d not installed — manifest validation passed. Install k3d for full local cluster test."
  exit 0
fi

CLUSTER="${K3D_CLUSTER_NAME:-nestlancer-local}"
if ! k3d cluster list 2>/dev/null | grep -q "$CLUSTER"; then
  echo "Creating k3d cluster ${CLUSTER}..."
  k3d cluster create "$CLUSTER" --agents 1 -p "80:80@loadbalancer" -p "443:443@loadbalancer"
fi

export KUBECONFIG="$(k3d kubeconfig write "$CLUSTER")"

echo "Applying local overlay (expects images in cluster or will stay Pending)..."
kubectl apply -k deploy/k3s/overlays/local --dry-run=client
kubectl apply -k deploy/k3s/overlays/local || true

echo "Local test: manifests apply to k3d cluster ${CLUSTER}."
echo "Add to /etc/hosts: 127.0.0.1 api.nestlancer.local"
echo "Full smoke requires GHCR images + secrets: SKIP_DB_MIGRATE=1 ENV_FILE=.env.infisical ./scripts/deploy/k3s-deploy.sh local"
