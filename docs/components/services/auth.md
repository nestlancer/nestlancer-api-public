<div align="center">

# Auth Service

### Identity entry point: registration, login, JWT issuance, email verification, password reset, 2FA challenge, and session refresh.

</div>

---

## 📖 Table of Contents

- [👁 At a glance](#at-a-glance)
- [🎯 What this service owns](#what-this-service-owns)
- [🏗 How it fits in the platform](#how-it-fits-in-the-platform)
- [🌐 HTTP surface (discovered from controllers)](#http-surface-discovered-from-controllers)
- [📎 Dependencies (`@nestlancer/*`)](#dependencies-nestlancer)
- [🔌 External integrations](#external-integrations)
- [📨 Domain events (outbox)](#domain-events-outbox)
- [⚙️ Configuration](#configuration)
- [💻 Local development](#local-development)
- [🧪 Testing](#testing)
- [🛠 Operations](#operations)
- [📚 Related documentation](#related-documentation)

---

## 👁 At a glance

|                       |                                                                                        |
| :-------------------- | :------------------------------------------------------------------------------------- |
| **Package**           | `@nestlancer/auth-service`                                                             |
| **Source**            | `services/auth/`                                                                       |
| **Default port**      | 3001 (env: `AUTH_SERVICE_PORT`)                                                        |
| **Gateway prefix**    | `/api/v1/auth`                                                                         |
| **Primary data**      | UserCredential, RefreshToken, EmailVerificationToken, PasswordResetToken, LoginAttempt |
| **Detailed API spec** | [auth endpoints](../../api/services/auth.md)                                           |

---

## 🎯 What this service owns

- Issue RS256 JWT access tokens (15 min) and rotating refresh tokens (cookie + body)
- Enforce Turnstile on register/login; lock accounts after failed attempts
- Emit outbox events for welcome/verification emails (consumed by email-worker)

---

## 🏗 How it fits in the platform

```
Client → Gateway (/api/v1/auth) → Auth Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

---

## 🌐 HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/auth`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method | Path (service-relative) | Controller                                  |
| :----- | :---------------------- | :------------------------------------------ |
| `POST` | `/register`             | `src/controllers/auth.public.controller.ts` |
| `POST` | `/login`                | `src/controllers/auth.public.controller.ts` |
| `POST` | `/refresh`              | `src/controllers/auth.public.controller.ts` |
| `POST` | `/logout`               | `src/controllers/auth.public.controller.ts` |
| `POST` | `/logout-all`           | `src/controllers/auth.public.controller.ts` |
| `POST` | `/verify-2fa`           | `src/controllers/auth.public.controller.ts` |
| `POST` | `/verify-email`         | `src/controllers/auth.public.controller.ts` |
| `POST` | `/resend-verification`  | `src/controllers/auth.public.controller.ts` |
| `POST` | `/forgot-password`      | `src/controllers/auth.public.controller.ts` |
| `POST` | `/reset-password`       | `src/controllers/auth.public.controller.ts` |
| `POST` | `/check-email`          | `src/controllers/auth.public.controller.ts` |
| `GET`  | `/check-email`          | `src/controllers/auth.public.controller.ts` |
| `GET`  | `/health`               | `src/controllers/auth.public.controller.ts` |

For request/response examples, error codes, and rate limits, see [../../api/services/auth.md](../../api/services/auth.md) and [API standards](../../api/standards.md).

---

## 📎 Dependencies (`@nestlancer/*`)

- `@nestlancer/auth-lib`
- `@nestlancer/cache`
- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/idempotency`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/outbox`
- `@nestlancer/queue`
- `@nestlancer/tracing`

---

## 🔌 External integrations

- ZeptoMail (via queue)
- Cloudflare Turnstile
- Redis (rate limits)

---

## 📨 Domain events (outbox)

- `auth.user.registered` → see [event catalog](../../architecture/event-catalog.md)
- `auth.login.success` → see [event catalog](../../architecture/event-catalog.md)
- `auth.email.verified` → see [event catalog](../../architecture/event-catalog.md)
- `auth.password.changed` → see [event catalog](../../architecture/event-catalog.md)

---

## ⚙️ Configuration

| Variable            | Purpose                                 |
| :------------------ | :-------------------------------------- |
| `AUTH_SERVICE_PORT` | HTTP port (default 3001)                |
| `DATABASE_URL`      | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL`         | Cache / rate limits where used          |
| `RABBITMQ_URL`      | Event publishing                        |

Full list: [environment variables](../../guides/environment-variables.md) and Infisical paths in [infisical.md](../../guides/infisical.md).

---

## 💻 Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/auth-service dev

# Unit + integration tests
pnpm --filter @nestlancer/auth-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3001/health
```

Run the full stack: `make dev` or `pnpm dev` from the monorepo root (starts infra via Docker Compose).

---

## 🧪 Testing

- Unit tests: `services/auth/tests/unit/`
- E2E: `services/auth/tests/e2e/` (hits HTTP with Supertest)
- Cross-service flows: [testing strategy](../../guides/testing-strategy.md), [test commands](../../guides/test-commands.md)

---

## 🛠 Operations

- Health: included in gateway `GET /api/v1/health` aggregation
- Logs: JSON with `X-Correlation-ID` from gateway
- Metrics: Prometheus scrape via `@nestlancer/metrics`

---

## 📚 Related documentation

- [System architecture](../../architecture/overview.md)
- [Database schema](../../architecture/database-schema.md)
- [Adding a new service](../../guides/adding-new-service.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)

---

<div align="center">

**Auth Service** — Nestlancer backend component documentation

</div>
