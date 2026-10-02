<div align="center">

# Contact Service

### Marketing contact form, spam filtering, auto-replies, admin CRM inbox.

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

|                       |                                                    |
| :-------------------- | :------------------------------------------------- |
| **Package**           | `@nestlancer/contact-service`                      |
| **Source**            | `services/contact/`                                |
| **Default port**      | 3015 (env: `CONTACT_SERVICE_PORT`)                 |
| **Gateway prefix**    | `/api/v1/contact`                                  |
| **Primary data**      | ContactMessage, ContactNote, ContactTag, AutoReply |
| **Detailed API spec** | [contact endpoints](../../api/services/contact.md) |

---

## 🎯 What this service owns

- Public submit with Turnstile
- Admin assign/respond/tag/export
- Configurable auto-reply rules

---

## 🏗 How it fits in the platform

```
Client → Gateway (/api/v1/contact) → Contact Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

---

## 🌐 HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/contact`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method   | Path (service-relative)      | Controller                                            |
| :------- | :--------------------------- | :---------------------------------------------------- |
| `GET`    | `/admin/contact`             | `src/controllers/admin/contact.admin.controller.ts`   |
| `GET`    | `/admin/contact/:id`         | `src/controllers/admin/contact.admin.controller.ts`   |
| `PATCH`  | `/admin/contact/:id/status`  | `src/controllers/admin/contact.admin.controller.ts`   |
| `POST`   | `/admin/contact/:id/respond` | `src/controllers/admin/contact.admin.controller.ts`   |
| `POST`   | `/admin/contact/:id/spam`    | `src/controllers/admin/contact.admin.controller.ts`   |
| `DELETE` | `/admin/contact/:id`         | `src/controllers/admin/contact.admin.controller.ts`   |
| `GET`    | `/contact/health`            | `src/controllers/public/contact.public.controller.ts` |
| `POST`   | `/contact`                   | `src/controllers/public/contact.public.controller.ts` |

For request/response examples, error codes, and rate limits, see [../../api/services/contact.md](../../api/services/contact.md) and [API standards](../../api/standards.md).

---

## 📎 Dependencies (`@nestlancer/*`)

- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`
- `@nestlancer/database`
- `@nestlancer/queue`
- `@nestlancer/cache`
- `@nestlancer/auth-lib`
- `@nestlancer/testing`
- `@nestlancer/turnstile`

---

## 🔌 External integrations

- Email worker
- Turnstile

---

## 📨 Domain events (outbox)

_This service may consume events but does not publish primary domain events — check code for outbox writes._

---

## ⚙️ Configuration

| Variable               | Purpose                                 |
| :--------------------- | :-------------------------------------- |
| `CONTACT_SERVICE_PORT` | HTTP port (default 3015)                |
| `DATABASE_URL`         | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL`            | Cache / rate limits where used          |
| `RABBITMQ_URL`         | Event publishing                        |

Full list: [environment variables](../../guides/environment-variables.md) and Infisical paths in [infisical.md](../../guides/infisical.md).

---

## 💻 Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/contact-service dev

# Unit + integration tests
pnpm --filter @nestlancer/contact-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3015/health
```

Run the full stack: `make dev` or `pnpm dev` from the monorepo root (starts infra via Docker Compose).

---

## 🧪 Testing

- Unit tests: `services/contact/tests/unit/`
- E2E: `services/contact/tests/e2e/` (hits HTTP with Supertest)
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

**Contact Service** — Nestlancer backend component documentation

</div>
