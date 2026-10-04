# Portfolio Service

Public case studies and work samples with categories, search, analytics, and admin ordering.

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/portfolio-service` |
| **Source** | `services/portfolio/` |
| **Default port** | 3013 (env: `PORTFOLIO_SERVICE_PORT`) |
| **Gateway prefix** | `/api/v1/portfolio` |
| **Primary data** | PortfolioItem, PortfolioCategory, PortfolioTag, PortfolioLike |
| **Detailed API spec** | [portfolio endpoints](../../api/services/portfolio.md) |

## What this service owns

- Public listing/detail with view analytics
- Admin CRUD, privacy, featured ordering
- Timeline endpoint for project history display

## How it fits in the platform

```
Client → Gateway (/api/v1/portfolio) → Portfolio Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

## HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/portfolio`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method | Path (service-relative) | Controller |
| ------ | ------------------------ | ---------- |
| `GET` | `/admin/portfolio/categories` | `src/controllers/admin/portfolio-categories.admin.controller.ts` |
| `POST` | `/admin/portfolio/categories` | `src/controllers/admin/portfolio-categories.admin.controller.ts` |
| `PATCH` | `/admin/portfolio/categories/:id` | `src/controllers/admin/portfolio-categories.admin.controller.ts` |
| `DELETE` | `/admin/portfolio/categories/:id` | `src/controllers/admin/portfolio-categories.admin.controller.ts` |
| `GET` | `/admin/portfolio` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `POST` | `/admin/portfolio` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `POST` | `/admin/portfolio/reorder` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `POST` | `/admin/portfolio/bulk-update` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `GET` | `/admin/portfolio/analytics` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `GET` | `/admin/portfolio/analytics/:id` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `GET` | `/admin/portfolio/:id` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `PATCH` | `/admin/portfolio/:id` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `DELETE` | `/admin/portfolio/:id` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `POST` | `/admin/portfolio/:id/publish` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `POST` | `/admin/portfolio/:id/unpublish` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `POST` | `/admin/portfolio/:id/archive` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `POST` | `/admin/portfolio/:id/toggle-featured` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `PATCH` | `/admin/portfolio/:id/privacy` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `POST` | `/admin/portfolio/:id/duplicate` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `GET` | `/admin/portfolio/:id/media` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `POST` | `/admin/portfolio/:id/media/upload` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `POST` | `/admin/portfolio/:id/media` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `DELETE` | `/admin/portfolio/:id/media/:mediaId` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `POST` | `/admin/portfolio/:id/media/:mediaId/thumbnail` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `POST` | `/admin/portfolio/:id/media/:mediaId/featured-video` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `PATCH` | `/admin/portfolio/:id/media/reorder` | `src/controllers/admin/portfolio.admin.controller.ts` |
| `GET` | `/portfolio` | `src/controllers/public/portfolio.public.controller.ts` |
| `GET` | `/portfolio/featured` | `src/controllers/public/portfolio.public.controller.ts` |
| `GET` | `/portfolio/categories` | `src/controllers/public/portfolio.public.controller.ts` |
| `GET` | `/portfolio/tags` | `src/controllers/public/portfolio.public.controller.ts` |
| `GET` | `/portfolio/search` | `src/controllers/public/portfolio.public.controller.ts` |
| `GET` | `/portfolio/health` | `src/controllers/public/portfolio.public.controller.ts` |
| `GET` | `/portfolio/timeline` | `src/controllers/public/portfolio.public.controller.ts` |
| `GET` | `/portfolio/:idOrSlug` | `src/controllers/public/portfolio.public.controller.ts` |
| `POST` | `/portfolio/:idOrSlug/view` | `src/controllers/public/portfolio.public.controller.ts` |
| `POST` | `/portfolio/:idOrSlug/like` | `src/controllers/public/portfolio.public.controller.ts` |

For request/response examples, error codes, and rate limits, see [../../api/services/portfolio.md](../../api/services/portfolio.md) and [API standards](../../api/standards.md).

## Dependencies (`@nestlancer/*`)

- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`
- `@nestlancer/database`
- `@nestlancer/cache`
- `@nestlancer/auth-lib`
- `@nestlancer/search`
- `@nestlancer/storage`
- `@nestlancer/testing`

## External integrations

- Media
- analytics-worker

## Domain events (outbox)

_This service may consume events but does not publish primary domain events — check code for outbox writes._

## Configuration

| Variable | Purpose |
| -------- | ------- |
| `PORTFOLIO_SERVICE_PORT` | HTTP port (default 3013) |
| `DATABASE_URL` | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL` | Cache / rate limits where used |
| `RABBITMQ_URL` | Event publishing |

Full list: [environment variables](../../reference/environment-variables.md) and Infisical paths in [secrets-infisical.md](../../operations/secrets-infisical.md).

## Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/portfolio-service dev

# Unit + integration tests
pnpm --filter @nestlancer/portfolio-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3013/health
```

Run the full stack: `make dev` or `pnpm docker:up && pnpm dev` from the monorepo root (PostgreSQL/Redis/RabbitMQ come from the shared dev VPS via Infisical — see [Local workflow](../../development/local-workflow.md)).

## Testing

- Unit tests: `services/portfolio/tests/unit/`
- E2E: `services/portfolio/tests/e2e/` (hits HTTP with Supertest)
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
