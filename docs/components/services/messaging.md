<div align="center">

# Messaging Service

### REST layer for project-scoped chat, threads, reactions, read receipts; realtime via ws-gateway.

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

|                       |                                                            |
| :-------------------- | :--------------------------------------------------------- |
| **Package**           | `@nestlancer/messaging-service`                            |
| **Source**            | `services/messaging/`                                      |
| **Default port**      | 3010 (env: `MESSAGING_SERVICE_PORT`)                       |
| **Gateway prefix**    | `/api/v1/messaging`                                        |
| **Primary data**      | Conversation, Message, MessageReaction, MessageReadReceipt |
| **Detailed API spec** | [messaging endpoints](../../api/services/messaging.md)     |

---

## 🎯 What this service owns

- Conversation list and message history with pagination
- Chat threads per project; file attachments via media
- Admin moderation and flagged messages

---

## 🏗 How it fits in the platform

```
Client → Gateway (/api/v1/messaging) → Messaging Service → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
```

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via `@nestlancer/auth-lib` guards on user vs admin controllers.

---

## 🌐 HTTP surface (discovered from controllers)

Gateway exposes these under `/api/v1/messaging`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

| Method   | Path (service-relative)                      | Controller                                           |
| :------- | :------------------------------------------- | :--------------------------------------------------- |
| `GET`    | `/admin/messages`                            | `src/controllers/admin/messages.admin.controller.ts` |
| `DELETE` | `/admin/messages/:id`                        | `src/controllers/admin/messages.admin.controller.ts` |
| `GET`    | `/admin/messages/stats`                      | `src/controllers/admin/messages.admin.controller.ts` |
| `GET`    | `/admin/messages/analytics`                  | `src/controllers/admin/messages.admin.controller.ts` |
| `GET`    | `/admin/messages/conversations`              | `src/controllers/admin/messages.admin.controller.ts` |
| `GET`    | `/admin/messages/project/:projectId`         | `src/controllers/admin/messages.admin.controller.ts` |
| `POST`   | `/admin/messages/:id/flag`                   | `src/controllers/admin/messages.admin.controller.ts` |
| `POST`   | `/admin/messages/projects/:projectId/system` | `src/controllers/admin/messages.admin.controller.ts` |
| `GET`    | `/admin/messages/flagged`                    | `src/controllers/admin/messages.admin.controller.ts` |
| `POST`   | `/admin/messages/flagged/:id/dismiss`        | `src/controllers/admin/messages.admin.controller.ts` |
| `DELETE` | `/admin/messages/flagged/:id`                | `src/controllers/admin/messages.admin.controller.ts` |
| `POST`   | `/admin/messages/flagged/:id/escalate`       | `src/controllers/admin/messages.admin.controller.ts` |
| `GET`    | `/messages/threads`                          | `src/controllers/user/chat-threads.controller.ts`    |
| `POST`   | `/messages/threads/direct`                   | `src/controllers/user/chat-threads.controller.ts`    |
| `POST`   | `/messages/threads/group`                    | `src/controllers/user/chat-threads.controller.ts`    |
| `GET`    | `/messages/threads/:threadId/messages`       | `src/controllers/user/chat-threads.controller.ts`    |
| `POST`   | `/messages/threads/:threadId/messages`       | `src/controllers/user/chat-threads.controller.ts`    |
| `POST`   | `/messages/threads/:threadId/read`           | `src/controllers/user/chat-threads.controller.ts`    |
| `GET`    | `/conversations`                             | `src/controllers/user/conversations.controller.ts`   |
| `GET`    | `/conversations/unread-count`                | `src/controllers/user/conversations.controller.ts`   |
| `GET`    | `/messages/:messageId/threads`               | `src/controllers/user/message-threads.controller.ts` |
| `POST`   | `/messages/:messageId/threads`               | `src/controllers/user/message-threads.controller.ts` |
| `GET`    | `/messages/health`                           | `src/controllers/user/messages.controller.ts`        |
| `GET`    | `/messages/unread-count`                     | `src/controllers/user/messages.controller.ts`        |
| `GET`    | `/messages/search`                           | `src/controllers/user/messages.controller.ts`        |
| `GET`    | `/messages/projects/:projectId`              | `src/controllers/user/messages.controller.ts`        |
| `GET`    | `/messages/project/:projectId`               | `src/controllers/user/messages.controller.ts`        |
| `POST`   | `/messages/projects/:projectId`              | `src/controllers/user/messages.controller.ts`        |
| `POST`   | `/messages/project/:projectId`               | `src/controllers/user/messages.controller.ts`        |
| `POST`   | `/messages`                                  | `src/controllers/user/messages.controller.ts`        |
| `GET`    | `/messages/project/:projectId/search`        | `src/controllers/user/messages.controller.ts`        |
| `PATCH`  | `/messages/:id`                              | `src/controllers/user/messages.controller.ts`        |
| `DELETE` | `/messages/:id`                              | `src/controllers/user/messages.controller.ts`        |
| `POST`   | `/messages/:id/reactions`                    | `src/controllers/user/messages.controller.ts`        |
| `POST`   | `/messages/:id/read`                         | `src/controllers/user/messages.controller.ts`        |
| `POST`   | `/messages/project/:projectId/read`          | `src/controllers/user/messages.controller.ts`        |
| `POST`   | `/messages/projects/:projectId/read-all`     | `src/controllers/user/messages.controller.ts`        |
| `POST`   | `/messages/:id/pin`                          | `src/controllers/user/messages.controller.ts`        |
| `POST`   | `/messages/:id/unpin`                        | `src/controllers/user/messages.controller.ts`        |
| `GET`    | `/messages/project/:projectId/attachments`   | `src/controllers/user/messages.controller.ts`        |
| …        | _4 more routes — see OpenAPI_                |                                                      |

For request/response examples, error codes, and rate limits, see [../../api/services/messaging.md](../../api/services/messaging.md) and [API standards](../../api/standards.md).

---

## 📎 Dependencies (`@nestlancer/*`)

- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/logger`
- `@nestlancer/database`
- `@nestlancer/cache`
- `@nestlancer/outbox`
- `@nestlancer/auth-lib`
- `@nestlancer/storage`
- `@nestlancer/testing`

---

## 🔌 External integrations

- Redis pub/sub → ws-gateway
- Media

---

## 📨 Domain events (outbox)

- `message.message.sent` → see [event catalog](../../architecture/event-catalog.md)

---

## ⚙️ Configuration

| Variable                 | Purpose                                 |
| :----------------------- | :-------------------------------------- |
| `MESSAGING_SERVICE_PORT` | HTTP port (default 3010)                |
| `DATABASE_URL`           | PostgreSQL (via `@nestlancer/database`) |
| `REDIS_URL`              | Cache / rate limits where used          |
| `RABBITMQ_URL`           | Event publishing                        |

Full list: [environment variables](../../guides/environment-variables.md) and Infisical paths in [infisical.md](../../guides/infisical.md).

---

## 💻 Local development

```bash
# Single service (watch mode)
pnpm --filter @nestlancer/messaging-service dev

# Unit + integration tests
pnpm --filter @nestlancer/messaging-service test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:3010/health
```

Run the full stack: `make dev` or `pnpm dev` from the monorepo root (starts infra via Docker Compose).

---

## 🧪 Testing

- Unit tests: `services/messaging/tests/unit/`
- E2E: `services/messaging/tests/e2e/` (hits HTTP with Supertest)
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

**Messaging Service** — Nestlancer backend component documentation

</div>
