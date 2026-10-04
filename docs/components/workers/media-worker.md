# Media Worker

Sharp/FFmpeg processing: resize, thumbnails, metadata, virus scan, triggers CDN invalidation.

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/media-worker` |
| **Source** | `workers/media-worker/` |
| **Queue** | `media.queue` |
| **Routing** | media.# |

## Processors / jobs

- `image-resize`
- `thumbnail`
- `video-transcode`
- `virus-scan`
- `metadata-extractor`

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Media Worker consumes from media.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../operations/runbooks/dlq-processing.md)).

## Dependencies

- `@nestlancer/cache`
- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/queue`
- `@nestlancer/storage`
- `@nestlancer/tracing`

## Local development

```bash
pnpm --filter @nestlancer/media-worker dev
pnpm --filter @nestlancer/media-worker test
```

RabbitMQ and PostgreSQL run on the shared dev VPS over Tailscale, not via local Docker Compose — see [Local workflow](../../development/local-workflow.md) for how to point `.env` at them.

## Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../development/adding-a-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)
