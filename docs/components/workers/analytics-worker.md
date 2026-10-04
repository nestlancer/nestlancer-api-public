# Analytics Worker

Rolls up views, revenue snapshots, portfolio/blog engagement into reporting tables.

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/analytics-worker` |
| **Source** | `workers/analytics-worker/` |
| **Queue** | `analytics.queue` |
| **Routing** | analytics.# |

## Processors / jobs

- `user-analytics`
- `project-analytics`
- `revenue-analytics`
- `blog-analytics`
- `portfolio-analytics`

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Analytics Worker consumes from analytics.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../operations/runbooks/dlq-processing.md)).

## Dependencies

- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/cache`
- `@nestlancer/queue`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`
- `@nestlancer/storage`
- `@nestlancer/pdf`

## Local development

```bash
pnpm --filter @nestlancer/analytics-worker dev
pnpm --filter @nestlancer/analytics-worker test
```

RabbitMQ and PostgreSQL run on the shared dev VPS over Tailscale, not via local Docker Compose — see [Local workflow](../../development/local-workflow.md) for how to point `.env` at them.

## Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../development/adding-a-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)
