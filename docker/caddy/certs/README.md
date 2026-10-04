# Production origin TLS certificates

Caddy serves HTTPS for Cloudflare → origin using files in this directory:

| File | Purpose |
|------|---------|
| `origin.pem` | Certificate (Cloudflare Origin CA preferred) |
| `origin.key` | Private key (`chmod 600`) |

These paths are mounted into `nl-prod-proxy` as `/etc/caddy/certs/`.

## Why this directory exists

`tls internal` (Caddy local CA) causes **Cloudflare HTTP 526** when SSL/TLS mode is **Full (strict)**.

Let's Encrypt auto-issue from Caddy also burns rate limits when prod stacks are reset during testing. **Save real certs here once** and reuse them on every fresh VPS / compose recreate.

This is a private repo — origin certs are intentionally recoverable from git (see root `.gitignore` contract). Still restrict key permissions (`600`).

## Recommended: Cloudflare Origin Certificate

1. Cloudflare Dashboard → **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Hostnames (include all prod fronts + API + brand apex):
   - `api.nestlancer.com`
   - `app.nestlancer.com`
   - `admin.nestlancer.com`
   - `landing.nestlancer.com`
   - `nestlancer.com`
   - `www.nestlancer.com` (or covered by `*.nestlancer.com`)
   - `*.nestlancer.com` (optional but recommended)
3. Validity: **15 years**
4. Install into this directory:

```bash
# From repo root
bash scripts/docker/install-prod-origin-certs.sh \
  --cert /path/to/origin.pem \
  --key /path/to/origin.key
```

5. Cloudflare SSL/TLS mode: **Full (strict)**
6. Start / restart proxy:

```bash
pnpm docker:prod:proxy:up
```

7. Optional but recommended — also store Base64 PEMs in Infisical `prod` so a blank VPS can materialize certs without git history:

- `CADDY_ORIGIN_CERT_B64`
- `CADDY_ORIGIN_KEY_B64`

```bash
bash scripts/docker/install-prod-origin-certs.sh --print-infisical
```

## Fresh VPS flow

```bash
cd /root/nestlancer-backend-api-prod
# 1) Export secrets (includes optional CADDY_ORIGIN_*_B64)
INFISICAL_ENV=prod ./scripts/docker/compose-prod.sh config >/dev/null
# 2) Materialize cert files (from disk or Infisical)
bash scripts/docker/ensure-prod-origin-certs.sh
# 3) App stack + proxy
pnpm docker:prod:up
pnpm docker:prod:proxy:up
```

`ensure-prod-origin-certs.sh` / `proxy-prod-up.sh` refuse to start the proxy without valid cert files.

## Emergency only: long-lived self-signed

Only if Cloudflare SSL mode is **Full** (not Full strict):

```bash
bash scripts/docker/install-prod-origin-certs.sh --self-signed
```

Full (strict) will still return **526** with self-signed certs.

## Verify

```bash
# Origin directly (ignore CF)
curl -sk --resolve api.nestlancer.com:443:127.0.0.1 \
  https://api.nestlancer.com/api/v1/health/live

# Through Cloudflare (must be 200, not 526)
curl -sS -o /dev/null -w '%{http_code}\n' \
  https://api.nestlancer.com/api/v1/health/live

openssl x509 -in docker/caddy/certs/origin.pem -noout -subject -issuer -dates -ext subjectAltName
```
