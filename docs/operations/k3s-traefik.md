# K3s, Traefik, and cert-manager (no nginx)

Nestlancer routes public traffic with **K3s Traefik Ingress** and **cert-manager** TLS. Domains are defined in `scripts/docker/workloads.manifest.json` → run `pnpm k3s:generate`.

## One-time VPS setup

1. Install K3s: `deploy/terraform/environments/production` or [get.k3s.io](https://get.k3s.io).
2. DNS: point `*.nestlancer.com` (or each host) to the VPS IP.
3. Install cert-manager (once per cluster):

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.4/cert-manager.yaml
kubectl apply -k deploy/k3s/base/cert-manager
```

4. GHCR pull secret + app secrets (see `scripts/deploy/k3s-deploy.sh`).

## Deploy

```bash
infisical export --env=dev --format=dotenv --projectId="$PROJECT_ID" > .env.infisical
./scripts/deploy/k3s-deploy.sh dev          # namespace nestlancer-dev
./scripts/deploy/k3s-deploy.sh production   # namespace nestlancer
```

## Local validation

```bash
pnpm k3s:generate
pnpm k3s:validate
pnpm k3s:local:test    # optional k3d cluster
```

Add to `/etc/hosts` for local overlay:

```
127.0.0.1 api.nestlancer.local
```

## Compose fallback

Set GitHub variable `NESTLANCER_DEPLOY_MODE=compose` to use legacy Docker Compose + nginx on the VPS.

## Deprecated

Manual nginx setup: [nginx.md](./nginx.md) (Compose-only fallback).
