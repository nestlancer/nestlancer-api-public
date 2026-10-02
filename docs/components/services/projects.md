<div align="center">

# Projects Service

### Active engagement after quote acceptance: status, feedback, messages, public showcase.

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

|                       |                                                           |
| :-------------------- | :-------------------------------------------------------- |
| **Package**           | `@nestlancer/projects-service`                            |
| **Source**            | `services/projects/`                                      |
| **Default port**      | 3008 (env: `PROJECTS_SERVICE_PORT`)                       |
| **Gateway prefix**    | `/api/v1/projects`                                        |
| **Primary data**      | Project, ProjectFeedback, ProjectMessage, ProjectTemplate |
| **Detailed API spec** | [projects endpoints](../../api/services/projects.md)      |

---

## 🎯 What this service owns

- Lifecycle: active → on_hold → completed/cancelled
- Client feedback and revision requests
- Public read-only project pages for portfolio marketing

---

## 🏗 How it fits in the platform

```
Client → Gateway (/api/v1/projects) → Projects Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

---

## 🌐 HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/projects`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method   | Path (service-relative)              | Controller                                      |
| :------- | :----------------------------------- | :---------------------------------------------- |
| `GET`    | `/admin/projects`                    | `src/controllers/projects.admin.controller.ts`  |
| `GET`    | `/admin/projects/stats`              | `src/controllers/projects.admin.controller.ts`  |
| `PATCH`  | `/admin/projects/:id/status`         | `src/controllers/projects.admin.controller.ts`  |
| `PATCH`  | `/admin/projects/:id`                | `src/controllers/projects.admin.controller.ts`  |
| `GET`    | `/admin/projects/:id`                | `src/controllers/projects.admin.controller.ts`  |
| `POST`   | `/admin/projects`                    | `src/controllers/projects.admin.controller.ts`  |
| `DELETE` | `/admin/projects/:id`                | `src/controllers/projects.admin.controller.ts`  |
| `POST`   | `/admin/projects/:id/team`           | `src/controllers/projects.admin.controller.ts`  |
| `DELETE` | `/admin/projects/:id/team/:memberId` | `src/controllers/projects.admin.controller.ts`  |
| `GET`    | `/admin/projects/:id/analytics`      | `src/controllers/projects.admin.controller.ts`  |
| `POST`   | `/admin/projects/:id/milestones`     | `src/controllers/projects.admin.controller.ts`  |
| `POST`   | `/admin/projects/:id/extend`         | `src/controllers/projects.admin.controller.ts`  |
| `POST`   | `/admin/projects/:id/archive`        | `src/controllers/projects.admin.controller.ts`  |
| `POST`   | `/admin/projects/:id/unarchive`      | `src/controllers/projects.admin.controller.ts`  |
| `POST`   | `/admin/projects/:id/duplicate`      | `src/controllers/projects.admin.controller.ts`  |
| `POST`   | `/admin/projects/:id/export`         | `src/controllers/projects.admin.controller.ts`  |
| `GET`    | `/projects/health`                   | `src/controllers/projects.controller.ts`        |
| `GET`    | `/projects/stats`                    | `src/controllers/projects.controller.ts`        |
| `GET`    | `/projects`                          | `src/controllers/projects.controller.ts`        |
| `GET`    | `/projects/by-quote/:quoteId`        | `src/controllers/projects.controller.ts`        |
| `GET`    | `/projects/:id`                      | `src/controllers/projects.controller.ts`        |
| `GET`    | `/projects/:id/timeline`             | `src/controllers/projects.controller.ts`        |
| `GET`    | `/projects/:id/deliverables`         | `src/controllers/projects.controller.ts`        |
| `GET`    | `/projects/:id/payments`             | `src/controllers/projects.controller.ts`        |
| `POST`   | `/projects/:id/approve`              | `src/controllers/projects.controller.ts`        |
| `POST`   | `/projects/:id/request-revision`     | `src/controllers/projects.controller.ts`        |
| `GET`    | `/projects/:id/progress`             | `src/controllers/projects.controller.ts`        |
| `GET`    | `/projects/:id/milestones`           | `src/controllers/projects.controller.ts`        |
| `GET`    | `/projects/:id/messages`             | `src/controllers/projects.controller.ts`        |
| `POST`   | `/projects/:id/messages`             | `src/controllers/projects.controller.ts`        |
| `POST`   | `/projects/:id/feedback`             | `src/controllers/projects.controller.ts`        |
| `GET`    | `/projects/:id/feedback`             | `src/controllers/projects.controller.ts`        |
| `GET`    | `/public`                            | `src/controllers/projects.public.controller.ts` |
| `GET`    | `/public/:id`                        | `src/controllers/projects.public.controller.ts` |

For request/response examples, error codes, and rate limits, see [../../api/services/projects.md](../../api/services/projects.md) and [API standards](../../api/standards.md).

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
- `@nestlancer/testing`

---

## 🔌 External integrations

- Progress
- Payments
- Messaging

---

## 📨 Domain events (outbox)

- `project.project.created` → see [event catalog](../../architecture/event-catalog.md)
- `project.project.completed` → see [event catalog](../../architecture/event-catalog.md)

---

## ⚙️ Configuration

| Variable                | Purpose                                 |
| :---------------------- | :-------------------------------------- |
| `PROJECTS_SERVICE_PORT` | HTTP port (default 3008)                |
| `DATABASE_URL`          | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL`             | Cache / rate limits where used          |
| `RABBITMQ_URL`          | Event publishing                        |

Full list: [environment variables](../../guides/environment-variables.md) and Infisical paths in [infisical.md](../../guides/infisical.md).

---

## 💻 Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/projects-service dev

# Unit + integration tests
pnpm --filter @nestlancer/projects-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3008/health
```

Run the full stack: `make dev` or `pnpm dev` from the monorepo root (starts infra via Docker Compose).

---

## 🧪 Testing

- Unit tests: `services/projects/tests/unit/`
- E2E: `services/projects/tests/e2e/` (hits HTTP with Supertest)
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

**Projects Service** — Nestlancer backend component documentation

</div>
