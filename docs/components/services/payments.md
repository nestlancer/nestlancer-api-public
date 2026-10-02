<div align="center">

# Payments Service

### Razorpay checkout in INR (amounts in paise), milestones, invoices/receipts PDF, refunds, disputes, and admin reconciliation.

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

|                       |                                                                                 |
| :-------------------- | :------------------------------------------------------------------------------ |
| **Package**           | `@nestlancer/payments-service`                                                  |
| **Source**            | `services/payments/`                                                            |
| **Default port**      | 3003 (env: `PAYMENTS_SERVICE_PORT`)                                             |
| **Gateway prefix**    | `/api/v1/payments`                                                              |
| **Primary data**      | Payment, PaymentIntent, PaymentMethod, PaymentMilestone, PaymentDispute, Refund |
| **Detailed API spec** | [payments endpoints](../../api/services/payments.md)                            |

---

## 🎯 What this service owns

- Create/confirm payment intents with idempotency keys
- Webhook handling for payment.captured / failed (also via webhooks service)
- Admin refunds, revenue reports, milestone scheduling tied to projects

---

## 🏗 How it fits in the platform

```
Client → Gateway (/api/v1/payments) → Payments Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

---

## 🌐 HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/payments`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method   | Path (service-relative)                  | Controller                                                     |
| :------- | :--------------------------------------- | :------------------------------------------------------------- |
| `GET`    | `/admin/payments/disputes`               | `src/controllers/admin/payment-disputes.admin.controller.ts`   |
| `GET`    | `/admin/payments/disputes/:id`           | `src/controllers/admin/payment-disputes.admin.controller.ts`   |
| `POST`   | `/admin/payments/disputes/:id/resolve`   | `src/controllers/admin/payment-disputes.admin.controller.ts`   |
| `PATCH`  | `/admin/payments/disputes/:id`           | `src/controllers/admin/payment-disputes.admin.controller.ts`   |
| `POST`   | `/admin/payments/disputes/:id/respond`   | `src/controllers/admin/payment-disputes.admin.controller.ts`   |
| `POST`   | `/admin/payments/reconcile`              | `src/controllers/admin/payment-disputes.admin.controller.ts`   |
| `GET`    | `/admin/milestones/:id/payments`         | `src/controllers/admin/payment-milestones.admin.controller.ts` |
| `POST`   | `/admin/milestones/:id/mark-complete`    | `src/controllers/admin/payment-milestones.admin.controller.ts` |
| `POST`   | `/admin/milestones/:id/request-payment`  | `src/controllers/admin/payment-milestones.admin.controller.ts` |
| `GET`    | `/admin/payments`                        | `src/controllers/admin/payments.admin.controller.ts`           |
| `GET`    | `/admin/payments/stats`                  | `src/controllers/admin/payments.admin.controller.ts`           |
| `GET`    | `/admin/payments/reconciliation`         | `src/controllers/admin/payments.admin.controller.ts`           |
| `GET`    | `/admin/payments/milestones`             | `src/controllers/admin/payments.admin.controller.ts`           |
| `GET`    | `/admin/payments/milestones/:id`         | `src/controllers/admin/payments.admin.controller.ts`           |
| `PATCH`  | `/admin/payments/milestones/:id`         | `src/controllers/admin/payments.admin.controller.ts`           |
| `GET`    | `/admin/payments/revenue/report`         | `src/controllers/admin/payments.admin.controller.ts`           |
| `GET`    | `/admin/payments/revenue/export`         | `src/controllers/admin/payments.admin.controller.ts`           |
| `GET`    | `/admin/payments/:id`                    | `src/controllers/admin/payments.admin.controller.ts`           |
| `POST`   | `/admin/payments/:id/refund`             | `src/controllers/admin/payments.admin.controller.ts`           |
| `POST`   | `/admin/payments/:id/verify`             | `src/controllers/admin/payments.admin.controller.ts`           |
| `POST`   | `/admin/payments/manual`                 | `src/controllers/admin/payments.admin.controller.ts`           |
| `POST`   | `/admin/payments/milestones/:id/release` | `src/controllers/admin/payments.admin.controller.ts`           |
| `GET`    | `/admin/payments/:id/transactions`       | `src/controllers/admin/payments.admin.controller.ts`           |
| `GET`    | `/admin/payments/:id/timeline`           | `src/controllers/admin/payments.admin.controller.ts`           |
| `GET`    | `/admin/payments/methods/supported`      | `src/controllers/admin/payments.admin.controller.ts`           |
| `PATCH`  | `/admin/payments/settings`               | `src/controllers/admin/payments.admin.controller.ts`           |
| `GET`    | `/invoices`                              | `src/controllers/user/invoices.controller.ts`                  |
| `GET`    | `/invoices/:id`                          | `src/controllers/user/invoices.controller.ts`                  |
| `GET`    | `/invoices/:id/download`                 | `src/controllers/user/invoices.controller.ts`                  |
| `GET`    | `/payments/methods`                      | `src/controllers/user/payment-methods.controller.ts`           |
| `POST`   | `/payments/methods`                      | `src/controllers/user/payment-methods.controller.ts`           |
| `DELETE` | `/payments/methods/:id`                  | `src/controllers/user/payment-methods.controller.ts`           |
| `PATCH`  | `/payments/methods/:id/default`          | `src/controllers/user/payment-methods.controller.ts`           |
| `PATCH`  | `/payments/methods/:id/nickname`         | `src/controllers/user/payment-methods.controller.ts`           |
| `GET`    | `/payments/health`                       | `src/controllers/user/payments.controller.ts`                  |
| `POST`   | `/payments/create-intent`                | `src/controllers/user/payments.controller.ts`                  |
| `POST`   | `/payments/initiate`                     | `src/controllers/user/payments.controller.ts`                  |
| `POST`   | `/payments/confirm`                      | `src/controllers/user/payments.controller.ts`                  |
| `GET`    | `/payments`                              | `src/controllers/user/payments.controller.ts`                  |
| `GET`    | `/payments/projects/:projectId`          | `src/controllers/user/payments.controller.ts`                  |
| …        | _9 more routes — see OpenAPI_            |                                                                |

For request/response examples, error codes, and rate limits, see [../../api/services/payments.md](../../api/services/payments.md) and [API standards](../../api/standards.md).

---

## 📎 Dependencies (`@nestlancer/*`)

- `@nestlancer/auth-lib`
- `@nestlancer/cache`
- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/outbox`
- `@nestlancer/pdf`
- `@nestlancer/queue`
- `@nestlancer/storage`
- `@nestlancer/testing`
- `@nestlancer/tracing`

---

## 🔌 External integrations

- Razorpay API
- PDF lib
- Outbox → email-worker

---

## 📨 Domain events (outbox)

- `payment.payment.completed` → see [event catalog](../../architecture/event-catalog.md)
- `payment.payment.failed` → see [event catalog](../../architecture/event-catalog.md)
- `payment.payment.refunded` → see [event catalog](../../architecture/event-catalog.md)

---

## ⚙️ Configuration

| Variable                | Purpose                                 |
| :---------------------- | :-------------------------------------- |
| `PAYMENTS_SERVICE_PORT` | HTTP port (default 3003)                |
| `DATABASE_URL`          | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL`             | Cache / rate limits where used          |
| `RABBITMQ_URL`          | Event publishing                        |

Full list: [environment variables](../../guides/environment-variables.md) and Infisical paths in [infisical.md](../../guides/infisical.md).

---

## 💻 Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/payments-service dev

# Unit + integration tests
pnpm --filter @nestlancer/payments-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3003/health
```

Run the full stack: `make dev` or `pnpm dev` from the monorepo root (starts infra via Docker Compose).

---

## 🧪 Testing

- Unit tests: `services/payments/tests/unit/`
- E2E: `services/payments/tests/e2e/` (hits HTTP with Supertest)
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

**Payments Service** — Nestlancer backend component documentation

</div>
