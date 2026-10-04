# Payments Service

Razorpay checkout in INR (amounts in paise), milestones, invoices/receipts PDF, refunds, disputes, and admin reconciliation.

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/payments-service` |
| **Source** | `services/payments/` |
| **Default port** | 3003 (env: `PAYMENTS_SERVICE_PORT`) |
| **Gateway prefix** | `/api/v1/payments` |
| **Primary data** | Payment, PaymentIntent, PaymentMethod, PaymentMilestone, PaymentDispute, Refund |
| **Detailed API spec** | [payments endpoints](../../api/services/payments.md) |

## What this service owns

- Create/confirm payment intents with idempotency keys
- Webhook handling for payment.captured / failed (also via webhooks service)
- Admin refunds, revenue reports, milestone scheduling tied to projects

## How it fits in the platform

```
Client → Gateway (/api/v1/payments) → Payments Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

## HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/payments`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method | Path (service-relative) | Controller |
| ------ | ------------------------ | ---------- |
| `GET` | `/admin/payments/company-legal` | `src/controllers/admin/company-legal-profile.admin.controller.ts` |
| `POST` | `/admin/payments/company-legal` | `src/controllers/admin/company-legal-profile.admin.controller.ts` |
| `PATCH` | `/admin/payments/company-legal/:id` | `src/controllers/admin/company-legal-profile.admin.controller.ts` |
| `DELETE` | `/admin/payments/company-legal/:id` | `src/controllers/admin/company-legal-profile.admin.controller.ts` |
| `GET` | `/admin/payments/disputes` | `src/controllers/admin/payment-disputes.admin.controller.ts` |
| `GET` | `/admin/payments/disputes/:id` | `src/controllers/admin/payment-disputes.admin.controller.ts` |
| `POST` | `/admin/payments/disputes/:id/resolve` | `src/controllers/admin/payment-disputes.admin.controller.ts` |
| `PATCH` | `/admin/payments/disputes/:id` | `src/controllers/admin/payment-disputes.admin.controller.ts` |
| `POST` | `/admin/payments/disputes/:id/respond` | `src/controllers/admin/payment-disputes.admin.controller.ts` |
| `POST` | `/admin/payments/reconcile` | `src/controllers/admin/payment-disputes.admin.controller.ts` |
| `GET` | `/admin/milestones/:id/payments` | `src/controllers/admin/payment-milestones.admin.controller.ts` |
| `POST` | `/admin/milestones/:id/mark-complete` | `src/controllers/admin/payment-milestones.admin.controller.ts` |
| `POST` | `/admin/milestones/:id/request-payment` | `src/controllers/admin/payment-milestones.admin.controller.ts` |
| `GET` | `/admin/payments` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/stats` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/summary` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/reconciliation` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/milestones` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/milestones/:id` | `src/controllers/admin/payments.admin.controller.ts` |
| `PATCH` | `/admin/payments/milestones/:id` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/revenue/report` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/revenue/export` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/:id/documents/versions` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/:id/receipt` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/:id/invoice` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/:id` | `src/controllers/admin/payments.admin.controller.ts` |
| `POST` | `/admin/payments/:id/refund` | `src/controllers/admin/payments.admin.controller.ts` |
| `POST` | `/admin/payments/:id/cancel` | `src/controllers/admin/payments.admin.controller.ts` |
| `POST` | `/admin/payments/:id/verify` | `src/controllers/admin/payments.admin.controller.ts` |
| `POST` | `/admin/payments/projects/:projectId/reconcile-state` | `src/controllers/admin/payments.admin.controller.ts` |
| `POST` | `/admin/payments/manual` | `src/controllers/admin/payments.admin.controller.ts` |
| `POST` | `/admin/payments/:id/manual-payment` | `src/controllers/admin/payments.admin.controller.ts` |
| `POST` | `/admin/payments/milestones/:id/release` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/:id/transactions` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/:id/timeline` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/methods/supported` | `src/controllers/admin/payments.admin.controller.ts` |
| `POST` | `/admin/payments/:id/approve-transfer` | `src/controllers/admin/payments.admin.controller.ts` |
| `POST` | `/admin/payments/:id/reject-transfer` | `src/controllers/admin/payments.admin.controller.ts` |
| `PATCH` | `/admin/payments/settings` | `src/controllers/admin/payments.admin.controller.ts` |
| `GET` | `/admin/payments/accounts` | `src/controllers/admin/platform-payment-accounts.admin.controller.ts` |
| … | _29 more routes — see OpenAPI_ | |

For request/response examples, error codes, and rate limits, see [../../api/services/payments.md](../../api/services/payments.md) and [API standards](../../api/standards.md).

## Dependencies (`@nestlancer/*`)

- `@nestlancer/auth-lib`
- `@nestlancer/cache`
- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/outbox`
- `@nestlancer/pdf`
- `@nestlancer/documents`
- `@nestlancer/queue`
- `@nestlancer/storage`
- `@nestlancer/testing`
- `@nestlancer/tracing`

## External integrations

- Razorpay API
- PDF lib
- Outbox → email-worker

## Domain events (outbox)

- `payment.payment.completed` → see [event catalog](../../architecture/event-catalog.md)
- `payment.payment.failed` → see [event catalog](../../architecture/event-catalog.md)
- `payment.payment.refunded` → see [event catalog](../../architecture/event-catalog.md)

## Configuration

| Variable | Purpose |
| -------- | ------- |
| `PAYMENTS_SERVICE_PORT` | HTTP port (default 3003) |
| `DATABASE_URL` | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL` | Cache / rate limits where used |
| `RABBITMQ_URL` | Event publishing |

Full list: [environment variables](../../reference/environment-variables.md) and Infisical paths in [secrets-infisical.md](../../operations/secrets-infisical.md).

## Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/payments-service dev

# Unit + integration tests
pnpm --filter @nestlancer/payments-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3003/health
```

Run the full stack: `make dev` or `pnpm docker:up && pnpm dev` from the monorepo root (PostgreSQL/Redis/RabbitMQ come from the shared dev VPS via Infisical — see [Local workflow](../../development/local-workflow.md)).

## Testing

- Unit tests: `services/payments/tests/unit/`
- E2E: `services/payments/tests/e2e/` (hits HTTP with Supertest)
- Cross-service flows: [testing strategy](../../development/testing.md), [test commands](../../development/test-commands.md)

## Operations

- Health: included in gateway `GET /api/v1/health` aggregation
- Logs: JSON with `X-Correlation-ID` from gateway
- Metrics: Prometheus scrape via `@nestlancer/metrics`

## Related documentation

- [System architecture](../../architecture/overview.md)
- [Database schema](../../architecture/database-schema.md)
- [Adding a new service](../../development/adding-a-service.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)
