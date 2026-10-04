# Media Service

Upload pipeline: presigned URLs, chunked uploads, virus scan, versions, public share links.

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/media-service` |
| **Source** | `services/media/` |
| **Default port** | 3012 (env: `MEDIA_SERVICE_PORT`) |
| **Gateway prefix** | `/api/v1/media` |
| **Primary data** | Media, MediaVersion, MediaShareLink, ChunkedUploadSession, QuarantinedFile |
| **Detailed API spec** | [media endpoints](../../api/services/media.md) |

## What this service owns

- Direct and multipart upload to B2/S3 private bucket
- Enqueue media-worker for resize/thumbnail/transcode
- Quarantine infected files; admin release/delete

## How it fits in the platform

```
Client → Gateway (/api/v1/media) → Media Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

## HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/media`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

_Route list: use gateway OpenAPI (`/docs-all-json`) — controllers may live under `src/modules/`._

For request/response examples, error codes, and rate limits, see [../../api/services/media.md](../../api/services/media.md) and [API standards](../../api/standards.md).

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
- `@nestlancer/crypto`
- `@nestlancer/storage`

## External integrations

- B2/S3
- media-worker
- cdn-worker

## Domain events (outbox)

- `media.media.uploaded` → see [event catalog](../../architecture/event-catalog.md)
- `media.media.processed` → see [event catalog](../../architecture/event-catalog.md)

## Configuration

| Variable | Purpose |
| -------- | ------- |
| `MEDIA_SERVICE_PORT` | HTTP port (default 3012) |
| `DATABASE_URL` | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL` | Cache / rate limits where used |
| `RABBITMQ_URL` | Event publishing |

Full list: [environment variables](../../reference/environment-variables.md) and Infisical paths in [secrets-infisical.md](../../operations/secrets-infisical.md).

## Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/media-service dev

# Unit + integration tests
pnpm --filter @nestlancer/media-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3012/health
```

Run the full stack: `make dev` or `pnpm docker:up && pnpm dev` from the monorepo root (PostgreSQL/Redis/RabbitMQ come from the shared dev VPS via Infisical — see [Local workflow](../../development/local-workflow.md)).

## Testing

- Unit tests: `services/media/tests/unit/`
- E2E: `services/media/tests/e2e/` (hits HTTP with Supertest)
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
