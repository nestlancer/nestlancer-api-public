# Backend Dev Deployment Guide

Step-by-step guide for deploying **nestlancer-backend-api** to the **development** stack on the VPS.

Repo: `nestlancer/nestlancer-backend-api`  
Compose file: `docker-compose.dev.yml`  
Infisical env slug: **`dev`** (not `development`)

---

## Current status (as of Aug 2026)

| Item | Status |
|------|--------|
| Backend CI on `main` | Working (green) |
| Backend CD (Dev) after CI | Working (auto-deploys) |
| GitHub Secrets (`VPS_*`, Infisical) | Configured |
| Variable `NESTLANCER_DEPLOY_MODE` | `compose` |
| SSH user | `root` |
| Same VPS as production | Yes (`217.216.59.29`) — separate path/ports/containers |

---

## What gets deployed

| Item | Value |
|------|--------|
| Stack | Gateway, ws-gateway, 16 microservices, 10 workers, Caddy proxy |
| Public URL | `https://dev-api.nestlancer.com` |
| VPS IP | `217.216.59.29` |
| Default / secret deploy path | `/root/workspace/nestlancer-backend-api` (via `VPS_DEPLOY_PATH`) |
| Gateway host port | `3000` |
| WS gateway host port | `3100` |
| Container name prefix | `nl-*` (e.g. `nl-gateway`, `nl-svc-auth`) |
| Docker network | `nestlancer-dev` |

**Same-VPS coexistence:** Dev and prod use separate deploy paths, container names, ports, and Docker networks. Prod runs on port **4000** with `nl-prod-*` containers in `/root/nestlancer-backend-api-prod`. Both stacks can run simultaneously without conflicts.

---

## How CI/CD works (simple flow)

```
Push to main
    → Backend CI runs (lint, test, build)
    → If CI passes → Backend CD (Dev) runs automatically
    → GitHub SSH to VPS → git pull → Infisical export → migrate → docker compose up
```

| Workflow file | Name | When it runs |
|---------------|------|--------------|
| `.github/workflows/ci.yml` | Backend CI | Every push/PR to `main` |
| `.github/workflows/cd.yml` | Backend CD (Dev) | After CI succeeds on `main`, or manual dispatch |

**Note:** Dev CD does **NOT** trigger on version tags (`v*.*.*`). Tags only trigger **production** CD.

---

## One-time setup

### 1. Clone repo on the VPS

Already in use on this VPS:

```bash
ssh root@217.216.59.29
# Live path used by Dev CD (matches VPS_DEPLOY_PATH):
cd /root/workspace/nestlancer-backend-api
```

If you ever need a fresh clone:

```bash
git clone git@github.com:nestlancer/nestlancer-backend-api.git /root/workspace/nestlancer-backend-api
```

### 2. Install tools on VPS

```bash
# Docker
curl -fsSL https://get.docker.com | sh

# Node 20 (for scripts / Prisma on host if needed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# pnpm
corepack enable && corepack prepare pnpm@9.15.9 --activate

# Infisical CLI
curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | sudo -E bash
apt-get update && apt-get install -y infisical
```

### 3. Infisical (secrets)

| Item | Value |
|------|--------|
| Project | `nestlancer-backend` |
| Project ID | `98daa987-551b-44b5-9329-09a109dcfeb7` (in `.infisical.json`) |
| Dev env slug | `dev` |
| Machine identity | `github-actions-nestlancer-backend-dev` |

In Infisical UI:

1. Create machine identity for GitHub Actions.
2. Give it **read** access to environment **`dev`**.
3. Copy **Client ID** and **Client Secret** (secret is shown once).

Test export on VPS:

```bash
cd /root/workspace/nestlancer-backend-api
infisical login
infisical export --env=dev --format=dotenv --projectId=98daa987-551b-44b5-9329-09a109dcfeb7 > .env.infisical
chmod 600 .env.infisical
```

### 4. GitHub Secrets (configured)

Repo → Settings → Secrets and variables → Actions.

| Secret | Required | Current value / notes |
|--------|----------|------------------------|
| `VPS_HOST` | Yes | `217.216.59.29` — **set** |
| `VPS_USERNAME` | Yes | `root` — **set** |
| `VPS_PASSWORD` | Yes | SSH password — **set** |
| `INFISICAL_CLIENT_ID` | Yes | Machine identity — **set** |
| `INFISICAL_CLIENT_SECRET` | Yes | Machine identity — **set** |
| `VPS_DEPLOY_PATH` | Yes (recommended) | `/root/workspace/nestlancer-backend-api` — **set** |
| `INFISICAL_PROJECT_ID` | Optional | `98daa987-551b-44b5-9329-09a109dcfeb7` — **set** |

> Do **not** put passwords in this guide. Rotate via GitHub Secrets if compromised.

### 5. GitHub Variables

| Variable | Current | Purpose |
|----------|---------|---------|
| `NESTLANCER_DEPLOY_MODE` | `compose` | Docker Compose path (not k3s) |
| `NESTLANCER_COMPOSE_PROFILES` | empty | Set to `workers` to include workers after core is stable |

### 6. DNS (Cloudflare)

Ensure these point to `217.216.59.29`:

- `dev-api.nestlancer.com` (DNS only / grey cloud for dev is OK)

Backend Caddy (`nl-dev-proxy`) routes HTTPS for dev subdomains when `docker-compose.local.yml` proxy is enabled.

---

## Deploy with GitHub Actions (recommended)

### Automatic deploy (after merge to main)

1. Open a PR → **Backend CI** must pass.
2. Merge to `main`.
3. **Backend CI** runs again on `main`.
4. If green → **Backend CD (Dev)** starts automatically.
5. Watch: GitHub → Actions → **Backend CD (Dev)**.

### Manual deploy (without waiting for CI)

1. Go to **Actions** → **Backend CD (Dev)**.
2. Click **Run workflow** → branch `main` → **Run workflow**.

### What CD does on the VPS (in order)

1. Ensure deploy path exists (clone if missing)
2. `git pull origin main`
3. Login to Infisical → export `dev` → `.env.infisical`
4. Run DB migrations: `scripts/db/migrate-deploy-ci.sh`
5. Bring up stack via compose (non-watch boot for smoke reliability)
6. Smoke check: `scripts/deploy/smoke-health.sh` on `http://127.0.0.1:3000`

If anything fails, CD rolls back to the previous git commit.

---

## Manual deploy on VPS (no GitHub)

Use this when debugging or GitHub Actions is down.

```bash
ssh root@217.216.59.29
cd /root/workspace/nestlancer-backend-api

git pull origin main

# Export secrets (or copy existing .env.infisical)
infisical export --env=dev --format=dotenv \
  --projectId=98daa987-551b-44b5-9329-09a109dcfeb7 > .env.infisical
chmod 600 .env.infisical

# Migrate + start
pnpm db:migrate:deploy          # or: ./scripts/db/migrate-deploy-ci.sh
pnpm docker:build                 # build dev images
pnpm docker:up                    # start core stack
# optional workers:
pnpm docker:up:workers
# or full:
pnpm docker:up:full

# Verify
pnpm docker:verify:dev-host
GATEWAY_URL=http://127.0.0.1:3000 ./scripts/deploy/smoke-health.sh
curl -sk https://dev-api.nestlancer.com/api/v1/health/live
```

### Useful pnpm commands (dev)

| Command | What it does |
|---------|--------------|
| `pnpm docker:start` | Build + up (core) |
| `pnpm docker:up` | Start core stack |
| `pnpm docker:up:workers` | Start workers only |
| `pnpm docker:up:full` | Core + workers |
| `pnpm docker:down` | Stop everything |
| `pnpm docker:ps` | List containers |
| `pnpm docker:logs` | Follow all logs |
| `pnpm docker:logs:gateway` | Gateway logs only |
| `pnpm docker:verify:dev-host` | Check dev HTTPS URLs |

---

## Verify deployment

```bash
# On VPS
docker ps
curl -sf http://127.0.0.1:3000/api/v1/health/live

# From your laptop
curl -sk https://dev-api.nestlancer.com/api/v1/health/live
curl -sk https://dev-api.nestlancer.com/api/v1/health/ready
```

Expected: HTTP `200` and JSON health response.

---

## Rollback

### Automatic (CD failure)

CD saves `.deploy-previous-sha` and runs `git reset --hard` + `docker compose up` on failure.

### Manual rollback

```bash
cd /root/workspace/nestlancer-backend-api
PREV=$(cat .deploy-previous-sha)
git reset --hard "$PREV"
docker compose -f docker-compose.dev.yml up -d
```

Or use the rollback script:

```bash
./scripts/deploy/rollback.sh <commit-sha>
```

---

## Common problems

| Problem | Fix |
|---------|-----|
| CD skipped after CI | CI failed — fix lint/tests first |
| `infisical CLI not installed` | Install Infisical on VPS (see above) |
| `INFISICAL_PROJECT_ID` error | Secret is set; also ensure `.infisical.json` exists on VPS |
| Migrations fail | Check `MIGRATION_DATABASE_URL` in Infisical `dev` |
| 521 on dev-api | Caddy not running or nothing on port 80/443 — run `docker ps`, check `nl-dev-proxy` |
| SSH locked / VPS slow | Use `pnpm docker:up` (not `full`) first; see `docs/guides/production-vps-deploy.md` |
| CI fails on `format:check` | Run `pnpm format` locally and commit |

---

## Checklist before you merge to main

- [ ] `pnpm lint` passes locally
- [ ] `pnpm format:check` passes
- [ ] `pnpm build` passes
- [ ] `pnpm test:unit` passes
- [ ] DB migrations reviewed (if schema changed)
- [ ] Infisical `dev` updated with any new env vars
- [x] GitHub secrets are set on the repo

---

## Related docs (in repo)

- `docs/guides/prod-deployment.md` — production (same VPS, different path)
- `docs/guides/infisical.md` — Infisical setup
- `docs/guides/local-development.md` — Local dev
- `docs/guides/production-vps-deploy.md` — VPS RAM / Docker tips
- `docs/runbooks/deployment-checklist.md` — Pre-deploy checklist
