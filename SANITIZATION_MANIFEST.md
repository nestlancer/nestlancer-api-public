# Nestlancer sanitized share package

Generated: 2026-10-02T02:08:07Z

## Source commits (original repos, unmodified)

| Repo | Branch | Commit |
|------|--------|--------|
| nestlancer-backend-api | main | fe8cc3031687f1dcde6ca6994985ca092b7deebd |
| nestlancer-frontend | main | b1406a3017524f8d605dd90cf5a00a12d08ce03f |

## Never exported (local-only on originals)

- `.env.infisical*`, `.env.test`, `seed/reset/config/.env.reset`
- Local Docker/Caddy ACME keys under `.docker/`
- `node_modules/`, build artifacts, coverage
- Git history (`.git`)

## Removed / redacted in this package

- Deleted `docker/caddy/certs/origin.key` + `origin.pem`
- Deleted `overall-report.md` (live infra passwords)
- Redacted E2E DB password + Tailscale hosts in `prisma/README.md`
- Redacted demo seed password the former demo seed password

## Original-repo findings (originals NOT modified)

1. Cloudflare Origin CA key tracked in git — rotate + stop tracking
2. `overall-report.md` has live Redis/RabbitMQ/MinIO passwords — rotate + remove
3. `prisma/README.md` has E2E Postgres password — rotate + redact
4. Workspace `resource-details.md` (outside these repos) has Infisical UA secret

## Additional redaction (pass 2)

- Replaced embedded RSA test JWT keypair in `libs/testing/src/helpers/integration-jwt.env.ts`
  with `REDACTED_FOR_SHARE_PACKAGE` placeholders.
