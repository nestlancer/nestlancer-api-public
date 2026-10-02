<div align="center">

# Progress Service

### Delivery tracking: timeline entries, milestones, file deliverables, client approvals.

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

|                       |                                                      |
| :-------------------- | :--------------------------------------------------- |
| **Package**           | `@nestlancer/progress-service`                       |
| **Source**            | `services/progress/`                                 |
| **Default port**      | 3009 (env: `PROGRESS_SERVICE_PORT`)                  |
| **Gateway prefix**    | `/api/v1/progress`                                   |
| **Primary data**      | ProgressEntry, Milestone, Deliverable                |
| **Detailed API spec** | [progress endpoints](../../api/services/progress.md) |

---

## 🎯 What this service owns

- Admin posts progress updates and uploads deliverables
- Client approves milestones / requests changes on deliverables
- Gates payment milestones when configured

---

## 🏗 How it fits in the platform

```
Client → Gateway (/api/v1/progress) → Progress Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

---

## 🌐 HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/progress`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method   | Path (service-relative)                         | Controller                                               |
| :------- | :---------------------------------------------- | :------------------------------------------------------- |
| `POST`   | `/admin/projects/:projectId/deliverables`       | `src/controllers/admin/deliverables.admin.controller.ts` |
| `GET`    | `/admin/projects/:projectId/deliverables`       | `src/controllers/admin/deliverables.admin.controller.ts` |
| `PATCH`  | `/admin/deliverables/:id`                       | `src/controllers/admin/deliverables.admin.controller.ts` |
| `DELETE` | `/admin/deliverables/:id`                       | `src/controllers/admin/deliverables.admin.controller.ts` |
| `POST`   | `/admin/projects/:projectId/milestones`         | `src/controllers/admin/milestones.admin.controller.ts`   |
| `PATCH`  | `/admin/milestones/:id`                         | `src/controllers/admin/milestones.admin.controller.ts`   |
| `POST`   | `/admin/milestones/:id/complete`                | `src/controllers/admin/milestones.admin.controller.ts`   |
| `POST`   | `/admin/progress/projects/:projectId`           | `src/controllers/admin/progress.admin.controller.ts`     |
| `GET`    | `/admin/progress/projects/:projectId`           | `src/controllers/admin/progress.admin.controller.ts`     |
| `PATCH`  | `/admin/progress/:id`                           | `src/controllers/admin/progress.admin.controller.ts`     |
| `DELETE` | `/admin/progress/:id`                           | `src/controllers/admin/progress.admin.controller.ts`     |
| `GET`    | `/admin/progress/projects/:projectId/analytics` | `src/controllers/admin/progress.admin.controller.ts`     |
| `GET`    | `/admin/progress/projects/:projectId/timeline`  | `src/controllers/admin/progress.admin.controller.ts`     |
| `PATCH`  | `/admin/progress/projects/:projectId/status`    | `src/controllers/admin/progress.admin.controller.ts`     |
| `POST`   | `/admin/progress/projects/:projectId/complete`  | `src/controllers/admin/progress.admin.controller.ts`     |
| `POST`   | `/deliverables/:id/approve`                     | `src/controllers/user/deliverable-reviews.controller.ts` |
| `POST`   | `/deliverables/:id/reject`                      | `src/controllers/user/deliverable-reviews.controller.ts` |
| `POST`   | `/milestones/:id/approve`                       | `src/controllers/user/milestone-approvals.controller.ts` |
| `POST`   | `/milestones/:id/request-revision`              | `src/controllers/user/milestone-approvals.controller.ts` |
| `GET`    | `/projects/:projectId/progress`                 | `src/controllers/user/progress.controller.ts`            |
| `GET`    | `/projects/:projectId/progress/status`          | `src/controllers/user/progress.controller.ts`            |
| `GET`    | `/projects/:projectId/progress/milestones`      | `src/controllers/user/progress.controller.ts`            |
| `POST`   | `/projects/:projectId/progress/request-changes` | `src/controllers/user/progress.controller.ts`            |
| `GET`    | `/projects/:projectId/progress/:entryId`        | `src/controllers/user/progress.controller.ts`            |
| `POST`   | `/projects/:projectId/progress`                 | `src/controllers/user/progress.controller.ts`            |

For request/response examples, error codes, and rate limits, see [../../api/services/progress.md](../../api/services/progress.md) and [API standards](../../api/standards.md).

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
- `@nestlancer/queue`
- `@nestlancer/storage`
- `@nestlancer/testing`
- `@nestlancer/tracing`

---

## 🔌 External integrations

- Media
- Payments milestones
- Notifications

---

## 📨 Domain events (outbox)

- `progress.milestone.approved` → see [event catalog](../../architecture/event-catalog.md)
- `progress.deliverable.uploaded` → see [event catalog](../../architecture/event-catalog.md)

---

## ⚙️ Configuration

| Variable                | Purpose                                 |
| :---------------------- | :-------------------------------------- |
| `PROGRESS_SERVICE_PORT` | HTTP port (default 3009)                |
| `DATABASE_URL`          | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL`             | Cache / rate limits where used          |
| `RABBITMQ_URL`          | Event publishing                        |

Full list: [environment variables](../../guides/environment-variables.md) and Infisical paths in [infisical.md](../../guides/infisical.md).

---

## 💻 Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/progress-service dev

# Unit + integration tests
pnpm --filter @nestlancer/progress-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3009/health
```

Run the full stack: `make dev` or `pnpm dev` from the monorepo root (starts infra via Docker Compose).

---

## 🧪 Testing

- Unit tests: `services/progress/tests/unit/`
- E2E: `services/progress/tests/e2e/` (hits HTTP with Supertest)
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

**Progress Service** — Nestlancer backend component documentation

</div>
