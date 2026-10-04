# Nestlancer sanitized share package

Generated: 2026-10-04T09:52:14Z

## Source commits (original repos, unmodified)

| Repo | Branch | Commit |
|------|--------|--------|
| nestlancer-backend-api | main | 1755cadb809ad7eedf248070652cb666a7d77509 |
| nestlancer-frontend | main | bae69c6e2be515d4e2069000c779c1ac3d365e24 |

## Never exported (local-only on originals)

- `.env.infisical*`, `.env.test`, `seed/reset/config/.env.reset`
- Local Docker/Caddy ACME keys under `.docker/`
- `node_modules/`, build artifacts, coverage, `.pnpm-store/`
- Git history (`.git`)

## Removed / redacted in this package

- Deleted `docker/caddy/certs/origin.key` + `origin.pem`
- Deleted `overall-report.md` (live infra passwords)
- Redacted demo seed password to `REDACTED_DEMO_PASSWORD`
- Replaced embedded RSA test JWT keypair in `libs/testing/src/helpers/integration-jwt.env.ts`
  with `REDACTED_FOR_SHARE_PACKAGE` placeholders.

## Sync note

Public working trees synced from originals at the source commits above (content only; separate public git history).
