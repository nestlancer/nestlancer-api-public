# Document Worker

Renders quote, contract, invoice, receipt, and payment-reminder PDFs (Puppeteer) via @nestlancer/documents/@nestlancer/pdf, stores them, and emits DOCUMENT_READY to the outbox.

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/document-worker` |
| **Source** | `workers/document-worker/` |
| **Queue** | `document.queue` |
| **Routing** | document.#, quote.#, payment.# |

## Processors / jobs

- `quote-pdf (QUOTE_SENT / quote.quote.sent)`
- `quote-revision-pdf (QUOTE_REVISION_CREATED / document.quote.revised)`
- `contract-pdf (QUOTE_ACCEPTED / quote.quote.accepted)`
- `invoice-pdf + receipt-pdf (PAYMENT_COMPLETED / payment.payment.completed)`
- `invoice-pdf (PAYMENT_REQUESTED, MANUAL_PAYMENT_CREATED, payment.payment.initiated)`
- `reminder-pdf (PAYMENT_REMINDER / payment.payment.reminder)`

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Document Worker consumes from document.queue
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
- `@nestlancer/pdf`
- `@nestlancer/queue`
- `@nestlancer/storage`
- `@nestlancer/tracing`

## Local development

```bash
pnpm --filter @nestlancer/document-worker dev
pnpm --filter @nestlancer/document-worker test
```

RabbitMQ and PostgreSQL run on the shared dev VPS over Tailscale, not via local Docker Compose — see [Local workflow](../../development/local-workflow.md) for how to point `.env` at them.

## Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../development/adding-a-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)
