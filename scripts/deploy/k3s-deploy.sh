#!/usr/bin/env bash
# Deploy backend to K3s using a kustomize overlay (dev | staging | production | local).
set -euo pipefail

ENV="${1:-dev}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

OVERLAY="$ROOT/deploy/k3s/overlays/${ENV}"
if [ ! -f "$OVERLAY/kustomization.yaml" ]; then
  echo "ERROR: unknown overlay ${ENV} (missing ${OVERLAY}/kustomization.yaml)" >&2
  exit 1
fi

node scripts/deploy/generate-k3s-manifests.mjs

NAMESPACE="$(node -p "
  const m = require('./scripts/docker/workloads.manifest.json');
  const e = m.environments['${ENV}'];
  if (!e) throw new Error('unknown env');
  e.namespace;
")"

INFISICAL_ENV="${INFISICAL_ENV:-$([ "$ENV" = production ] && echo prod || echo dev)}"
ENV_FILE="${ENV_FILE:-.env.infisical}"

if [ "${SKIP_INFISICAL_EXPORT:-0}" != 1 ] && command -v infisical >/dev/null 2>&1; then
  if [ -z "${INFISICAL_TOKEN:-}" ]; then
    if [ -n "${INFISICAL_CLIENT_ID:-}" ] && [ -n "${INFISICAL_CLIENT_SECRET:-}" ]; then
      export INFISICAL_TOKEN
      INFISICAL_TOKEN="$(infisical login \
        --method=universal-auth \
        --client-id="$INFISICAL_CLIENT_ID" \
        --client-secret="$INFISICAL_CLIENT_SECRET" \
        --silent --plain)"
    fi
  fi
  if [ -n "${INFISICAL_TOKEN:-}" ] || infisical user get >/dev/null 2>&1; then
    PROJECT_ID="${INFISICAL_PROJECT_ID:-}"
    if [ -z "$PROJECT_ID" ] && [ -f .infisical.json ]; then
      PROJECT_ID="$(node -p "JSON.parse(require('fs').readFileSync('.infisical.json','utf8')).workspaceId")"
    fi
    export_args=(export --env="$INFISICAL_ENV" --format=dotenv)
    if [ -n "${PROJECT_ID:-}" ]; then
      export_args+=(--projectId="$PROJECT_ID")
    fi
    infisical "${export_args[@]}" >"$ENV_FILE"
    bash scripts/docker/sanitize-infisical-env.sh "$ENV_FILE"
    chmod 600 "$ENV_FILE"
  fi
fi

if [ -f "$ENV_FILE" ]; then
  kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
  kubectl create secret generic nestlancer-secrets -n "$NAMESPACE" \
    --from-env-file="$ENV_FILE" \
    --dry-run=client -o yaml | kubectl apply -f -
fi

if [ -n "${NESTLANCER_IMAGE_REGISTRY:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
  kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
  kubectl create secret docker-registry ghcr-credentials -n "$NAMESPACE" \
    --docker-server=ghcr.io \
    --docker-username="${GHCR_USERNAME:-github}" \
    --docker-password="$GHCR_TOKEN" \
    --dry-run=client -o yaml | kubectl apply -f -
fi

if [ "${SKIP_DB_MIGRATE:-0}" != 1 ] && [ -f scripts/db/migrate-deploy-ci.sh ]; then
  chmod +x scripts/db/migrate-deploy-ci.sh
  ./scripts/db/migrate-deploy-ci.sh
fi

RENDERED="$(kubectl kustomize "$OVERLAY")"
if [ -n "${NESTLANCER_IMAGE_TAG:-}" ]; then
  RENDERED="$(echo "$RENDERED" | sed -E "s|(image: ghcr\\.io/[^/]+/[^:]+:)[a-zA-Z0-9._-]+|\\1${NESTLANCER_IMAGE_TAG}|g")"
fi
echo "$RENDERED" | kubectl apply -f -

for dep in gateway ws-gateway; do
  if kubectl get deployment "$dep" -n "$NAMESPACE" >/dev/null 2>&1; then
    kubectl rollout status "deployment/${dep}" -n "$NAMESPACE" --timeout=300s
  fi
done

API_HOST="$(node -p "require('./scripts/docker/workloads.manifest.json').environments['${ENV}'].apiHost")"
if [ "$ENV" = local ]; then
  export GATEWAY_URL="http://${API_HOST}"
else
  export GATEWAY_URL="https://${API_HOST}"
fi

chmod +x scripts/deploy/smoke-health.sh
./scripts/deploy/smoke-health.sh || {
  echo "WARN: smoke checks failed (cluster may still be starting or images missing)" >&2
  exit "${SMOKE_REQUIRED:-1}"
}

echo "Backend K3s deploy (${ENV}) applied to namespace ${NAMESPACE}"
