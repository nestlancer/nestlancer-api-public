<div align="center">

# Production deployment

</div>

---

## 📖 Table of Contents

- [Path A — K3s + Terraform](#path-a-k3s-terraform)
- [Path B — Docker Compose (dev VPS)](#path-b-docker-compose-dev-vps)
- [Rollback](#rollback)
- [Health checks](#health-checks)

---

## Path A — K3s + Traefik (recommended)

See [k3s-traefik.md](./k3s-traefik.md). CD applies `deploy/k3s/overlays/{dev,production}` via `scripts/deploy/k3s-deploy.sh` (no manual nginx).

## Path A (legacy notes) — K3s + Terraform

### 1. Install K3s on the VPS

```bash
cd deploy/terraform/environments/production
cp terraform.tfvars.example terraform.tfvars
# Edit ssh_host, ssh_private_key_path, app_domain

terraform init && terraform apply
```

### 2. Build and push images (GHCR — free with GitHub)

Images are published to **GitHub Container Registry** (`ghcr.io`), not Docker Hub. On release tags, `.github/workflows/build-images.yml` pushes `ghcr.io/<github-org>/<service-id>:<tag>`.

Manual push (example for gateway):

```bash
echo "$GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin
export NESTLANCER_IMAGE_REGISTRY=ghcr.io/your-org
export NESTLANCER_IMAGE_TAG=latest
pnpm docker:prod:build:one gateway   # or: ./scripts/docker/build-prod-image.sh gateway
# Prefer build:one / build:affected while iterating — full bake is cold 45–70 min
# Or all: pnpm docker:prod:build
docker push "${NESTLANCER_IMAGE_REGISTRY}/gateway:${NESTLANCER_IMAGE_TAG}"
```

Keep `.cache/docker-buildkit` and the `nestlancer` buildx builder between runs. See [prod-deployment.md](./prod-deployment.md) for timings and safe cleanup.

Set `k8sImageRegistryOverride` in `scripts/docker/workloads.manifest.json` to your org, run `pnpm k3s:generate`, then adjust `newTag` in `deploy/k3s/overlays/production/kustomization.yaml` if needed.

Create a cluster pull secret (private packages):

```bash
kubectl create secret docker-registry ghcr-credentials -n nestlancer \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USER \
  --docker-password=ghp_xxx
```

### 3. Secrets

Export Infisical production env and create the cluster secret:

```bash
infisical export --env=production --format=dotenv --projectId="$PROJECT_ID" > .env.production
kubectl create namespace nestlancer --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic nestlancer-secrets -n nestlancer \
  --from-env-file=.env.production --dry-run=client -o yaml | kubectl apply -f -
```

### 4. Apply manifests

```bash
export KUBECONFIG=~/.kube/nestlancer-production.yaml
kubectl apply -k deploy/k3s/overlays/production
```

### 5. Migrations

Run once per release (Job or SSH):

```bash
./scripts/db/migrate-deploy-ci.sh
```

---

## Path B — Docker Compose production (recommended for single VPS)

Used by `.github/workflows/cd-production.yml` on version tags:

1. **Build images on GitHub** via `build-images.yml` (phased bake: checkpoint → gateways → services → workers), **or** locally: `pnpm docker:prod:build`
2. Infisical env slug **`prod`** → `.env.infisical` via `scripts/docker/compose-prod.sh`
3. `./scripts/db/migrate-deploy-ci.sh` → `pnpm docker:prod:up` (gateway host port **4000** in current prod compose)
4. Smoke: `GATEWAY_URL=http://127.0.0.1:4000 ./scripts/deploy/smoke-health.sh`

Local image build helpers (progress bar + ETA). Prefer **one / affected** over full bake for iteration — and **do not** wipe BuildKit cache:

```bash
pnpm docker:prod:build:one service auth                   # one image (fastest warm path)
pnpm docker:prod:build:affected                           # turbo-affected only
./scripts/docker/build-group-prod-images.sh gateways      # one group
pnpm docker:prod:build                                    # all (phased; cold ~45–70 min)
```

Full guide (timings, selective deploy, safe cleanup): [prod-deployment.md](./prod-deployment.md).

Manual rollback: `COMPOSE_FILE=docker-compose.prod.yml ./scripts/deploy/rollback.sh`

## Path C — Docker Compose (dev VPS)

Used by `.github/workflows/cd.yml` today:

1. CI builds on runner; SSH deploys to VPS
2. Infisical `dev` → `.env.infisical`
3. `migrate-deploy-ci.sh` → `docker compose -f docker-compose.dev.yml up`

Manual rollback: `./scripts/deploy/rollback.sh`

### Low-RAM VPS (≤12GB) — SSH-safe bring-up

Unrestricted `nest start --watch` across ~30 containers can OOM/thrash the host and lock you out of SSH. Compose applies **hard mem/CPU limits**, **hybrid watch**, and **sequential** container start (one-by-one).

| Command                    | What starts / stops                                                                            |
| :------------------------- | :--------------------------------------------------------------------------------------------- |
| `pnpm docker:up`           | All gateways + all 16 microservices + promtail (+ Caddy if `ENABLE_LOCAL_PROXY=1`), sequential |
| `pnpm docker:up:workers`   | All 10 workers (sequential; run after core)                                                    |
| `pnpm docker:up:full`      | Core then workers (still sequential + hybrid watch)                                            |
| `pnpm docker:down:workers` | Stop/remove workers only                                                                       |
| `pnpm docker:down:core`    | Stop/remove core (+ Caddy); leave workers                                                      |
| `pnpm docker:down`         | Stop full stack (core + workers)                                                               |

**Hybrid watch (default)**

- **Watch** (`nest start --watch`): `gateway`, `ws-gateway`
- **Non-watch** (`nest start`): all `svc-*` and `worker-*`
- Opt-in more watch: `WATCH_SERVICES=gateway,ws-gateway,svc-auth pnpm docker:up`

**Safe rollout**

1. Keep provider console open before first bring-up.
2. `pnpm docker:build` **with the stack down** (build + full stack near RAM ceiling is high risk). Single-target build via `compose-dev.sh` (do not bake every service in parallel).
3. `pnpm docker:up` → containers start one-by-one; abort if MemAvailable drops below ~2GB.
4. From a **new** SSH session: `uptime; free -h; docker stats --no-stream`.
5. Abort if you cannot open SSH, `MemAvailable` &lt; ~2GB, or the host is swap-thrashing.
6. Only then: `pnpm docker:up:workers` (or `pnpm docker:up:full`). Prefer `pnpm docker:prod:up` on this size when hot-reload is not required.

**Why sequential + named volumes matter**

Old compose used **anonymous** volumes for every package `node_modules` path and started many Nest watch processes in parallel — disk thrash + RAM stampede → SSH lockout. Fix: **named shared volumes** (`nl_nm_*`) + **one-by-one** `up --no-deps` with MemAvailable checks.

**Host checklist (required on ≤12GB VPS)**

```bash
sudo pnpm docker:harden:host
# or: sudo bash scripts/docker/harden-host-ssh-safe.sh
```

This script:

- Sets `sshd` `OOMScoreAdjust=-1000` (+ MemoryMin) so the kernel prefers killing app containers over SSH
- Raises `vm.admin_reserve_kbytes` (~256MB) so a root recovery shell can still fork
- Lowers `vm.swappiness` to `10` (avoid long swap storms)
- Shrinks oversized swap (e.g. 8GB → **2GB**) so thrash cannot lock SSH for minutes

Also:

- Never set `oom_kill_disable` on Nest/worker containers
- Legacy `COMPOSE_PROFILES=full` (old stampede) is still **blocked** on ≤16GB unless `NESTLANCER_ALLOW_FULL=1`
- Prefer `NESTLANCER_UP_MODE=full` via `pnpm docker:up:full` (sequential hybrid) instead
- CD Compose path: set repo var `NESTLANCER_COMPOSE_PROFILES=workers` only after headroom is proven

**Expected steady footprint (core, hybrid watch)** ≈ 2 watch gateways + 16 non-watch services + promtail/Caddy. Tune settle delay with `NESTLANCER_UP_DELAY_SEC` (default 12) and abort floor with `NESTLANCER_MEM_ABORT_KB` (default 2000000).

## Rollback

| Path    | Command                                                                     |
| :------ | :-------------------------------------------------------------------------- |
| Compose | `./scripts/deploy/rollback.sh <sha>`                                        |
| K3s     | `kubectl rollout undo deployment/gateway -n nestlancer` + DB migration plan |

---

## Health checks

```bash
GATEWAY_URL=https://api.nestlancer.com ./scripts/deploy/smoke-health.sh
```

See [deployment-checklist.md](../runbooks/deployment-checklist.md).

---

<div align="center">

**Production deployment** — Nestlancer guide

</div>
