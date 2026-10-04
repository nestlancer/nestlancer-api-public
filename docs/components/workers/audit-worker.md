# Audit Worker

Buffers audit entries from the queue and batch-inserts into PostgreSQL for compliance queries.

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/audit-worker` |
| **Source** | `workers/audit-worker/` |
| **Queue** | `audit.queue` |
| **Routing** | audit.# |

## Processors / jobs

- `audit-batch-insert`

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Audit Worker consumes from audit.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../operations/runbooks/dlq-processing.md)).

## Dependencies

- `@nestlancer/common`
- `@nestlancer/cache`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`
- `@nestlancer/queue`

## Local development

```bash
pnpm --filter @nestlancer/audit-worker dev
pnpm --filter @nestlancer/audit-worker test
```

RabbitMQ and PostgreSQL run on the shared dev VPS over Tailscale, not via local Docker Compose — see [Local workflow](../../development/local-workflow.md) for how to point `.env` at them.

## Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../development/adding-a-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)
