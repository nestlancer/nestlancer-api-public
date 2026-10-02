<div align="center">

# Webhooks Ingestion Service

### Dedicated ingress for third-party webhooks (Razorpay, GitHub). Verifies signatures, logs payloads, enqueues to webhook-worker.

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

|                       |                                                      |
| :-------------------- | :--------------------------------------------------- |
| **Package**           | `@nestlancer/webhooks-service`                       |
| **Source**            | `services/webhooks/`                                 |
| **Default port**      | 3004 (env: `WEBHOOKS_SERVICE_PORT`)                  |
| **Gateway prefix**    | `/api/v1/webhooks`                                   |
| **Primary data**      | WebhookEventLog, WebhookProviderConfig               |
| **Detailed API spec** | [webhooks endpoints](../../api/services/webhooks.md) |

---

## 🎯 What this service owns

- Provider-specific signature verification (HMAC)
- IP allowlist and aggressive rate limits
- Never mutates domain state directly — async processing only

---

## 🏗 How it fits in the platform

```
Client → Gateway (/api/v1/webhooks) → Webhooks Ingestion Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

---

## 🌐 HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/webhooks`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method | Path (service-relative) | Controller                                               |
| :----- | :---------------------- | :------------------------------------------------------- |
| `POST` | `/razorpay`             | `src/controllers/webhook/webhook-receiver.controller.ts` |
| `POST` | `/cloudflare`           | `src/controllers/webhook/webhook-receiver.controller.ts` |
| `POST` | `/github`               | `src/controllers/webhook/webhook-receiver.controller.ts` |
| `POST` | `/stripe`               | `src/controllers/webhook/webhook-receiver.controller.ts` |
| `POST` | `/:provider`            | `src/controllers/webhook/webhook-receiver.controller.ts` |
| `GET`  | `/health`               | `src/controllers/webhook/webhooks-health.controller.ts`  |

For request/response examples, error codes, and rate limits, see [../../api/services/webhooks.md](../../api/services/webhooks.md) and [API standards](../../api/standards.md).

---

## 📎 Dependencies (`@nestlancer/*`)

- `@nestlancer/auth-lib`
- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`
- `@nestlancer/database`
- `@nestlancer/queue`
- `@nestlancer/outbox`
- `@nestlancer/cache`
- `@nestlancer/idempotency`

---

## 🔌 External integrations

- RabbitMQ webhook.queue

---

## 📨 Domain events (outbox)

_This service may consume events but does not publish primary domain events — check code for outbox writes._

---

## ⚙️ Configuration

| Variable                | Purpose                                 |
| :---------------------- | :-------------------------------------- |
| `WEBHOOKS_SERVICE_PORT` | HTTP port (default 3004)                |
| `DATABASE_URL`          | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL`             | Cache / rate limits where used          |
| `RABBITMQ_URL`          | Event publishing                        |

Full list: [environment variables](../../guides/environment-variables.md) and Infisical paths in [infisical.md](../../guides/infisical.md).

---

## 💻 Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/webhooks-service dev

# Unit + integration tests
pnpm --filter @nestlancer/webhooks-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3004/health
```

Run the full stack: `make dev` or `pnpm dev` from the monorepo root (starts infra via Docker Compose).

---

## 🧪 Testing

- Unit tests: `services/webhooks/tests/unit/`
- E2E: `services/webhooks/tests/e2e/` (hits HTTP with Supertest)
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

**Webhooks Ingestion Service** — Nestlancer backend component documentation

</div>
