<div align="center">

# Audit Worker

### Buffers audit entries from the queue and batch-inserts into PostgreSQL for compliance queries.

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

|             |                            |
| :---------- | :------------------------- |
| **Package** | `@nestlancer/audit-worker` |
| **Source**  | `workers/audit-worker/`    |
| **Queue**   | `audit.queue`              |
| **Routing** | audit.#                    |

---

## Processors / jobs

- `audit-batch-insert`

---

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Audit Worker consumes from audit.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../runbooks/dlq-processing.md)).

---

## 📎 Dependencies

- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`
- `@nestlancer/queue`

---

## 💻 Local development

```bash
pnpm --filter @nestlancer/audit-worker dev
pnpm --filter @nestlancer/audit-worker test
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

**Audit Worker** — Nestlancer backend component documentation

</div>
