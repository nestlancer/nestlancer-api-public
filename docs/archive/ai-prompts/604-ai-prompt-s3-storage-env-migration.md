# AI Prompt — Migrate Environment Secrets to S3-Only Storage

Use this prompt in a follow-up session **after** the codebase has been updated to S3-only storage (no B2, Backblaze, or MinIO-specific env vars).

---

## Context

Nestlancer backend storage is consolidated to:

- **`STORAGE_PROVIDER`**: `s3` | `local` (default `local`)
- **S3 connection** (when `STORAGE_PROVIDER=s3`):
  - `S3_ACCESS_KEY_ID`
  - `S3_SECRET_ACCESS_KEY`
  - `S3_ENDPOINT`
  - `S3_PUBLIC_ENDPOINT` (optional — CDN/proxy for browser presigned URLs)
  - `S3_REGION` (default `us-east-1`)
  - `S3_PRESIGNED_URL_EXPIRY` (default `3600`)
- **Buckets**: `STORAGE_BUCKET_*` (unchanged)
- **Local fallback**: `LOCAL_STORAGE_PATH`, `LOCAL_STORAGE_URL`

**Removed** (do not use anywhere):

- `B2_*`, `MINIO_*`, `STORAGE_PROVIDER=b2`, `STORAGE_PROVIDER=minio`
- Docs: `backblaze-setup-guide.md`, `B2_STORAGE_ESTIMATE_100_USERS.md`

Reference: [docs/guides/s3-storage-setup.md](../../guides/s3-storage-setup.md), [docs/guides/environment-variables.md](../../guides/environment-variables.md)

---

## Your Task

Update **all environment files and Infisical secrets** to use S3-only parameters. Do **not** change application code unless a file still references removed B2/MinIO variables.

### 1. Files to update

| File / location                                            | Action                                                            |
| :--------------------------------------------------------- | :---------------------------------------------------------------- |
| `.env.infisical` (exported from Infisical `dev`)           | Replace `B2_*` / `MINIO_*` with `S3_*`; set `STORAGE_PROVIDER=s3` |
| `.env.test`                                                | Same mapping for test/e2e                                         |
| `.env.e2e` (if present)                                    | Same                                                              |
| `.env.development`, `.env.production` (if present)         | Same                                                              |
| Infisical UI — folder `/storage`                           | Rename keys; delete obsolete `B2_*` and `MINIO_*`                 |
| GitHub Actions / CD secrets (if any storage vars)          | Align to `S3_*`                                                   |
| `k3s/base/secrets.example.yaml` or similar deploy examples | Update variable names                                             |

### 2. Variable mapping (old → new)

| Remove / replace                                          | New variable              |
| :-------------------------------------------------------- | :------------------------ |
| `B2_KEY_ID` or `MINIO_ACCESS_KEY`                         | `S3_ACCESS_KEY_ID`        |
| `B2_APPLICATION_KEY` or `MINIO_SECRET_KEY`                | `S3_SECRET_ACCESS_KEY`    |
| `B2_ENDPOINT` or `MINIO_ENDPOINT`                         | `S3_ENDPOINT`             |
| `MINIO_PUBLIC_ENDPOINT`                                   | `S3_PUBLIC_ENDPOINT`      |
| `B2_REGION` or `MINIO_REGION`                             | `S3_REGION`               |
| `B2_PRESIGNED_URL_EXPIRY` or `MINIO_PRESIGNED_URL_EXPIRY` | `S3_PRESIGNED_URL_EXPIRY` |
| `STORAGE_PROVIDER=b2` or `minio`                          | `STORAGE_PROVIDER=s3`     |

Keep all `STORAGE_BUCKET_*` names as-is unless you intentionally rename buckets in the object store.

### 3. Validation steps

1. Grep the repo for `B2_`, `MINIO_`, `backblaze`, `minio` (case-insensitive) — only CHANGELOG/historical entries should remain.
2. Run storage-related unit tests: `pnpm --filter @nestlancer/config test`, `pnpm --filter @nestlancer/storage test`.
3. Run e2e/media tests if storage is exercised: `pnpm test:e2e` (or project-specific command).
4. Smoke-test presigned upload/download against the configured `S3_ENDPOINT`.
5. Re-export Infisical: `infisical export --env=dev > .env.infisical` and verify no legacy keys.

### 4. Rules

- **Do not** reintroduce provider-specific branches (`b2`, `minio`) in code.
- **Do not** commit real secrets; use placeholders in examples.
- Prefer **AWS S3** or a single self-hosted S3-compatible endpoint for production — one config shape for all environments.
- Document any intentional `S3_PUBLIC_ENDPOINT` vs `S3_ENDPOINT` split (internal API vs CDN) in Infisical comments or runbooks.

---

## Checklist Before Finishing

- [ ] All env files use `S3_*` only (no `B2_*`, no `MINIO_*`)
- [ ] `STORAGE_PROVIDER` is `s3` or `local` everywhere
- [ ] Infisical `/storage` folder updated and re-exported
- [ ] Tests pass
- [ ] Presigned PUT/GET verified against target bucket
- [ ] Team notified of new variable names for VPS / CI deploys
