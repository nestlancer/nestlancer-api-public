<div align="center">

# Background workers (`workers/`)

</div>

---

10 RabbitMQ consumers process events written to the transactional
outbox by services (see [queue topology](../../architecture/queue-topology.md) and the
[event catalog](../../architecture/event-catalog.md)). Failures retry with backoff and land in a
dead-letter queue — see the [DLQ runbook](../../operations/runbooks/dlq-processing.md).

| Worker | Queue | Routing key(s) | Summary |
| --- | --- | --- | --- |
| [Email Worker](email-worker.md) | `email.queue` | email.# | Renders Handlebars templates and sends mail via ZeptoMail (transactional) or SES (bulk). |
| [Notification Worker](notification-worker.md) | `notification.queue` | notification.# | Writes in-app notifications, sends Web Push, publishes Redis events for Socket.IO fan-out. |
| [Audit Worker](audit-worker.md) | `audit.queue` | audit.# | Buffers audit entries from the queue and batch-inserts into PostgreSQL for compliance queries. |
| [Media Worker](media-worker.md) | `media.queue` | media.# | Sharp/FFmpeg processing: resize, thumbnails, metadata, virus scan, triggers CDN invalidation. |
| [Analytics Worker](analytics-worker.md) | `analytics.queue` | analytics.# | Rolls up views, revenue snapshots, portfolio/blog engagement into reporting tables. |
| [Webhook Worker](webhook-worker.md) | `webhook.queue` | webhook.# | Applies Razorpay/GitHub webhook side effects (payment state, deployment hooks). |
| [CDN Worker](cdn-worker.md) | `cdn.queue` | cdn.# | Batches Cloudflare/CloudFront cache purges after media/blog/portfolio updates. |
| [Outbox Poller](outbox-poller.md) | `(database poll — not a consumer queue)` | publishes to nestlancer.events | Polls `OutboxEvent` rows (PENDING), publishes to RabbitMQ with confirms, marks PROCESSED or retries. |
| [Document Worker](document-worker.md) | `document.queue` | document.#, quote.#, payment.# | Renders quote, contract, invoice, receipt, and payment-reminder PDFs (Puppeteer) via @nestlancer/documents/@nestlancer/pdf, stores them, and emits DOCUMENT_READY to the outbox. |
| [Export Worker](export-worker.md) | `export.queue` | export.# | Builds downloadable ZIP/CSV/JSON exports (GDPR user data, project handoff, audit log, revenue, blog posts) via @nestlancer/documents, stores them, and emits EXPORT_COMPLETED to the outbox. |

Each worker doc lists its processors/jobs, real workspace dependencies, and the message flow from
outbox write to side effect. See [adding a new worker](../../development/adding-a-worker.md) to
scaffold an 11th.

[← Back to component index](../README.md)
