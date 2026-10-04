# Notification Worker

Writes in-app notifications, sends Web Push, publishes Redis events for Socket.IO fan-out.

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/notification-worker` |
| **Source** | `workers/notification-worker/` |
| **Queue** | `notification.queue` |
| **Routing** | notification.# |

## Processors / jobs

- `in-app-notification`
- `push-notification`
- `realtime-fanout`

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Notification Worker consumes from notification.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../operations/runbooks/dlq-processing.md)).

## Dependencies

- `@nestlancer/cache`
- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/email`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/notifications`
- `@nestlancer/queue`
- `@nestlancer/tracing`

## Local development

```bash
pnpm --filter @nestlancer/notification-worker dev
pnpm --filter @nestlancer/notification-worker test
```

RabbitMQ and PostgreSQL run on the shared dev VPS over Tailscale, not via local Docker Compose — see [Local workflow](../../development/local-workflow.md) for how to point `.env` at them.

## Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../development/adding-a-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)
