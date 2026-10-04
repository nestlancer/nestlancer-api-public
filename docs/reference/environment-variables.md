<div align="center">

# Environment Variables Reference

</div>

---

## 📖 Table of Contents

- [Application](#application)
- [Database](#database)
- [Redis](#redis)
- [RabbitMQ](#rabbitmq)
- [JWT Authentication](#jwt-authentication)
- [Payment (Razorpay)](#payment-razorpay)
- [Storage](#storage)
- [Email](#email)
- [CDN](#cdn)
- [Origin TLS (Caddy / Cloudflare)](#origin-tls-caddy--cloudflare)
- [Security](#security)
- [Rate Limiting](#rate-limiting)
- [Web Push](#web-push)

---

## Application

| Variable       | Required | Default       | Description                                         |
| :------------- | :------- | :------------ | :-------------------------------------------------- |
| `NODE_ENV`     | Yes      | `development` | Environment: development, test, staging, production |
| `PORT`         | No       | `3000`        | HTTP server port                                    |
| `LOG_LEVEL`    | No       | `info`        | Log level: debug, info, warn, error                 |
| `API_PREFIX`   | No       | `/api/v1`     | API route prefix                                    |
| `FRONTEND_URL` | Yes      | –             | Frontend URL for CORS and email links               |

---

## Database

| Variable                     | Required | Default | Description                              |
| :--------------------------- | :------- | :------ | :--------------------------------------- |
| `DATABASE_URL`               | Yes      | –       | PostgreSQL connection string             |
| `DATABASE_READ_REPLICA_URLS` | No       | –       | Comma-separated replica URLs (R/W split) |

---

## Redis

| Variable           | Required | Default | Description                            |
| :----------------- | :------- | :------ | :------------------------------------- |
| `REDIS_CACHE_URL`  | Yes      | –       | Redis cache instance URL (port 6379)   |
| `REDIS_PUBSUB_URL` | Yes      | –       | Redis pub/sub instance URL (port 6380) |

---

## RabbitMQ

| Variable                  | Required | Default | Description                            |
| :------------------------ | :------- | :------ | :------------------------------------- |
| `RABBITMQ_URL`            | Yes      | –       | AMQP connection URL                    |
| `RABBITMQ_MANAGEMENT_URL` | No       | –       | Management API URL (for health checks) |

---

## JWT Authentication

| Variable             | Required | Default | Description                                |
| :------------------- | :------- | :------ | :----------------------------------------- |
| `JWT_ACCESS_SECRET`  | Yes      | –       | Access token signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes      | –       | Refresh token signing secret               |
| `JWT_ACCESS_EXPIRY`  | No       | `15m`   | Access token expiry                        |
| `JWT_REFRESH_EXPIRY` | No       | `7d`    | Refresh token expiry                       |

---

## Payment (Razorpay)

| Variable                  | Required | Default | Description                           |
| :------------------------ | :------- | :------ | :------------------------------------ |
| `RAZORPAY_KEY_ID`         | Yes      | –       | Razorpay API key                      |
| `RAZORPAY_KEY_SECRET`     | Yes      | –       | Razorpay API secret                   |
| `RAZORPAY_WEBHOOK_SECRET` | Yes      | –       | Webhook signature verification secret |

---

## Storage

| Variable                  | Required | Default              | Description                                         |
| :------------------------ | :------- | :------------------- | :-------------------------------------------------- |
| `STORAGE_PROVIDER`        | No       | `local`              | Storage provider: `s3` or `local`                   |
| `S3_ACCESS_KEY_ID`        | Cond.    | –                    | S3 access key (required when `STORAGE_PROVIDER=s3`) |
| `S3_SECRET_ACCESS_KEY`    | Cond.    | –                    | S3 secret key                                       |
| `S3_ENDPOINT`             | Cond.    | –                    | S3 API endpoint (AWS or any S3-compatible service)  |
| `S3_PUBLIC_ENDPOINT`      | No       | –                    | Public HTTPS host for presigned URLs (CDN/proxy)    |
| `S3_REGION`               | Cond.    | `us-east-1`          | S3 region                                           |
| `S3_PRESIGNED_URL_EXPIRY` | No       | `3600`               | Presigned URL TTL in seconds                        |
| `STORAGE_BUCKET_PRIVATE`  | No       | `nestlancer-private` | Private bucket (media, deliverables)                |
| `STORAGE_BUCKET_PUBLIC`   | No       | `nestlancer-public`  | Public bucket (portfolio, blog)                     |
| `STORAGE_BUCKET_AVATARS`  | No       | `nestlancer-avatars` | User avatar bucket                                  |
| `LOCAL_STORAGE_PATH`      | No       | `./data/storage`     | Local filesystem path when provider is `local`      |
| `LOCAL_STORAGE_URL`       | No       | –                    | Base URL for local storage objects                  |

---

## Email

Used by **email-worker** (and local dev via Mailpit). Production uses ZeptoMail SMTP.

| Variable              | Required     | Default                  | Description                                                      |
| :-------------------- | :----------- | :----------------------- | :--------------------------------------------------------------- |
| `EMAIL_PROVIDER`      | No           | `smtp`                   | `smtp` (dev/Mailpit) or `zeptomail` (prod)                       |
| `ZEPTOMAIL_TOKEN`     | If zeptomail | –                        | Send Mail Token (Agent → SMTP/API)                               |
| `ZEPTOMAIL_SMTP_HOST` | If zeptomail | `smtp.zeptomail.com`     | Regional SMTP host, e.g. `smtp.zeptomail.in` (India)             |
| `ZEPTOMAIL_DC`        | No           | –                        | Region shorthand: `us`, `in`, `eu`, `au`, `cn`, `jp`, `ca`, `uk` |
| `ZEPTOMAIL_SMTP_PORT` | No           | `587`                    | SMTP port (587 TLS, 465 SSL)                                     |
| `ZEPTOMAIL_SMTP_USER` | No           | `emailapikey`            | ZeptoMail SMTP username                                          |
| `FROM_EMAIL`          | No           | `noreply@nestlancer.com` | Verified sender address                                          |
| `FROM_NAME`           | No           | `Nestlancer`             | Sender display name                                              |
| `REPLY_TO`            | No           | –                        | Reply-To header and template `supportEmail`                      |
| `FRONTEND_URL`        | No           | `http://localhost:3000`  | Links in email templates                                         |
| `SMTP_HOST`           | If smtp      | `localhost`              | Dev SMTP (e.g. Mailpit)                                          |
| `SMTP_PORT`           | No           | `587`                    | Dev SMTP port                                                    |
| `SMTP_USER`           | No           | –                        | Dev SMTP username                                                |
| `SMTP_PASS`           | No           | –                        | Dev SMTP password                                                |

---

## CDN

| Variable                     | Required | Default | Description                |
| :--------------------------- | :------- | :------ | :------------------------- |
| `CLOUDFRONT_DISTRIBUTION_ID` | No       | –       | CloudFront distribution ID |
| `CLOUDFRONT_DOMAIN`          | No       | –       | CloudFront domain name     |

---

## Origin TLS (Caddy / Cloudflare)

Used by `scripts/docker/ensure-prod-origin-certs.sh` to materialize `docker/caddy/certs/origin.{pem,key}` on a fresh VPS. Prefer installing a Cloudflare Origin Certificate into that directory and committing it (private repo); keep Infisical as backup.

| Variable                 | Required | Default | Description                                      |
| :----------------------- | :------- | :------ | :----------------------------------------------- |
| `CADDY_ORIGIN_CERT_B64`  | No       | –       | Base64 of origin certificate PEM                 |
| `CADDY_ORIGIN_KEY_B64`   | No       | –       | Base64 of origin private key PEM                 |

See `docs/operations/prod-origin-tls.md`.

---

## Security

| Variable               | Required | Default | Description                 |
| :--------------------- | :------- | :------ | :-------------------------- |
| `TURNSTILE_SECRET_KEY` | No       | –       | Cloudflare Turnstile secret (required in prod when FE has `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) |
| `TURNSTILE_SITE_KEY`   | No       | –       | Public site key — must match frontend Infisical `NEXT_PUBLIC_TURNSTILE_SITE_KEY` |
| `CORS_ORIGINS`         | No       | `*`     | Allowed CORS origins        |
| `CSRF_SECRET`          | No       | –       | CSRF token signing secret   |

---

## Rate Limiting

| Variable                   | Required | Default | Description                    |
| :------------------------- | :------- | :------ | :----------------------------- |
| `RATE_LIMIT_ENABLED`       | No       | `true`  | Enable rate limiting           |
| `RATE_LIMIT_ANONYMOUS`     | No       | `30`    | Requests/min for anonymous     |
| `RATE_LIMIT_AUTHENTICATED` | No       | `100`   | Requests/min for authenticated |
| `RATE_LIMIT_ADMIN`         | No       | `300`   | Requests/min for admin         |

---

## Web Push

| Variable            | Required | Default | Description           |
| :------------------ | :------- | :------ | :-------------------- |
| `VAPID_PUBLIC_KEY`  | No       | –       | VAPID public key      |
| `VAPID_PRIVATE_KEY` | No       | –       | VAPID private key     |
| `VAPID_SUBJECT`     | No       | –       | VAPID subject (email) |

---

<div align="center">

**Environment Variables Reference** — Nestlancer guide

</div>
