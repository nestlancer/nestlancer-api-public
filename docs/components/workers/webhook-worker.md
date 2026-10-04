# Webhook Worker

Applies Razorpay/GitHub webhook side effects (payment state, deployment hooks).

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/webhook-worker` |
| **Source** | `workers/webhook-worker/` |
| **Queue** | `webhook.queue` |
| **Routing** | webhook.# |

## Processors / jobs

- `razorpay-webhook`
- `github-webhook`
- `generic-webhook`

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Webhook Worker consumes from webhook.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../operations/runbooks/dlq-processing.md)).

## Dependencies

- `@nestlancer/common`
- `@nestlancer/cache`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/queue`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`

## Local development

```bash
pnpm --filter @nestlancer/webhook-worker dev
pnpm --filter @nestlancer/webhook-worker test
```

RabbitMQ and PostgreSQL run on the shared dev VPS over Tailscale, not via local Docker Compose — see [Local workflow](../../development/local-workflow.md) for how to point `.env` at them.

## Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../development/adding-a-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)
