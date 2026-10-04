# Requests Service

Client project inquiries from draft through admin review before a quote is issued.

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/requests-service` |
| **Source** | `services/requests/` |
| **Default port** | 3006 (env: `REQUESTS_SERVICE_PORT`) |
| **Gateway prefix** | `/api/v1/requests` |
| **Primary data** | ServiceRequest, RequestAttachment, RequestNote, RequestStatusHistory |
| **Detailed API spec** | [requests endpoints](../../api/services/requests.md) |

## What this service owns

- CRUD for client requests with category and attachments
- Status workflow: draft → submitted → in_review → quoted/closed
- Admin notes and internal status changes

## How it fits in the platform

```
Client → Gateway (/api/v1/requests) → Requests Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

## HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/requests`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method | Path (service-relative) | Controller |
| ------ | ------------------------ | ---------- |
| `GET` | `/admin/requests` | `src/controllers/requests.admin.controller.ts` |
| `GET` | `/admin/requests/stats` | `src/controllers/requests.admin.controller.ts` |
| `GET` | `/admin/requests/capacity/dashboard` | `src/controllers/requests.admin.controller.ts` |
| `PATCH` | `/admin/requests/settings/capacity` | `src/controllers/requests.admin.controller.ts` |
| `GET` | `/admin/requests/:id` | `src/controllers/requests.admin.controller.ts` |
| `PATCH` | `/admin/requests/:id/status` | `src/controllers/requests.admin.controller.ts` |
| `POST` | `/admin/requests/:id/quotes` | `src/controllers/requests.admin.controller.ts` |
| `POST` | `/admin/requests/:id/quotes/prefill` | `src/controllers/requests.admin.controller.ts` |
| `POST` | `/admin/requests/:id/notes` | `src/controllers/requests.admin.controller.ts` |
| `GET` | `/admin/requests/:id/notes` | `src/controllers/requests.admin.controller.ts` |
| `PATCH` | `/admin/requests/:id` | `src/controllers/requests.admin.controller.ts` |
| `POST` | `/admin/requests/:id/assign` | `src/controllers/requests.admin.controller.ts` |
| `DELETE` | `/admin/requests/:id` | `src/controllers/requests.admin.controller.ts` |
| `GET` | `/admin/requests/:id/attachments/:attachmentId/download` | `src/controllers/requests.admin.controller.ts` |
| `GET` | `/requests/health` | `src/controllers/requests.controller.ts` |
| `POST` | `/requests` | `src/controllers/requests.controller.ts` |
| `GET` | `/requests` | `src/controllers/requests.controller.ts` |
| `GET` | `/requests/stats` | `src/controllers/requests.controller.ts` |
| `GET` | `/requests/:id/status` | `src/controllers/requests.controller.ts` |
| `GET` | `/requests/:id` | `src/controllers/requests.controller.ts` |
| `PATCH` | `/requests/:id` | `src/controllers/requests.controller.ts` |
| `POST` | `/requests/:id/submit` | `src/controllers/requests.controller.ts` |
| `DELETE` | `/requests/:id` | `src/controllers/requests.controller.ts` |
| `GET` | `/requests/:id/attachments` | `src/controllers/requests.controller.ts` |
| `POST` | `/requests/:id/attachments` | `src/controllers/requests.controller.ts` |
| `DELETE` | `/requests/:id/attachments/:attachmentId` | `src/controllers/requests.controller.ts` |
| `GET` | `/requests/:id/attachments/:attachmentId/download` | `src/controllers/requests.controller.ts` |
| `GET` | `/requests/:id/quotes` | `src/controllers/requests.controller.ts` |
| `GET` | `/admin/service-packages` | `src/controllers/service-packages.admin.controller.ts` |
| `POST` | `/admin/service-packages` | `src/controllers/service-packages.admin.controller.ts` |
| `PATCH` | `/admin/service-packages/:id` | `src/controllers/service-packages.admin.controller.ts` |
| `GET` | `/services` | `src/controllers/services.public.controller.ts` |
| `GET` | `/services/:slug` | `src/controllers/services.public.controller.ts` |

For request/response examples, error codes, and rate limits, see [../../api/services/requests.md](../../api/services/requests.md) and [API standards](../../api/standards.md).

## Dependencies (`@nestlancer/*`)

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

## External integrations

- Media (attachments)
- Notifications

## Domain events (outbox)

- `request.request.submitted` → see [event catalog](../../architecture/event-catalog.md)
- `request.status.changed` → see [event catalog](../../architecture/event-catalog.md)

## Configuration

| Variable | Purpose |
| -------- | ------- |
| `REQUESTS_SERVICE_PORT` | HTTP port (default 3006) |
| `DATABASE_URL` | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL` | Cache / rate limits where used |
| `RABBITMQ_URL` | Event publishing |

Full list: [environment variables](../../reference/environment-variables.md) and Infisical paths in [secrets-infisical.md](../../operations/secrets-infisical.md).

## Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/requests-service dev

# Unit + integration tests
pnpm --filter @nestlancer/requests-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3006/health
```

Run the full stack: `make dev` or `pnpm docker:up && pnpm dev` from the monorepo root (PostgreSQL/Redis/RabbitMQ come from the shared dev VPS via Infisical — see [Local workflow](../../development/local-workflow.md)).

## Testing

- Unit tests: `services/requests/tests/unit/`
- E2E: `services/requests/tests/e2e/` (hits HTTP with Supertest)
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
