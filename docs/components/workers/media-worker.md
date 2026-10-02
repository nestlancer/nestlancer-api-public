<div align="center">

# Media Worker

### Sharp/FFmpeg processing: resize, thumbnails, metadata, virus scan, triggers CDN invalidation.

</div>

---

## 📖 Table of Contents

- [👁 At a glance](#at-a-glance)
- [Processors / jobs](#processors-jobs)
- [Message flow](#message-flow)
- [📎 Dependencies](#dependencies)
- [💻 Local development](#local-development)
- [📚 Related documentation](#related-documentation)

---

## 👁 At a glance

|             |                            |
| :---------- | :------------------------- |
| **Package** | `@nestlancer/media-worker` |
| **Source**  | `workers/media-worker/`    |
| **Queue**   | `media.queue`              |
| **Routing** | media.#                    |

---

## Processors / jobs

- `image-resize`
- `thumbnail`
- `video-transcode`
- `virus-scan`
- `metadata-extractor`

---

## Message flow

```
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → Media Worker consumes from media.queue
        → side effect (email, push, S3, analytics DB, …)
```

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../runbooks/dlq-processing.md)).

---

## 📎 Dependencies

- `@nestlancer/cache`
- `@nestlancer/common`
- `@nestlancer/config`
- `@nestlancer/database`
- `@nestlancer/logger`
- `@nestlancer/metrics`
- `@nestlancer/queue`
- `@nestlancer/storage`
- `@nestlancer/tracing`

---

## 💻 Local development

```bash
pnpm --filter @nestlancer/media-worker dev
pnpm --filter @nestlancer/media-worker test
```

Ensure RabbitMQ and PostgreSQL are running (`make dev-services`).

---

## 📚 Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../guides/adding-new-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)

---

<div align="center">

**Media Worker** — Nestlancer backend component documentation

</div>
