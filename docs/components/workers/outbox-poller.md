<div align="center">

# Outbox Poller

### Polls `OutboxEvent` rows (PENDING), publishes to RabbitMQ with confirms, marks PROCESSED or retries.

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

|             |                                          |
| :---------- | :--------------------------------------- |
| **Package** | `@nestlancer/outbox-poller`              |
| **Source**  | `workers/outbox-poller/`                 |
| **Queue**   | `(database poll — not a consumer queue)` |
| **Routing** | publishes to nestlancer.events           |

---

## Processors / jobs

- `outbox-poller`
- `outbox-publisher`

---

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Outbox Poller consumes from (database poll — not a consumer queue)
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../runbooks/dlq-processing.md)).

---

## 📎 Dependencies

- `@nestlancer/common`
- `@nestlancer/outbox`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/queue`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`

---

## 💻 Local development

```bash
pnpm --filter @nestlancer/outbox-poller dev
pnpm --filter @nestlancer/outbox-poller test
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

**Outbox Poller** — Nestlancer backend component documentation

</div>
