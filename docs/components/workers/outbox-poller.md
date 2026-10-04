# Outbox Poller

Polls `OutboxEvent` rows (PENDING), publishes to RabbitMQ with confirms, marks PROCESSED or retries.

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/outbox-poller` |
| **Source** | `workers/outbox-poller/` |
| **Queue** | `(database poll — not a consumer queue)` |
| **Routing** | publishes to nestlancer.events |

## Processors / jobs

- `outbox-poller`
- `outbox-publisher`

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Outbox Poller consumes from (database poll — not a consumer queue)
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../operations/runbooks/dlq-processing.md)).

## Dependencies

- `@nestlancer/common`
- `@nestlancer/cache`
- `@nestlancer/outbox`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/queue`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`

## Local development

```bash
pnpm --filter @nestlancer/outbox-poller dev
pnpm --filter @nestlancer/outbox-poller test
```

RabbitMQ and PostgreSQL run on the shared dev VPS over Tailscale, not via local Docker Compose — see [Local workflow](../../development/local-workflow.md) for how to point `.env` at them.

## Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../development/adding-a-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)
