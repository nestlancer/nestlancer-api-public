<div align="center">

# Nestlancer deployment (K3s + Terraform)

</div>

---

## 📖 Table of Contents

- [Layout](#layout)
- [Quick paths](#quick-paths)
- [K3s vs “full” Kubernetes](#k3s-vs-full-kubernetes)
- [Docs](#docs)

---

## Layout

```
deploy/
├── README.md                 # this file
├── terraform/                # VPS + K3s install (see terraform/README.md)
│   ├── modules/vps-k3s/      # SSH: install K3s, write kubeconfig
│   └── environments/
│       ├── production/
│       └── staging/
└── k3s/                      # Kubernetes manifests (K3s-compatible)
    ├── base/                 # namespace, gateway, ingress (Traefik)
    └── overlays/
        ├── production/
        └── staging/
```

---

## Container registry (GHCR)

All production images use **GitHub Container Registry** (`ghcr.io`) — zero cost, no Docker Hub subscription.

| Surface | Registry config |
| :--- | :--- |
| Compose prod | `NESTLANCER_IMAGE_REGISTRY` / `NESTLANCER_IMAGE_TAG` in `.env.production` |
| CI build | `.github/workflows/build-images.yml` → `ghcr.io/<owner>/<image-id>` |
| K3s | Base manifests from `pnpm k3s:generate`; overlays remap org via `k8sImageRegistryOverride` in `scripts/docker/workloads.manifest.json` |

K3s clusters need `ghcr-credentials` (see `k3s/base/ghcr-pull-secret.example.yaml`) before workloads can pull private images.

## Quick paths

| Environment | Method | When to use |
| :--- | :--- | :--- |
| **Dev** | Docker Compose on VPS | Current `cd.yml` + `docker-compose.dev.yml` |
| **Production** | Compose prod images | Pull/build GHCR images + `INFISICAL_ENV=production pnpm docker:prod:up` |
| **Staging / Prod** | K3s on VPS | `pnpm k3s:generate` then `kubectl apply -k deploy/k3s/overlays/production` |

---

## K3s vs “full” Kubernetes

- Same workload YAML (`Deployment`, `Service`, `Ingress`).
- K3s ships **Traefik** as the default ingress controller (see `k3s/base/ingress.yaml`).
- No cloud-specific CRDs required; single-node or small HA clusters on VPS are supported.

---

## Docs

- [Terraform + K3s install](terraform/README.md)
- [Production VPS (Compose fallback)](../docs/operations/deployment-prod-vps.md)
- [Prisma migrations](../prisma/README.md)