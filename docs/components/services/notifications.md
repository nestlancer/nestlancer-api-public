<div align="center">

# Notifications Service

### In-app inbox, channel preferences, Web Push subscriptions, admin broadcast/segment sends.

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

|                       |                                                                              |
| :-------------------- | :--------------------------------------------------------------------------- |
| **Package**           | `@nestlancer/notifications-service`                                          |
| **Source**            | `services/notifications/`                                                    |
| **Default port**      | 3011 (env: `NOTIFICATIONS_SERVICE_PORT`)                                     |
| **Gateway prefix**    | `/api/v1/notifications`                                                      |
| **Primary data**      | Notification, NotificationPreference, PushSubscription, NotificationTemplate |
| **Detailed API spec** | [notifications endpoints](../../api/services/notifications.md)               |

---

## 🎯 What this service owns

- Persist notifications and delivery logs
- Enqueue push/email based on user preferences
- Template CRUD for admin

---

## 🏗 How it fits in the platform

```
Client → Gateway (/api/v1/notifications) → Notifications Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

---

## 🌐 HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/notifications`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

_Route list: use gateway OpenAPI (`/docs-all-json`) — controllers may live under `src/modules/`._

For request/response examples, error codes, and rate limits, see [../../api/services/notifications.md](../../api/services/notifications.md) and [API standards](../../api/standards.md).

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

- notification-worker
- Web Push (VAPID)

---

## 📨 Domain events (outbox)

- `notification.notification.created` → see [event catalog](../../architecture/event-catalog.md)

---

## ⚙️ Configuration

| Variable                     | Purpose                                 |
| :--------------------------- | :-------------------------------------- |
| `NOTIFICATIONS_SERVICE_PORT` | HTTP port (default 3011)                |
| `DATABASE_URL`               | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL`                  | Cache / rate limits where used          |
| `RABBITMQ_URL`               | Event publishing                        |

Full list: [environment variables](../../guides/environment-variables.md) and Infisical paths in [infisical.md](../../guides/infisical.md).

---

## 💻 Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/notifications-service dev

# Unit + integration tests
pnpm --filter @nestlancer/notifications-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3011/health
```

Run the full stack: `make dev` or `pnpm dev` from the monorepo root (starts infra via Docker Compose).

---

## 🧪 Testing

- Unit tests: `services/notifications/tests/unit/`
- E2E: `services/notifications/tests/e2e/` (hits HTTP with Supertest)
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

**Notifications Service** — Nestlancer backend component documentation

</div>
