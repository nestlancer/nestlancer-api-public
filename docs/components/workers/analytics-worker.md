<div align="center">

# Analytics Worker

### Rolls up views, revenue snapshots, portfolio/blog engagement into reporting tables.

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

|             |                                |
| :---------- | :----------------------------- |
| **Package** | `@nestlancer/analytics-worker` |
| **Source**  | `workers/analytics-worker/`    |
| **Queue**   | `analytics.queue`              |
| **Routing** | analytics.#                    |

---

## Processors / jobs

- `user-analytics`
- `project-analytics`
- `revenue-analytics`
- `blog-analytics`
- `portfolio-analytics`

---

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Analytics Worker consumes from analytics.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../runbooks/dlq-processing.md)).

---

## 📎 Dependencies

- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/cache`
- `@nestlancer/queue`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`
- `@nestlancer/storage`

---

## 💻 Local development

```bash
pnpm --filter @nestlancer/analytics-worker dev
pnpm --filter @nestlancer/analytics-worker test
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

**Analytics Worker** — Nestlancer backend component documentation

</div>
