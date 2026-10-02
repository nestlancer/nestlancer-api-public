# Backend Production Deployment Guide

Step-by-step guide for deploying **nestlancer-backend-api** to **production**.

Repo: `nestlancer/nestlancer-backend-api`  
Compose file: `docker-compose.prod.yml`  
Infisical env slug: **`prod`** (not `production`)  
Images: **GHCR** (`ghcr.io/nestlancer/<service>:<tag>`)

---

## Current status (as of Aug 2026)

| Item | Status |
|------|--------|
| GitHub `PRODUCTION_VPS_*` secrets | **Configured** (no fallback to `VPS_*`) |
| `INFISICAL_PROJECT_ID` | **Set** |
| Variable `NESTLANCER_DEPLOY_MODE` | `compose` |
| Prod clone on VPS | `/root/nestlancer-backend-api-prod` — **exists** |
| SSH user | `root` @ `217.216.59.29` |
| Production CD ever run | **Not yet** — needs first `v*.*.*` tag or manual workflow |
| Same VPS as development | Yes — isolated by path / ports / container names |

---

## What gets deployed

| Item | Value |
|------|--------|
| Stack | 28 pre-built containers (gateway, services, workers, promtail) |
| Public URL | `https://api.nestlancer.com` |
| VPS IP | `217.216.59.29` |
| Deploy path (secret) | `/root/nestlancer-backend-api-prod` |
| Gateway host port | `4000` (mapped to container port 3000) |
| WS gateway host port | `4100` (mapped to container port 3100) |
| Container name prefix | `nl-prod-*` (e.g. `nl-prod-gateway`, `nl-prod-auth`) |
| Metrics ports | `23000`, `24xxx`, `25xxx` (offset from dev by +10000) |
| Docker network | `nestlancer-prod` |
| Origin proxy | Caddy (`docker-compose.prod.proxy.yml`) on ports 80/443 |

**Same-VPS coexistence:** Prod uses separate deploy path, container names, ports, and Docker network from dev. Both stacks can run simultaneously without conflicts.

---

## How CI/CD works (production flow)

```
Push tag v1.2.3  (or Run workflow manually)
    → Build Production Images (on GitHub runners → push to GHCR)
    → Backend CD (Production) SSH to VPS
    → git pull → Infisical prod export → migrate → docker pull → compose up → smoke test
```

| Workflow file | Name | When it runs |
|---------------|------|--------------|
| `.github/workflows/build-images.yml` | Build Production Images | Tag `v*.*.*`, release, or manual |
| `.github/workflows/cd-production.yml` | Backend CD (Production) | Tag `v*.*.*` or manual |

**Important:** Production images are built on **GitHub**, not on the VPS. The VPS only **pulls** from GHCR.

**Important:** Pushing to `main` does **not** deploy production. Only tags / manual production workflow do.

---

## How production images are built

All 28 runtime images share one Dockerfile (`docker/prod-monorepo/Dockerfile`) and Bake file (`docker/prod-monorepo/docker-bake.hcl`).

| Step | What happens |
|------|----------------|
| 1. Checkpoint | `monorepo-builder` — install once, `pnpm build` once, **selective** `pnpm deploy` into `/deploy/<slug>/` (only missing runtime deps for bundled `@nestlancer/*`; no full `.pnpm` store merge). Optional durable BuildKit cache export. |
| 2. Gateways | `gateway`, `ws-gateway` |
| 3. Services | 16 microservices |
| 4. Workers | 10 workers |

**CI** (`.github/workflows/build-images.yml`) runs the same phases with GHA cache (`mode=max`) and `--push` to GHCR.

**Local / VPS fallback** uses the scripts below. Builds show a live **progress bar + elapsed timer + ETA** (disable with `NESTLANCER_PROGRESS=0`). Timings are learned in `.cache/docker-build-timings.env`. Bake always pins `--builder nestlancer` so backend/frontend can build in parallel without fighting over the active builder.

```bash
# All images (phased — recommended)
pnpm docker:prod:build
# same as: ./scripts/docker/build-all-prod-images.sh

# One group
./scripts/docker/build-group-prod-images.sh gateways   # or services | workers | monorepo-builder

# One image (fastest iteration after cache is warm)
pnpm docker:prod:build:one service auth
# same as: ./scripts/docker/build-prod-image.sh service auth
./scripts/docker/build-prod-image.sh gateway
./scripts/docker/build-prod-image.sh worker email-worker
# Optional: also write local durable cache (slow): NESTLANCER_CACHE_EXPORT=1 pnpm docker:prod:build:one …

# Only packages changed since base (turbo) — prefer this for day-to-day work
pnpm docker:prod:build:affected
# NESTLANCER_AFFECTED_BASE=origin/main pnpm docker:prod:build:affected

# One-shot bake (no phases; still uses durable cache)
NESTLANCER_BUILD_PHASED=0 pnpm docker:prod:build
```

**Interrupt / resume:** re-run the same command. Finished layers reload from the buildx builder (and `.cache/docker-buildkit` when exported) — you do not start from zero.

**Do not wipe BuildKit cache** between iterations (`docker builder prune`, deleting `.cache/docker-buildkit`, or `--no-cache`). That turns a warm rebuild into a full cold path (often **45–70+ min**). Safe cleanup is dangling images/containers only — see below.

### Build env knobs

| Variable | Default | Purpose |
|----------|---------|---------|
| `NESTLANCER_CACHE_EXPORT` | `1` on full/checkpoint; `0` on `build:one` | Write local `type=local,mode=max` cache (slow). One-image builds skip this by default. |
| `NESTLANCER_BUILD_TARGET` / `NESTLANCER_BUILD_TARGETS` | unset / from script | Limit `pnpm deploy` to one or many slugs |
| `NESTLANCER_DEPLOY_FULL_STORE_MERGE` | `0` | Escape hatch: old full `.pnpm` store merge (very slow) |
| `NESTLANCER_DEPLOY_PARALLEL` | `6` | Parallel `pnpm deploy` workers |
| `NESTLANCER_PROGRESS` | `1` | Live progress bar + ETA |
| `NESTLANCER_AFFECTED_BASE` | `origin/main` | Base ref for `build:affected` |
| `PUPPETEER_SKIP_DOWNLOAD` | `true` in build | Skip Chromium download in monorepo build (PDF images still get Chromium in `runtime-chromium`) |

### Expected timings (realistic)

| Scenario | Typical wall time |
|----------|-------------------|
| Cold full bake (empty durable cache) | **45–70 min** (install + turbo + 28× deploy) |
| Warm full phased rebuild (no source change) | **5–15 min** |
| `build:one` cold (empty builder cache) | **~15–20 min** (full monorepo compile + 1 deploy) |
| `build:one` warm (builder cache hit) | **~1 min** (measured quotes: **51s**) |
| Deploy stage alone (selective merge, 1 slug) | **~2–3 min** (was tens of minutes with full store merge) |

Measured local (2026-09-19): `quotes` cold ~17m to load; `quotes` warm **51s**; `gateway` image size **922MB** (was ~1.3GB).

### Safe local Docker cleanup (keeps build cache)

```bash
# Stop leftover build containers / dangling layers — KEEP .cache/docker-buildkit
docker container prune -f
docker image prune -f
# Optional: remove untagged nestlancer images only
docker images 'ghcr.io/nestlancer/*' --format '{{.ID}} {{.Repository}}:{{.Tag}}' | awk '$2 ~ /:<none>/ {print $1}' | xargs -r docker rmi

# Do NOT run unless you intentionally want a cold rebuild:
# docker builder prune -af
# rm -rf .cache/docker-buildkit
```

Implementation: `scripts/docker/_build-common.sh`, `scripts/docker/_progress.sh`, `docker/prod-monorepo/Dockerfile`, `docker/prod-monorepo/deploy-all.sh`.

---

## One-time setup

### 1. VPS preparation

Same base tools as dev (Docker, Node 20, pnpm, Infisical CLI). See backend dev guide.

Prod clone is already present:

```bash
ssh root@217.216.59.29
cd /root/nestlancer-backend-api-prod
```

If you ever need to recreate it:

```bash
git clone git@github.com:nestlancer/nestlancer-backend-api.git /root/nestlancer-backend-api-prod
```

**Important:** Do **NOT** reuse the dev path (`/root/workspace/nestlancer-backend-api`). Prod must stay separate.

### 2. Infisical (production secrets)

| Item | Value |
|------|--------|
| Project ID | `98daa987-551b-44b5-9329-09a109dcfeb7` |
| Prod env slug | **`prod`** |
| Machine identity | Must have **`prod`** read access |

Test export:

```bash
cd /root/nestlancer-backend-api-prod
infisical export --env=prod --format=dotenv \
  --projectId=98daa987-551b-44b5-9329-09a109dcfeb7 > .env.infisical
chmod 600 .env.infisical
```

**Note:** `--env=production` returns 404. Always use **`prod`**.

Key prod vars to verify in Infisical:

- `DATABASE_URL`, `MIGRATION_DATABASE_URL`
- `REDIS_URL`, `RABBITMQ_URL`
- `CORS_ORIGINS` — must include `https://app.nestlancer.com`, `https://admin.nestlancer.com`, `https://landing.nestlancer.com`, `https://nestlancer.com`, `https://www.nestlancer.com`
- `FRONTEND_URL` — `https://app.nestlancer.com`

### 3. GitHub Secrets (production) — configured

These are **dedicated** production secrets (no fallback to `VPS_*`).

| Secret | Required | Current value / notes |
|--------|----------|------------------------|
| `PRODUCTION_VPS_HOST` | Yes | `217.216.59.29` — **set** |
| `PRODUCTION_VPS_USERNAME` | Yes | `root` — **set** |
| `PRODUCTION_VPS_PASSWORD` | Yes | SSH password — **set** |
| `PRODUCTION_VPS_DEPLOY_PATH` | Yes | `/root/nestlancer-backend-api-prod` — **set** |
| `INFISICAL_CLIENT_ID` | Yes | Machine identity — **set** |
| `INFISICAL_CLIENT_SECRET` | Yes | Machine identity — **set** |
| `INFISICAL_PROJECT_ID` | Yes | `98daa987-551b-44b5-9329-09a109dcfeb7` — **set** |

`GITHUB_TOKEN` is provided automatically for GHCR push/pull.

> Do **not** put passwords in this guide. Manage via GitHub → Settings → Secrets.

### 4. GitHub Variables

| Variable | Current | Purpose |
|----------|---------|---------|
| `NESTLANCER_DEPLOY_MODE` | `compose` | Docker Compose prod path |

### 5. GHCR package visibility

After first image push:

1. GitHub → **Packages** → each `nestlancer/*` package.
2. Ensure the repo/org can pull (private packages need login on VPS — CD handles this).

Images pushed:

- `gateway`, `ws-gateway`
- `auth`, `users`, `payments`, … (16 services)
- `analytics-worker`, … `webhook-worker` (8 workers)
- `document-worker`, `export-worker`

Tags: `1.2.3` (without `v`) and `latest`.

### 6. DNS (Cloudflare)

| Host | Points to | Cloudflare proxy |
|------|-----------|------------------|
| `api.nestlancer.com` | `217.216.59.29` | Proxied (orange cloud) |
| `app.nestlancer.com` | `217.216.59.29` | Proxied |
| `admin.nestlancer.com` | `217.216.59.29` | Proxied |
| `landing.nestlancer.com` | `217.216.59.29` | Proxied |
| `nestlancer.com` (apex) | `217.216.59.29` | Proxied — Caddy → landing |
| `www.nestlancer.com` | `217.216.59.29` | Proxied — Caddy 301 → apex |

Caddy on VPS must listen on **80 and 443** for Cloudflare to reach origin. Caddy should proxy `api.nestlancer.com` → gateway (compose network) / host `:4000`.

**Origin TLS (required for Cloudflare Full strict):** do **not** use `tls internal`. Install a Cloudflare Origin Certificate into `docker/caddy/certs/origin.{pem,key}` so resets do not burn Let's Encrypt attempts. See [`prod-origin-tls.md`](./prod-origin-tls.md) and `docker/caddy/certs/README.md`.

Optional Infisical `prod` secrets for blank VPS recovery: `CADDY_ORIGIN_CERT_B64`, `CADDY_ORIGIN_KEY_B64`.

---

## Deploy with GitHub Actions (recommended)

### Option A — Tag release (full pipeline)

```bash
# On your machine, in the repo
git checkout main
git pull
git tag v1.0.0
git push origin v1.0.0
```

This triggers:

1. **Build Production Images** → builds & pushes to `ghcr.io/nestlancer/*:1.0.0`
2. **Backend CD (Production)** → deploys to `/root/nestlancer-backend-api-prod`

### Option B — Manual workflow

1. **Actions** → **Build Production Images** → Run workflow (builds images only).
2. **Actions** → **Backend CD (Production)** → Run workflow (deploy only — needs images already in GHCR).

### What production CD does on VPS

1. `git fetch --tags` + `git pull origin main`
2. Infisical export → `.env.infisical` (env **`prod`**)
3. `scripts/db/migrate-deploy-ci.sh` — apply DB migrations
4. `docker login ghcr.io`
5. `compose pull` — pull new images from GHCR
6. `compose up -d --force-recreate` — start/restart containers with fresh Infisical env
7. `proxy-prod-up.sh` — ensure origin TLS certs + start Caddy on 80/443
8. Smoke check on gateway: `http://127.0.0.1:4000`

---

## Manual deploy on VPS

### Pull from GHCR (normal prod path)

```bash
ssh root@217.216.59.29
cd /root/nestlancer-backend-api-prod
git pull origin main

# Secrets
infisical export --env=prod --format=dotenv \
  --projectId=98daa987-551b-44b5-9329-09a109dcfeb7 > .env.infisical
chmod 600 .env.infisical

export NESTLANCER_IMAGE_REGISTRY=ghcr.io/nestlancer
export NESTLANCER_IMAGE_TAG=latest   # or 1.0.0

echo "$GHCR_PAT" | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin

pnpm docker:prod:migrate
COMPOSE_PULL=always INFISICAL_ENV=prod pnpm docker:prod:pull
COMPOSE_PULL=never INFISICAL_ENV=prod pnpm docker:prod:up
pnpm docker:prod:proxy:up
GATEWAY_URL=http://127.0.0.1:4000 pnpm docker:prod:smoke
```

### Build images locally on VPS (fallback, slow)

Only if GHCR is unavailable. Prefer CI **Build Production Images**.

```bash
cd /root/nestlancer-backend-api-prod   # or your local clone

# Phased build with progress bar + ETA (default)
pnpm docker:prod:build

# Or build one service / group while iterating
./scripts/docker/build-group-prod-images.sh gateways
./scripts/docker/build-prod-image.sh service auth

pnpm docker:prod:run      # migrate + up + caddy proxy
```

Cold first build is often **45–70 min**. Prefer `pnpm docker:prod:build:affected` or `build:one` for iteration, and **keep** `.cache/docker-buildkit`. If interrupted, re-run the same command to resume.

---

## Useful pnpm commands (production)

| Command | What it does |
|---------|--------------|
| `pnpm docker:prod:build` | Build all prod images locally (phased bake + progress/ETA; cold ~45–70 min) |
| `pnpm docker:prod:build:one` | Build one image (`service auth`, `gateway`, `worker …`; warm ~1 min) |
| `pnpm docker:prod:build:affected` | Build only turbo-affected image targets (preferred for iteration) |
| `pnpm docker:prod:pull` | Pull from GHCR |
| `pnpm docker:prod:up` | Start prod stack |
| `pnpm docker:prod:down` | Stop prod stack |
| `pnpm docker:prod:ps` | Container status |
| `pnpm docker:prod:logs` | Follow logs |
| `pnpm docker:prod:migrate` | Run Prisma migrations |
| `pnpm docker:prod:run` | Migrate + force-recreate up + Caddy proxy |
| `pnpm docker:prod:start` | Build + run (local images) |
| `pnpm docker:prod:proxy:up` | Ensure TLS certs + start Caddy for api/web/admin/landing |
| `pnpm docker:prod:reload-secrets` | Re-export Infisical `prod` + force-recreate |
| `pnpm docker:prod:certs:ensure` | Validate/materialize `docker/caddy/certs/origin.*` |
| `pnpm docker:prod:certs:install` | Install Origin / self-signed certs into project dir |
| `pnpm docker:prod:smoke` | Health check |

**Note:** `compose-prod.sh` defaults to `--pull never` on `up`. For GHCR deploy use `COMPOSE_PULL=always` before pull.

**Progress UI:** local builds print a live bar + elapsed + ETA. Disable with `NESTLANCER_PROGRESS=0`.

---

## Verify deployment

```bash
# VPS local (prod gateway runs on port 4000, not 3000)
curl -sf http://127.0.0.1:4000/api/v1/health/live
curl -sf http://127.0.0.1:4000/api/v1/health/ready

# Public (via Cloudflare → Caddy → localhost:4000)
curl -sk https://api.nestlancer.com/api/v1/health/live
curl -sk https://api.nestlancer.com/api/v1/health/ready

# Prod containers (all prefixed nl-prod-)
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep nl-prod-

# Dev containers (if also running — separate, no conflict)
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep 'nl-gateway\|nl-svc-'
```

Expected: HTTP `200`. Cloudflare **521** means origin is down (nothing on 80/443).

---

## Rollback

The rollback script resolves the GHCR image tag from the nearest `v*` git tag (`git describe --tags`). Tags are fetched during deploy and rollback.

```bash
cd /root/nestlancer-backend-api-prod
COMPOSE_FILE=docker-compose.prod.yml ./scripts/deploy/rollback.sh <commit-sha>
```

Manual rollback:

```bash
cd /root/nestlancer-backend-api-prod
PREV=$(cat .deploy-previous-sha)
git reset --hard "$PREV"

export NESTLANCER_IMAGE_TAG=previous-version   # use known good tag
COMPOSE_PULL=always INFISICAL_ENV=prod pnpm docker:prod:pull
COMPOSE_PULL=never INFISICAL_ENV=prod pnpm docker:prod:up
```

---

## Common problems

| Problem | Fix |
|---------|-----|
| GHCR `denied` on pull | Run `docker login ghcr.io` on VPS; check package permissions |
| `production` env 404 in Infisical | Use slug **`prod`** |
| CORS errors in browser | Update `CORS_ORIGINS` in Infisical prod |
| Migrations fail | Check `MIGRATION_DATABASE_URL`; never run `migrate dev` on prod |
| Cloudflare 521 | Start Caddy proxy: `pnpm docker:prod:proxy:up`; check `ss -tlnp \| grep ':443 '` |
| Cloudflare **526** | Origin cert invalid for Full (strict). Install Cloudflare Origin Certificate into `docker/caddy/certs/` — see [`prod-origin-tls.md`](./prod-origin-tls.md). Do **not** use `tls internal`. |
| Razorpay webhook still old secret | `INFISICAL_ENV=prod pnpm docker:prod:reload-secrets` (export + force-recreate) |
| LE rate limit / cert issuance blocked | Reuse saved `docker/caddy/certs/origin.*` — never wipe and re-ACME during testing |
| Build images workflow fails | Check Actions logs; ensure `packages: write` permission |
| CI/CD not running | Prod deploy needs **tag** `v*.*.*` or manual workflow dispatch |
| Accidentally expected prod on `main` push | Only **Dev** CD runs on `main`; prod needs a tag |

---

## Production release checklist

- [ ] All changes merged to `main`
- [ ] Backend CI green on `main`
- [ ] Infisical **`prod`** updated (new env vars, URLs, keys)
- [ ] DB migrations reviewed and tested on dev
- [x] GitHub prod secrets set (`PRODUCTION_VPS_*`, Infisical)
- [x] Prod clone exists at `/root/nestlancer-backend-api-prod`
- [ ] Create and push tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
- [ ] Watch **Build Production Images** then **Backend CD (Production)**
- [ ] Verify `https://api.nestlancer.com/api/v1/health/live`
- [ ] Deploy frontend prod (separate repo) if API contract changed

---

## Related docs (in repo)

- `docs/guides/dev-deployment.md` — development (same VPS)
- `docs/guides/production-vps-deploy.md`
- `docs/guides/prod-origin-tls.md` — Cloudflare 526 / persisted origin certs
- `docs/guides/infisical.md`
- `docs/runbooks/deployment-checklist.md`
- `docker/prod-monorepo/Dockerfile` — shared monorepo prod image stages
- `docker/prod-monorepo/docker-bake.hcl` — bake targets / groups
- `scripts/docker/build-all-prod-images.sh` — phased local/CI-style full build
- `scripts/docker/_progress.sh` — live progress bar + ETA
