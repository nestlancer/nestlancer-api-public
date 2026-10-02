<div align="center">

# Notification Worker

### Writes in-app notifications, sends Web Push, publishes Redis events for Socket.IO fan-out.

</div>

---

## 📖 Table of Contents

- [👁 At a glance](#at-a-glance)
- [Processors / jobs](#processors-jobs)
- [Message flow](#message-flow)
- [📎 Dependencies](#dependencies)
- [💻 Local development](#local-development)
- [📚 Related documentation](#related-documentation)

---

## 👁 At a glance

|             |                                   |
| :---------- | :-------------------------------- |
| **Package** | `@nestlancer/notification-worker` |
| **Source**  | `workers/notification-worker/`    |
| **Queue**   | `notification.queue`              |
| **Routing** | notification.#                    |

---

## Processors / jobs

- `in-app-notification`
- `push-notification`
- `realtime-fanout`

---

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Notification Worker consumes from notification.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../runbooks/dlq-processing.md)).

---

## 📎 Dependencies

- `@nestlancer/cache`
- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/queue`
- `@nestlancer/tracing`

---

## 💻 Local development

```bash
pnpm --filter @nestlancer/notification-worker dev
pnpm --filter @nestlancer/notification-worker test
```

Ensure RabbitMQ and PostgreSQL are running (`make dev-services`).

---

## 📚 Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../guides/adding-new-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)

---

<div align="center">

**Notification Worker** — Nestlancer backend component documentation

</div>
