# CDN Worker

Batches Cloudflare/CloudFront cache purges after media/blog/portfolio updates.

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/cdn-worker` |
| **Source** | `workers/cdn-worker/` |
| **Queue** | `cdn.queue` |
| **Routing** | cdn.# |

## Processors / jobs

- `path-invalidation`
- `batch-invalidation`

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → CDN Worker consumes from cdn.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../operations/runbooks/dlq-processing.md)).

## Dependencies

- `@nestlancer/common`
- `@nestlancer/cache`
- `@nestlancer/config`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/queue`
- `@nestlancer/tracing`

## Local development

```bash
pnpm --filter @nestlancer/cdn-worker dev
pnpm --filter @nestlancer/cdn-worker test
```

RabbitMQ and PostgreSQL run on the shared dev VPS over Tailscale, not via local Docker Compose — see [Local workflow](../../development/local-workflow.md) for how to point `.env` at them.

## Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../development/adding-a-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)
