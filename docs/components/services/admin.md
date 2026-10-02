<div align="center">

# Admin Service

### Operator console backend: dashboards, system config, feature flags, audit, impersonation, backups, webhook management.

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

|                       |                                                                                   |
| :-------------------- | :-------------------------------------------------------------------------------- |
| **Package**           | `@nestlancer/admin-service`                                                       |
| **Source**            | `services/admin/`                                                                 |
| **Default port**      | 3005 (env: `ADMIN_SERVICE_PORT`)                                                  |
| **Gateway prefix**    | `/api/v1/admin`                                                                   |
| **Primary data**      | SystemConfig, EmailTemplate, FeatureFlag, AuditLog, Webhook, Backup, Announcement |
| **Detailed API spec** | [admin endpoints](../../api/services/admin.md)                                    |

---

## 🎯 What this service owns

- Aggregate metrics across services (revenue, users, projects)
- Maintenance mode and cache busting
- GDPR-aware impersonation with audit trail

---

## 🏗 How it fits in the platform

```
Client → Gateway (/api/v1/admin) → Admin Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

---

## 🌐 HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/admin`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method   | Path (service-relative)               | Controller                                                  |
| :------- | :------------------------------------ | :---------------------------------------------------------- |
| `GET`    | `/health`                             | `src/controllers/admin/admin-health.admin.controller.ts`    |
| `GET`    | `/audit`                              | `src/controllers/admin/audit.admin.controller.ts`           |
| `GET`    | `/audit/stats`                        | `src/controllers/admin/audit.admin.controller.ts`           |
| `GET`    | `/audit/user/:userId`                 | `src/controllers/admin/audit.admin.controller.ts`           |
| `GET`    | `/audit/resource/:type/:id`           | `src/controllers/admin/audit.admin.controller.ts`           |
| `GET`    | `/audit/:id`                          | `src/controllers/admin/audit.admin.controller.ts`           |
| `POST`   | `/audit/export`                       | `src/controllers/admin/audit.admin.controller.ts`           |
| `GET`    | `/dashboard/overview`                 | `src/controllers/admin/dashboard.admin.controller.ts`       |
| `GET`    | `/dashboard/revenue`                  | `src/controllers/admin/dashboard.admin.controller.ts`       |
| `GET`    | `/dashboard/users`                    | `src/controllers/admin/dashboard.admin.controller.ts`       |
| `GET`    | `/dashboard/projects`                 | `src/controllers/admin/dashboard.admin.controller.ts`       |
| `GET`    | `/dashboard/performance`              | `src/controllers/admin/dashboard.admin.controller.ts`       |
| `GET`    | `/dashboard/activity`                 | `src/controllers/admin/dashboard.admin.controller.ts`       |
| `GET`    | `/dashboard/alerts`                   | `src/controllers/admin/dashboard.admin.controller.ts`       |
| `GET`    | `/system/email-templates`             | `src/controllers/admin/email-templates.admin.controller.ts` |
| `GET`    | `/system/email-templates/:id`         | `src/controllers/admin/email-templates.admin.controller.ts` |
| `PATCH`  | `/system/email-templates/:id`         | `src/controllers/admin/email-templates.admin.controller.ts` |
| `GET`    | `/system/email-templates/:id/preview` | `src/controllers/admin/email-templates.admin.controller.ts` |
| `POST`   | `/system/email-templates/:id/test`    | `src/controllers/admin/email-templates.admin.controller.ts` |
| `POST`   | `/users/:userId/impersonate`          | `src/controllers/admin/impersonation.admin.controller.ts`   |
| `POST`   | `/users/impersonate/end`              | `src/controllers/admin/impersonation.admin.controller.ts`   |
| `POST`   | `/users/impersonate/end/:sessionId`   | `src/controllers/admin/impersonation.admin.controller.ts`   |
| `GET`    | `/users/impersonate/sessions`         | `src/controllers/admin/impersonation.admin.controller.ts`   |
| `GET`    | `/system/config`                      | `src/controllers/admin/system.admin.controller.ts`          |
| `PATCH`  | `/system/config`                      | `src/controllers/admin/system.admin.controller.ts`          |
| `GET`    | `/system/features`                    | `src/controllers/admin/system.admin.controller.ts`          |
| `PATCH`  | `/system/features/:flag`              | `src/controllers/admin/system.admin.controller.ts`          |
| `POST`   | `/system/maintenance`                 | `src/controllers/admin/system.admin.controller.ts`          |
| `POST`   | `/system/cache/clear`                 | `src/controllers/admin/system.admin.controller.ts`          |
| `POST`   | `/system/cache/clear/:key`            | `src/controllers/admin/system.admin.controller.ts`          |
| `GET`    | `/system/jobs`                        | `src/controllers/admin/system.admin.controller.ts`          |
| `POST`   | `/system/jobs/:id/retry`              | `src/controllers/admin/system.admin.controller.ts`          |
| `DELETE` | `/system/jobs/:id`                    | `src/controllers/admin/system.admin.controller.ts`          |
| `GET`    | `/system/logs`                        | `src/controllers/admin/system.admin.controller.ts`          |
| `GET`    | `/system/logs/download`               | `src/controllers/admin/system.admin.controller.ts`          |
| `POST`   | `/system/announcements`               | `src/controllers/admin/system.admin.controller.ts`          |
| `GET`    | `/webhooks`                           | `src/controllers/admin/webhooks.admin.controller.ts`        |
| `POST`   | `/webhooks`                           | `src/controllers/admin/webhooks.admin.controller.ts`        |
| `GET`    | `/webhooks/health`                    | `src/controllers/admin/webhooks.admin.controller.ts`        |
| `GET`    | `/webhooks/events`                    | `src/controllers/admin/webhooks.admin.controller.ts`        |
| …        | _10 more routes — see OpenAPI_        |                                                             |

For request/response examples, error codes, and rate limits, see [../../api/services/admin.md](../../api/services/admin.md) and [API standards](../../api/standards.md).

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
- `@nestlancer/storage`
- `@nestlancer/auth-lib`

---

## 🔌 External integrations

- All domain services via gateway proxy
- Redis cache flush

---

## 📨 Domain events (outbox)

_This service may consume events but does not publish primary domain events — check code for outbox writes._

---

## ⚙️ Configuration

| Variable             | Purpose                                 |
| :------------------- | :-------------------------------------- |
| `ADMIN_SERVICE_PORT` | HTTP port (default 3005)                |
| `DATABASE_URL`       | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL`          | Cache / rate limits where used          |
| `RABBITMQ_URL`       | Event publishing                        |

Full list: [environment variables](../../guides/environment-variables.md) and Infisical paths in [infisical.md](../../guides/infisical.md).

---

## 💻 Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/admin-service dev

# Unit + integration tests
pnpm --filter @nestlancer/admin-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3005/health
```

Run the full stack: `make dev` or `pnpm dev` from the monorepo root (starts infra via Docker Compose).

---

## 🧪 Testing

- Unit tests: `services/admin/tests/unit/`
- E2E: `services/admin/tests/e2e/` (hits HTTP with Supertest)
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

**Admin Service** — Nestlancer backend component documentation

</div>
