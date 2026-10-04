<div align="center">

# Deployment

### Overview and entry point. This repo has three deployment paths — pick the one matching your target.

</div>

| Path | When to use it | Doc |
| :-- | :-- | :-- |
| **Dev (Dockerized, watch mode)** | Day-to-day development, same VPS as prod but a different Compose file/path | [deployment-dev.md](deployment-dev.md) |
| **Production (Compose)** | The default production path — GHCR-built images, Infisical secrets, `docker-compose.prod*.yml` | [deployment-prod-compose.md](deployment-prod-compose.md) |
| **Production (K3s + Traefik)** | Kubernetes alternative to the Compose production path | [k3s-traefik.md](k3s-traefik.md) and [`deploy/README.md`](../../deploy/README.md) |

Underlying VPS setup notes shared by the dev and Compose-production paths (same physical VPS, RAM
and Docker tuning) live in [deployment-prod-vps.md](deployment-prod-vps.md).

## Supporting topics

- [Nginx](nginx.md) — legacy host-level Nginx reference for the Compose-only production fallback;
  the default dev path uses Caddy (`docker-compose.local.yml`) instead.
- [Production origin TLS](prod-origin-tls.md) — Cloudflare origin certs and persistence across deploys.
- [Secrets (Infisical)](secrets-infisical.md) — how every environment gets its secrets.
- [Database](database.md) — migrations, read/write split, failover (see also
  [runbooks/database-failover.md](runbooks/database-failover.md)).
- [Monitoring](monitoring.md) — metrics, logs, tracing on the deployed stack.
- [S3 storage setup](s3-storage-setup.md), [Zoho Mail guide](zohomail-guide.md),
  [Payment upgrade deployment](payment-upgrade-deployment.md) — deployment steps for specific
  integrations.

Before any production deploy, work through
[runbooks/deployment-checklist.md](runbooks/deployment-checklist.md).

For the exact `pnpm docker:*` / `make docker-*` commands these guides use, see
[`docs/reference/commands.md`](../reference/commands.md).
