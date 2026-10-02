<div align="center">

# Webhook Worker

### Applies Razorpay/GitHub webhook side effects (payment state, deployment hooks).

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

|             |                              |
| :---------- | :--------------------------- |
| **Package** | `@nestlancer/webhook-worker` |
| **Source**  | `workers/webhook-worker/`    |
| **Queue**   | `webhook.queue`              |
| **Routing** | webhook.#                    |

---

## Processors / jobs

- `razorpay-webhook`
- `github-webhook`
- `generic-webhook`

---

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Webhook Worker consumes from webhook.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../runbooks/dlq-processing.md)).

---

## 📎 Dependencies

- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/queue`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`

---

## 💻 Local development

```bash
pnpm --filter @nestlancer/webhook-worker dev
pnpm --filter @nestlancer/webhook-worker test
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

**Webhook Worker** — Nestlancer backend component documentation

</div>
