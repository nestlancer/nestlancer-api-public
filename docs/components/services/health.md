# Health Service

Operational health for Kubernetes probes, admin diagnostics, and dependency status (PostgreSQL, Redis, RabbitMQ, S3, workers, WebSocket).

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/health-service` |
| **Source** | `services/health/` |
| **Default port** | 3016 (env: `HEALTH_SERVICE_PORT`) |
| **Gateway prefix** | `/api/v1/health` |
| **Primary data** | System health aggregates — no primary business tables |
| **Detailed API spec** | [health endpoints](../../api/services/health.md) |

## What this service owns

- Liveness/readiness endpoints for orchestration
- Deep dependency checks with structured JSON for Grafana/Alertmanager
- Admin-only debug: feature flags, worker registry, system metrics

## How it fits in the platform

```
Client → Gateway (/api/v1/health) → Health Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

## HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/health`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method | Path (service-relative) | Controller |
| ------ | ------------------------ | ---------- |
| `GET` | `/debug` | `src/controllers/admin/health-debug.admin.controller.ts` |
| `GET` | `/` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/detailed` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/ready` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/live` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/ping` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/database` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/cache` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/queue` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/storage` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/microservices` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/external` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/workers` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/websocket` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/system` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/features` | `src/controllers/public/health.public.controller.ts` |
| `GET` | `/registry` | `src/controllers/public/health.public.controller.ts` |

For request/response examples, error codes, and rate limits, see [../../api/services/health.md](../../api/services/health.md) and [API standards](../../api/standards.md).

## Dependencies (`@nestlancer/*`)

- `@nestlancer/auth-lib`
- `@nestlancer/cache`
- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/health-lib`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/storage`
- `@nestlancer/tracing`

## External integrations

- PostgreSQL
- Redis
- RabbitMQ
- S3/B2
- SMTP
- external APIs

## Domain events (outbox)

_This service may consume events but does not publish primary domain events — check code for outbox writes._

## Configuration

| Variable | Purpose |
| -------- | ------- |
| `HEALTH_SERVICE_PORT` | HTTP port (default 3016) |
| `DATABASE_URL` | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL` | Cache / rate limits where used |
| `RABBITMQ_URL` | Event publishing |

Full list: [environment variables](../../reference/environment-variables.md) and Infisical paths in [secrets-infisical.md](../../operations/secrets-infisical.md).

## Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/health-service dev

# Unit + integration tests
pnpm --filter @nestlancer/health-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3016/health
```

Run the full stack: `make dev` or `pnpm docker:up && pnpm dev` from the monorepo root (PostgreSQL/Redis/RabbitMQ come from the shared dev VPS via Infisical — see [Local workflow](../../development/local-workflow.md)).

## Testing

- Unit tests: `services/health/tests/unit/`
- E2E: `services/health/tests/e2e/` (hits HTTP with Supertest)
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
