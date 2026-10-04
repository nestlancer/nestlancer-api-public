# Email Worker

Renders Handlebars templates and sends mail via ZeptoMail (transactional) or SES (bulk).

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/email-worker` |
| **Source** | `workers/email-worker/` |
| **Queue** | `email.queue` |
| **Routing** | email.# |

## Processors / jobs

- `verification-email`
- `password-reset`
- `welcome`
- `quote-sent/accepted`
- `payment-received/reminder/failed`
- `project-update/completed`
- `contact-auto-reply/response`
- `announcement`

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Email Worker consumes from email.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../operations/runbooks/dlq-processing.md)).

## Dependencies

- `@nestlancer/common`
- `@nestlancer/cache`
- `@nestlancer/database`
- `@nestlancer/email`
- `@nestlancer/config`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/tracing`
- `@nestlancer/queue`
- `@nestlancer/mail`

## Local development

```bash
pnpm --filter @nestlancer/email-worker dev
pnpm --filter @nestlancer/email-worker test
```

RabbitMQ and PostgreSQL run on the shared dev VPS over Tailscale, not via local Docker Compose — see [Local workflow](../../development/local-workflow.md) for how to point `.env` at them.

## Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../development/adding-a-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)
