# Nestlancer Backend API - Step-by-Step Guide (Beginner)

This is the beginner operating guide for the backend repository.

Use this file when:

- setting up a new laptop
- running backend locally
- releasing backend images to GHCR
- deploying backend to VPS
- doing rollback and incident triage

---

## 1) What this backend contains

- 1 API gateway (`gateway`)
- 1 WS gateway (`ws-gateway`)
- 16 services (`services/*`)
- 10 workers (`workers/*`)
- 28 shared libraries in `libs/*`

Backend depends on:

- PostgreSQL
- Redis
- RabbitMQ
- Infisical (for environment management)

---

## 2) Tools you must install

`pnpm install` does not install machine tools.

Install these first:

- `git`
- `node` 20+
- `pnpm` 9+
- `docker`
- `docker compose`
- `curl`
- `bash`
- `infisical` CLI

Optional:

- `make`
- `jq`
- `kubectl` (if K3s deployment path)

Verify:

```bash
git --version
node -v
pnpm -v
docker --version
docker compose version
infisical --version
```

Expected: all commands print a version and no command-not-found error.

---

## 3) New laptop setup checklist (copy-paste)

- [ ] clone repository
- [ ] install dependencies
- [ ] login to Infisical
- [ ] export dev env
- [ ] run docker infra
- [ ] run migration and seed
- [ ] start backend services

```bash
cd /root/workspace
git clone <backend-repo-url> nestlancer-backend-api
cd /root/workspace/nestlancer-backend-api

pnpm install
pnpm db:generate

infisical init
infisical login
infisical export --env=dev --format=dotenv > .env.infisical
chmod 600 .env.infisical

pnpm docker:up   # includes Caddy on ports 80/443 when ENABLE_LOCAL_PROXY=1 (default)
pnpm db:migrate
# Services must be up. This loads core config, blogs, and portfolio (Postgres + MinIO).
bash seed/seed.sh --env=dev --phase=core,content
# Full wipe plus demo clients:
# bash seed/seed.sh --env=dev
pnpm dev
```

On a **dev VPS** with a public hostname, complete [section 12](#12-dev-vps--public-api-dev-apinestlancercom) after `pnpm docker:up`.

Expected:

- Docker containers start (including `nl-dev-proxy` / Caddy on VPS)
- migration and seed succeed
- dev processes start in watch mode

---

## 4) Local verification checklist

```bash
curl http://localhost:3000/api/v1/health/live
```

Expected: health JSON response (ok/up style status).

Also verify:

- RabbitMQ UI: `http://localhost:15672`
- Mailpit UI: `http://localhost:8025`

---

## 5) Release backend images to GHCR

Workflow file: `.github/workflows/build-images.yml`

Release steps:

```bash
git checkout main
git pull origin main
git tag v1.0.0
git push origin v1.0.0
```

Then:

1. open GitHub release page
2. publish release for `v1.0.0`
3. open Actions -> Build Production Images
4. wait for matrix jobs to finish

Expected:

- GHCR packages exist for backend image IDs
- workflow green

---

## 6) Production deploy to VPS (automatic workflow)

Workflow: `.github/workflows/cd-production.yml`

Required GitHub secrets:

- `PRODUCTION_VPS_HOST`
- `PRODUCTION_VPS_USERNAME`
- `PRODUCTION_VPS_PASSWORD`
- `PRODUCTION_VPS_DEPLOY_PATH` (optional)
- `INFISICAL_CLIENT_ID`
- `INFISICAL_CLIENT_SECRET`
- `INFISICAL_PROJECT_ID` (optional)
- `NESTLANCER_IMAGE_REGISTRY`

Workflow does:

1. SSH to VPS
2. pull latest code
3. export production env from Infisical
4. run migration script
5. pull images and start compose
6. run smoke health checks

---

## 7) Manual VPS deploy fallback

```bash
ssh root@YOUR_VPS_IP
cd /root/nestlancer-backend-api

git pull origin main
echo "ghp_xxx" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

INFISICAL_ENV=production ./scripts/docker/compose-prod.sh pull
INFISICAL_ENV=production ./scripts/docker/compose-prod.sh up -d
GATEWAY_URL=http://127.0.0.1:3000 ./scripts/deploy/smoke-health.sh
```

Expected:

- `docker login` says `Login Succeeded`
- compose pull/up succeeds
- smoke script passes

---

## 8) Rollback (production)

```bash
cd /root/nestlancer-backend-api
COMPOSE_FILE=docker-compose.prod.yml ./scripts/deploy/rollback.sh <previous-sha>
pnpm docker:prod:ps
```

Expected: services return to healthy state on previous stable version.

---

## 9) Day-2 operator runbook

### First 10-minute incident response

- [ ] confirm if outage is full or partial
- [ ] check container status
- [ ] check gateway health
- [ ] inspect gateway logs first
- [ ] inspect failing service logs

Commands:

```bash
cd /root/nestlancer-backend-api
pnpm docker:prod:ps
pnpm docker:prod:logs
docker compose -f docker-compose.prod.yml logs -f --tail=200 gateway
```

### Seed data by hand

From the backend repo root, after prod containers are up. Check `.env.infisical` first so the database name is `nl_platform_prod`. The full checklist is [`seed/README.md`](seed/README.md).

```bash
cd /root/workspace/nestlancer-backend-api
bash seed/seed.sh --env=prod --phase=core --skip-export
bash seed/seed.sh --env=prod --phase=blogs --skip-export
bash seed/seed.sh --env=prod --phase=portfolio --skip-export
```

This does not truncate tables and does not create demo clients. `reset` and `demo` on prod require `--confirm-prod`.

### Rollback decision

Rollback if:

- production is down after deploy
- no safe hotfix in 10-15 minutes

Hotfix if:

- issue is isolated and low-risk change can be shipped quickly

---

## 10) New VPS setup checklist (copy-paste)

```bash
ssh root@YOUR_VPS_IP

apt update
apt install -y git docker.io docker-compose-plugin curl ufw
systemctl enable docker
systemctl start docker

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Install Infisical CLI using official instructions for your OS
infisical --version

cd /root
git clone <backend-repo-url> nestlancer-backend-api

echo "ghp_xxx" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Then apply UFW Docker web rules and start dev API — [section 12](#12-dev-vps--public-api-dev-apinestlancercom).

Expected:

- tools installed
- repository cloned
- GHCR login success
- provider firewall allows 80/443 (Hetzner Cloud Firewall if applicable)

---

## 11) Printable release checklist (backend only)

- [ ] `main` branch ready
- [ ] tag created and pushed
- [ ] release published
- [ ] build-images workflow green
- [ ] cd-production workflow green
- [ ] health endpoint green
- [ ] rollback SHA documented

---

## 12) Dev VPS — public API (`dev-api.nestlancer.com`)

Use this when the **dev** Docker stack runs on a VPS and teammates open the API in a browser (not only `localhost`).

### What runs where

- **Caddy** container `nl-dev-proxy` binds VPS ports `80` and `443` (`docker-compose.local.yml`).
- Caddy proxies to `gateway` (HTTP API) and `ws-gateway` (WebSockets).
- **No host-level Nginx** is required for this dev path.

### One-time VPS setup

- [ ] DNS: `dev-api` A record → VPS public IP
- [ ] Provider firewall (e.g. Hetzner): inbound TCP `80`, `443` from anywhere
- [ ] UFW on VPS:
  ```bash
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw reload
  ```
- [ ] **UFW + Docker fix** (required when UFW is enabled):

  In `/etc/ufw/after.rules`, inside `# BEGIN UFW AND DOCKER`, add immediately after `-A DOCKER-USER -j ufw-user-forward`:

  ```text
  -A DOCKER-USER -p tcp -m tcp --dport 80 -j RETURN
  -A DOCKER-USER -p tcp -m tcp --dport 443 -j RETURN
  ```

  Then:

  ```bash
  ufw reload
  ```

  **Why:** default rules send new traffic to `172.16.0.0/12` to `ufw-docker-logging-deny` → DROP. Docker bridge (`172.18.x.x`) is in that range, so published ports accept SYNs but never forward to Caddy.

### Start and verify on VPS

```bash
cd /root/workspace/nestlancer-backend-api   # or your clone path
export DEV_API_HOST=dev-api.nestlancer.com
export LETSENCRYPT_EMAIL=ops@nestlancer.com
pnpm docker:up
# wait ~60s for gateway, then:
pnpm docker:verify:dev-host
pnpm docker:proxy:logs
```

### Verify from your laptop

```bash
curl -v --connect-timeout 10 https://dev-api.nestlancer.com/api/v1/health/live
curl -v --connect-timeout 10 https://dev-api.nestlancer.com/docs
```

Expected: valid TLS (Let's Encrypt) and HTTP `200`.

### If the browser times out

1. On VPS, run while you curl from laptop:
   ```bash
   sudo tcpdump -ni eth0 'tcp port 80 or tcp port 443'
   ```
2. If you see `SYN` from your IP but **no `SYN-ACK`**, fix UFW Docker rules (above) or provider firewall—not application code.
3. If local checks pass but public fails, do **not** trust VPS-only `curl` to the public IP (hairpin can work while external clients are blocked).

More detail: `README.md` → **Dev VPS public access**.
