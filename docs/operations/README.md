<div align="center">

# Operations

### Deploying, running, and recovering the system.

</div>

## Deployment

Start with [deployment.md](deployment.md) — overview of the three deployment paths and how they relate.

| Doc | Covers |
| :-- | :-- |
| [Dev deployment](deployment-dev.md) | Dockerized dev stack on the shared VPS (watch-mode containers) |
| [Production deployment (Compose)](deployment-prod-compose.md) | GHCR image builds + Infisical + `docker-compose.prod*.yml`, same VPS as dev, different path |
| [Production VPS deploy](deployment-prod-vps.md) | VPS-specific setup notes (RAM, Docker tuning) underlying both of the above |
| [K3s + Traefik](k3s-traefik.md) | Kubernetes alternative to the Compose-based production path (see also `deploy/k3s/`, `deploy/terraform/`) |
| [Nginx](nginx.md) | Legacy host-level Nginx reference for the Compose-only production fallback — the default dev path uses Caddy instead (see `docker-compose.local.yml`) |
| [Production origin TLS](prod-origin-tls.md) | Cloudflare origin certs, 526 errors, cert persistence across deploys |
| [Payment upgrade deployment](payment-upgrade-deployment.md) | Deploy procedure specific to the payments service's upgrade path |
| [S3 storage setup](s3-storage-setup.md) | Object storage bucket/credentials setup |
| [Zoho Mail guide](zohomail-guide.md) | Transactional email provider setup |
| [Secrets (Infisical)](secrets-infisical.md) | Where secrets live, how they're injected, env-variable-to-secret-path mapping |

## Data & infrastructure

| Doc | Covers |
| :-- | :-- |
| [Database](database.md) | Postgres topology, read/write split, migrations in production |
| [Monitoring](monitoring.md) | Metrics (Prometheus), logs (Loki/Promtail), tracing (Jaeger) — App VPS / Infra VPS topology |

## Runbooks

[`runbooks/`](runbooks/README.md) — step-by-step procedures for specific situations (incident
response, failover, queue recovery, scaling). See the index there.

---

See also: [`docs/reference/commands.md`](../reference/commands.md) for every `pnpm docker:*` /
`make docker-*` command referenced throughout this section, and
[`docs/reference/environment-variables.md`](../reference/environment-variables.md) for the
variables these guides configure.
