# Users Service

Profile, preferences, avatar, sessions, 2FA settings, GDPR export, and admin user lifecycle.

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/users-service` |
| **Source** | `services/users/` |
| **Default port** | 3002 (env: `USERS_SERVICE_PORT`) |
| **Gateway prefix** | `/api/v1/users` |
| **Primary data** | User, UserPreferences, UserSession, UserActivity |
| **Detailed API spec** | [users endpoints](../../api/services/users.md) |

## What this service owns

- Self-service profile and security settings
- Session list/revoke and activity log
- Admin: search users, change role/status, bulk ops, password reset, data export

## How it fits in the platform

```
Client → Gateway (/api/v1/users) → Users Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

## HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/users`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method | Path (service-relative) | Controller |
| ------ | ------------------------ | ---------- |
| `GET` | `/admin/logs` | `src/controllers/audit-logs.admin.controller.ts` |
| `GET` | `/admin/logs/security-stats` | `src/controllers/audit-logs.admin.controller.ts` |
| `GET` | `/admin/users` | `src/controllers/users.admin.controller.ts` |
| `GET` | `/admin/users/search` | `src/controllers/users.admin.controller.ts` |
| `GET` | `/admin/users/security-stats` | `src/controllers/users.admin.controller.ts` |
| `POST` | `/admin/users/bulk` | `src/controllers/users.admin.controller.ts` |
| `DELETE` | `/admin/users/sessions/:sessionId` | `src/controllers/users.admin.controller.ts` |
| `GET` | `/admin/users/:userId` | `src/controllers/users.admin.controller.ts` |
| `GET` | `/admin/users/logs` | `src/controllers/users.admin.controller.ts` |
| `GET` | `/admin/users/logs/security-stats` | `src/controllers/users.admin.controller.ts` |
| `GET` | `/admin/users/:userId` | `src/controllers/users.admin.controller.ts` |
| `PATCH` | `/admin/users/:userId` | `src/controllers/users.admin.controller.ts` |
| `PATCH` | `/admin/users/:userId/role` | `src/controllers/users.admin.controller.ts` |
| `PATCH` | `/admin/users/:userId/status` | `src/controllers/users.admin.controller.ts` |
| `POST` | `/admin/users/:userId/force-password-reset` | `src/controllers/users.admin.controller.ts` |
| `POST` | `/admin/users/:userId/reset-password` | `src/controllers/users.admin.controller.ts` |
| `GET` | `/admin/users/:userId/sessions` | `src/controllers/users.admin.controller.ts` |
| `POST` | `/admin/users/:userId/terminate-all-sessions` | `src/controllers/users.admin.controller.ts` |
| `POST` | `/admin/users/:userId/export` | `src/controllers/users.admin.controller.ts` |
| `GET` | `/admin/users/:userId/activity` | `src/controllers/users.admin.controller.ts` |
| `DELETE` | `/admin/users/:userId` | `src/controllers/users.admin.controller.ts` |
| `POST` | `/admin/users/:userId/restore` | `src/controllers/users.admin.controller.ts` |
| `GET` | `/users/health` | `src/controllers/users.controller.ts` |
| `GET` | `/users/profile` | `src/controllers/users.controller.ts` |
| `PATCH` | `/users/profile` | `src/controllers/users.controller.ts` |
| `POST` | `/users/avatar` | `src/controllers/users.controller.ts` |
| `DELETE` | `/users/avatar` | `src/controllers/users.controller.ts` |
| `GET` | `/users/preferences` | `src/controllers/users.controller.ts` |
| `PATCH` | `/users/preferences` | `src/controllers/users.controller.ts` |
| `PATCH` | `/users/password` | `src/controllers/users.controller.ts` |
| `POST` | `/users/change-password` | `src/controllers/users.controller.ts` |
| `POST` | `/users/2fa/enable` | `src/controllers/users.controller.ts` |
| `POST` | `/users/2fa/verify` | `src/controllers/users.controller.ts` |
| `POST` | `/users/2fa/disable` | `src/controllers/users.controller.ts` |
| `GET` | `/users/2fa/status` | `src/controllers/users.controller.ts` |
| `GET` | `/users/2fa/backup-codes` | `src/controllers/users.controller.ts` |
| `POST` | `/users/2fa/regenerate-codes` | `src/controllers/users.controller.ts` |
| `GET` | `/users/sessions` | `src/controllers/users.controller.ts` |
| `GET` | `/users/sessions/:sessionId` | `src/controllers/users.controller.ts` |
| `DELETE` | `/users/sessions/:sessionId` | `src/controllers/users.controller.ts` |
| … | _7 more routes — see OpenAPI_ | |

For request/response examples, error codes, and rate limits, see [../../api/services/users.md](../../api/services/users.md) and [API standards](../../api/standards.md).

## Dependencies (`@nestlancer/*`)

- `@nestlancer/auth-lib`
- `@nestlancer/audit`
- `@nestlancer/cache`
- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/outbox`
- `@nestlancer/queue`
- `@nestlancer/storage`
- `@nestlancer/tracing`
- `@nestlancer/documents`

## External integrations

- Media service (avatars)
- S3 presigned uploads

## Domain events (outbox)

- `user.profile.updated` → see [event catalog](../../architecture/event-catalog.md)
- `user.account.suspended` → see [event catalog](../../architecture/event-catalog.md)
- `user.account.deleted` → see [event catalog](../../architecture/event-catalog.md)

## Configuration

| Variable | Purpose |
| -------- | ------- |
| `USERS_SERVICE_PORT` | HTTP port (default 3002) |
| `DATABASE_URL` | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL` | Cache / rate limits where used |
| `RABBITMQ_URL` | Event publishing |

Full list: [environment variables](../../reference/environment-variables.md) and Infisical paths in [secrets-infisical.md](../../operations/secrets-infisical.md).

## Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/users-service dev

# Unit + integration tests
pnpm --filter @nestlancer/users-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3002/health
```

Run the full stack: `make dev` or `pnpm docker:up && pnpm dev` from the monorepo root (PostgreSQL/Redis/RabbitMQ come from the shared dev VPS via Infisical — see [Local workflow](../../development/local-workflow.md)).

## Testing

- Unit tests: `services/users/tests/unit/`
- E2E: `services/users/tests/e2e/` (hits HTTP with Supertest)
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
