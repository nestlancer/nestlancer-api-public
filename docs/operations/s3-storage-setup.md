# S3 Object Storage — Nestlancer Setup Guide

**Provider:** Any S3-compatible API (AWS S3, self-hosted S3 endpoint, etc.)

---

## Overview

Nestlancer uses a single **S3-compatible** storage layer via `@nestlancer/storage`. There is no separate Backblaze, MinIO, or provider-specific configuration — only standard S3 parameters.

| Use case                    | Bucket env var                | Typical visibility         |
| :-------------------------- | :---------------------------- | :------------------------- |
| Media (private uploads)     | `STORAGE_BUCKET_PRIVATE`      | Private (presigned URLs)   |
| Portfolio / blog assets     | `STORAGE_BUCKET_PUBLIC`       | Public (CDN or direct URL) |
| User avatars                | `STORAGE_BUCKET_AVATARS`      | Public                     |
| Service request attachments | `STORAGE_BUCKET_ATTACHMENTS`  | Private                    |
| Quote PDFs                  | `STORAGE_BUCKET_QUOTES`       | Private                    |
| Project deliverables        | `STORAGE_BUCKET_DELIVERABLES` | Private                    |
| Admin reports               | `STORAGE_BUCKET_REPORTS`      | Private                    |
| Generated PDFs              | `STORAGE_BUCKET_PDFS`         | Private                    |

---

## Required environment variables

Set `STORAGE_PROVIDER=s3` and configure:

```bash
STORAGE_PROVIDER=s3
S3_ACCESS_KEY_ID=<access-key>
S3_SECRET_ACCESS_KEY=<secret-key>
S3_ENDPOINT=https://s3.<region>.amazonaws.com   # or your S3-compatible endpoint
S3_REGION=us-east-1
S3_PRESIGNED_URL_EXPIRY=3600

# Optional: public host for browser-facing presigned URLs (CDN / reverse proxy)
S3_PUBLIC_ENDPOINT=https://cdn.example.com

# Bucket names (defaults shown — override per environment)
STORAGE_BUCKET_PRIVATE=nestlancer-private
STORAGE_BUCKET_PUBLIC=nestlancer-public
STORAGE_BUCKET_AVATARS=nestlancer-avatars
STORAGE_BUCKET_ATTACHMENTS=nestlancer-requests
STORAGE_BUCKET_QUOTES=nestlancer-quotes-pdfs
STORAGE_BUCKET_DELIVERABLES=nestlancer-deliverables
STORAGE_BUCKET_REPORTS=nestlancer-reports
STORAGE_BUCKET_PDFS=nestlancer-pdfs
```

For local development without cloud storage, use `STORAGE_PROVIDER=local` and `LOCAL_STORAGE_PATH`.

---

## AWS S3 (production)

1. Create an IAM user or role with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:ListBucket` on your buckets.
2. Create buckets in your target region (or use one bucket with key prefixes).
3. Enable CORS on buckets used for browser direct upload (presigned PUT).
4. Optionally front public buckets with Cloudflare or CloudFront; set `S3_PUBLIC_ENDPOINT` to the CDN hostname.

---

## Public bucket policy (NL-BUG-SEC-004)

Public buckets (`STORAGE_BUCKET_PUBLIC`, `STORAGE_BUCKET_AVATARS`) must allow
anonymous **GetObject only** — never `ListBucket`. On MinIO do **not** use
`mc anonymous set download` (that grants listing). Use a GetObject-only JSON
policy via `mc anonymous set-json` instead. Object URLs stay publicly readable;
`GET /{bucket}` must return `403 AccessDenied`.


## Infisical

Store all `S3_*` and `STORAGE_BUCKET_*` secrets under the `/storage` folder in Infisical. See [infisical.md](secrets-infisical.md) and [environment-variables.md](../reference/environment-variables.md).

---

## Related docs

- [environment-variables.md](../reference/environment-variables.md) — full variable reference
- [components/libs/storage.md](../components/libs/storage.md) — library usage
- [local-development.md](../development/local-workflow.md) — dev stack
