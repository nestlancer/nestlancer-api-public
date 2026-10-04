# Production origin TLS (Cloudflare 526 fix)

## Problem

Public `https://api.nestlancer.com` returned **Cloudflare HTTP 526** while the gateway on `127.0.0.1:4000` was healthy.

### Root cause

`docker/caddy/Caddyfile.prod` used `tls internal` (Caddy’s local CA). Cloudflare **Full (strict)** rejects that origin certificate → **526**.

Secondary issue: Caddy ACME data lived under `.docker/caddy-prod/` (gitignored). Resetting the stack during prod testing re-issued Let’s Encrypt certs until rate limits blocked issuance for days/weeks.

## Fix (in repo)

1. **File-based TLS** in `Caddyfile.prod`:

   ```caddy
   tls /etc/caddy/certs/origin.pem /etc/caddy/certs/origin.key
   ```

2. **Persist certs in the project**: `docker/caddy/certs/origin.{pem,key}`  
   Mounted by `docker-compose.prod.proxy.yml`. Survive compose downs and fresh VPS clones when committed (private repo) or restored from Infisical.

3. **Scripts**

   | Script | Purpose |
   |--------|---------|
   | `scripts/docker/ensure-prod-origin-certs.sh` | Fail fast if certs missing; materialize from Infisical B64 |
   | `scripts/docker/install-prod-origin-certs.sh` | Install CF Origin / self-signed into project dir |
   | `scripts/docker/proxy-prod-up.sh` | Ensure certs → start `nl-prod-proxy` |
   | `scripts/docker/reload-prod-secrets.sh` | Re-export Infisical + `--force-recreate` |

4. **Production CD** (`cd-production.yml`) now:
   - force-recreates containers after Infisical export (webhook secrets apply)
   - starts the origin proxy via `proxy-prod-up.sh`

## Install Cloudflare Origin Certificate (required for Full strict)

1. Cloudflare → **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Hostnames: `api`, `web`, `admin`, `landing` (+ optional `*.nestlancer.com`)
3. Validity: **15 years** (no LE rate limits)
4. SSL/TLS encryption mode: **Full (strict)**
5. On the VPS / repo:

```bash
cd /root/nestlancer-backend-api-prod   # or workspace clone

bash scripts/docker/install-prod-origin-certs.sh \
  --cert /path/to/origin.pem \
  --key /path/to/origin.key

# Optional: backup into Infisical prod for blank VPS recovery
bash scripts/docker/install-prod-origin-certs.sh --print-infisical
# → set CADDY_ORIGIN_CERT_B64 and CADDY_ORIGIN_KEY_B64 in Infisical

pnpm docker:prod:proxy:up
```

## Fresh VPS checklist

```bash
git clone git@github.com:nestlancer/nestlancer-backend-api.git /root/nestlancer-backend-api-prod
cd /root/nestlancer-backend-api-prod

# Infisical machine identity env vars must be available
INFISICAL_ENV=prod ./scripts/docker/compose-prod.sh config >/dev/null

# Certs from git and/or Infisical CADDY_ORIGIN_*_B64
bash scripts/docker/ensure-prod-origin-certs.sh

FORCE_RECREATE=1 INFISICAL_ENV=prod pnpm docker:prod:up
pnpm docker:prod:proxy:up
```

## Reload secrets (Razorpay webhook, etc.)

Updating Infisical alone does **not** change running containers until env is re-exported and containers are recreated:

```bash
cd /root/nestlancer-backend-api-prod
INFISICAL_ENV=prod pnpm docker:prod:reload-secrets
# or only payment/webhook path:
INFISICAL_ENV=prod bash scripts/docker/reload-prod-secrets.sh \
  svc-webhooks svc-payments worker-webhook
```

## Verify

```bash
# Local origin HTTPS (should be 200)
curl -sk --resolve api.nestlancer.com:443:127.0.0.1 \
  https://api.nestlancer.com/api/v1/health/live

# Public via Cloudflare (must NOT be 526)
curl -sS -o /dev/null -w '%{http_code}\n' \
  https://api.nestlancer.com/api/v1/health/live

openssl x509 -in docker/caddy/certs/origin.pem -noout -issuer -dates -ext subjectAltName
# Prefer issuer containing "Cloudflare Origin"
```

## Do not

- Do not use `tls internal` on Cloudflare Full (strict) hosts
- Do not rely on deleting `.docker/caddy-prod` and re-issuing LE during testing
- Do not expect Infisical secret edits to apply without `reload-prod-secrets` / deploy force-recreate
