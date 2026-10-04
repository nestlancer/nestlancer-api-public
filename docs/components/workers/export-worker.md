# Export Worker

Builds downloadable ZIP/CSV/JSON exports (GDPR user data, project handoff, audit log, revenue, blog posts) via @nestlancer/documents, stores them, and emits EXPORT_COMPLETED to the outbox.

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/export-worker` |
| **Source** | `workers/export-worker/` |
| **Queue** | `export.queue` |
| **Routing** | export.# |

## Processors / jobs

- `gdpr-user-export (USER_DATA_EXPORT_REQUESTED)`
- `project-export (PROJECT_EXPORT_REQUESTED)`
- `audit-export (AUDIT_EXPORT, csv/json)`
- `revenue-export (REVENUE_EXPORT_REQUESTED, csv/json)`
- `blog-posts-export (BLOG_POSTS_EXPORT_REQUESTED)`

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Export Worker consumes from export.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../operations/runbooks/dlq-processing.md)).

## Dependencies

- `@nestlancer/common`
- `@nestlancer/cache`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/documents`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/queue`
- `@nestlancer/storage`
- `@nestlancer/tracing`

## Local development

```bash
pnpm --filter @nestlancer/export-worker dev
pnpm --filter @nestlancer/export-worker test
```

RabbitMQ and PostgreSQL run on the shared dev VPS over Tailscale, not via local Docker Compose — see [Local workflow](../../development/local-workflow.md) for how to point `.env` at them.

## Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../development/adding-a-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)
