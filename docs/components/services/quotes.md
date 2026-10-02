<div align="center">

# Quotes Service

### Formal proposals with line items, payment schedule, PDF export, acceptance/decline, and templates.

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

|                       |                                                            |
| :-------------------- | :--------------------------------------------------------- |
| **Package**           | `@nestlancer/quotes-service`                               |
| **Source**            | `services/quotes/`                                         |
| **Default port**      | 3007 (env: `QUOTES_SERVICE_PORT`)                          |
| **Gateway prefix**    | `/api/v1/quotes`                                           |
| **Primary data**      | Quote, QuoteLineItem, QuotePaymentBreakdown, QuoteTemplate |
| **Detailed API spec** | [quotes endpoints](../../api/services/quotes.md)           |

---

## 🎯 What this service owns

- Admin creates/sends quotes linked to requests
- Client accepts → triggers project creation (projects service)
- Expiry, duplication, and template library

---

## 🏗 How it fits in the platform

```
Client → Gateway (/api/v1/quotes) → Quotes Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

---

## 🌐 HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/quotes`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method   | Path (service-relative)       | Controller                                   |
| :------- | :---------------------------- | :------------------------------------------- |
| `GET`    | `/admin/quotes`               | `src/controllers/quotes.admin.controller.ts` |
| `GET`    | `/admin/quotes/stats`         | `src/controllers/quotes.admin.controller.ts` |
| `GET`    | `/admin/quotes/templates`     | `src/controllers/quotes.admin.controller.ts` |
| `POST`   | `/admin/quotes/templates`     | `src/controllers/quotes.admin.controller.ts` |
| `POST`   | `/admin/quotes`               | `src/controllers/quotes.admin.controller.ts` |
| `POST`   | `/admin/quotes/:id/send`      | `src/controllers/quotes.admin.controller.ts` |
| `POST`   | `/admin/quotes/:id/resend`    | `src/controllers/quotes.admin.controller.ts` |
| `GET`    | `/admin/quotes/:id`           | `src/controllers/quotes.admin.controller.ts` |
| `PATCH`  | `/admin/quotes/:id`           | `src/controllers/quotes.admin.controller.ts` |
| `DELETE` | `/admin/quotes/:id`           | `src/controllers/quotes.admin.controller.ts` |
| `POST`   | `/admin/quotes/:id/duplicate` | `src/controllers/quotes.admin.controller.ts` |
| `POST`   | `/admin/quotes/:id/revise`    | `src/controllers/quotes.admin.controller.ts` |
| `GET`    | `/admin/quotes/:id/history`   | `src/controllers/quotes.admin.controller.ts` |
| `GET`    | `/admin/quotes/:id/pdf`       | `src/controllers/quotes.admin.controller.ts` |
| `GET`    | `/quotes/health`              | `src/controllers/quotes.controller.ts`       |
| `GET`    | `/quotes`                     | `src/controllers/quotes.controller.ts`       |
| `GET`    | `/quotes/stats`               | `src/controllers/quotes.controller.ts`       |
| `GET`    | `/quotes/:id`                 | `src/controllers/quotes.controller.ts`       |
| `POST`   | `/quotes/:id/accept`          | `src/controllers/quotes.controller.ts`       |
| `POST`   | `/quotes/:id/decline`         | `src/controllers/quotes.controller.ts`       |
| `POST`   | `/quotes/:id/request-changes` | `src/controllers/quotes.controller.ts`       |
| `GET`    | `/quotes/:id/pdf`             | `src/controllers/quotes.controller.ts`       |

For request/response examples, error codes, and rate limits, see [../../api/services/quotes.md](../../api/services/quotes.md) and [API standards](../../api/standards.md).

---

## 📎 Dependencies (`@nestlancer/*`)

- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`
- `@nestlancer/database`
- `@nestlancer/queue`
- `@nestlancer/outbox`
- `@nestlancer/cache`
- `@nestlancer/auth-lib`
- `@nestlancer/storage`

---

## 🔌 External integrations

- PDF generation
- Projects service
- Email worker

---

## 📨 Domain events (outbox)

- `quote.quote.sent` → see [event catalog](../../architecture/event-catalog.md)
- `quote.quote.accepted` → see [event catalog](../../architecture/event-catalog.md)
- `quote.quote.declined` → see [event catalog](../../architecture/event-catalog.md)

---

## ⚙️ Configuration

| Variable              | Purpose                                 |
| :-------------------- | :-------------------------------------- |
| `QUOTES_SERVICE_PORT` | HTTP port (default 3007)                |
| `DATABASE_URL`        | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL`           | Cache / rate limits where used          |
| `RABBITMQ_URL`        | Event publishing                        |

Full list: [environment variables](../../guides/environment-variables.md) and Infisical paths in [infisical.md](../../guides/infisical.md).

---

## 💻 Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/quotes-service dev

# Unit + integration tests
pnpm --filter @nestlancer/quotes-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3007/health
```

Run the full stack: `make dev` or `pnpm dev` from the monorepo root (starts infra via Docker Compose).

---

## 🧪 Testing

- Unit tests: `services/quotes/tests/unit/`
- E2E: `services/quotes/tests/e2e/` (hits HTTP with Supertest)
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

**Quotes Service** — Nestlancer backend component documentation

</div>
