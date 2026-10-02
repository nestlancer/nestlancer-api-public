<div align="center">

# CDN Worker

### Batches Cloudflare/CloudFront cache purges after media/blog/portfolio updates.

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

|             |                          |
| :---------- | :----------------------- |
| **Package** | `@nestlancer/cdn-worker` |
| **Source**  | `workers/cdn-worker/`    |
| **Queue**   | `cdn.queue`              |
| **Routing** | cdn.#                    |

---

## Processors / jobs

- `path-invalidation`
- `batch-invalidation`

---

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → CDN Worker consumes from cdn.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../runbooks/dlq-processing.md)).

---

## 📎 Dependencies

- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/queue`
- `@nestlancer/tracing`

---

## 💻 Local development

```bash
pnpm --filter @nestlancer/cdn-worker dev
pnpm --filter @nestlancer/cdn-worker test
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

**CDN Worker** — Nestlancer backend component documentation

</div>
