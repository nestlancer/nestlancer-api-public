<div align="center">

# RabbitMQ Queue Topology

</div>

---

## 📖 Table of Contents

- [📦 Overview](#overview)
- [Exchanges](#exchanges)
- [Queues & Bindings](#queues-bindings)
- [Dead-Letter Configuration](#dead-letter-configuration)
- [Message Properties](#message-properties)
- [Consumer Configuration](#consumer-configuration)

---

## 📦 Overview

Nestlancer uses RabbitMQ 3.13 as its message broker with a topic exchange for domain events, a direct exchange for outbound webhooks, and a dead-letter exchange for failed messages.

---

## Exchanges

| Exchange              | Type   | Durable | Description                                 |
| :-------------------- | :----- | :------ | :------------------------------------------ |
| `nestlancer.events`   | topic  | Yes     | All domain events from transactional outbox |
| `nestlancer.webhooks` | direct | Yes     | Outbound webhook deliveries                 |
| `nestlancer.dlx`      | fanout | Yes     | Dead-letter exchange for failed messages    |

---

## Queues & Bindings

### Email Queue

| Property          | Value                                                                                                                                                                        |
| :---------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Queue             | `email.queue`                                                                                                                                                                |
| Exchange          | `nestlancer.events`                                                                                                                                                          |
| Routing Keys      | `email.*`, `auth.user.registered`, `auth.password.reset_requested`, `quote.quote.sent`, `payment.payment.completed`, `project.project.completed`, `contact.message.received` |
| DLQ               | `email.queue.dlq`                                                                                                                                                            |
| Consumer Prefetch | 10                                                                                                                                                                           |
| Worker            | `email-worker`                                                                                                                                                               |

### Notification Queue

| Property          | Value                                                                                                                                             |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| Queue             | `notification.queue`                                                                                                                              |
| Exchange          | `nestlancer.events`                                                                                                                               |
| Routing Keys      | `notification.*`, `request.status.*`, `quote.quote.*`, `payment.payment.*`, `message.message.*`, `progress.milestone.*`, `progress.deliverable.*` |
| DLQ               | `notification.queue.dlq`                                                                                                                          |
| Consumer Prefetch | 20                                                                                                                                                |
| Worker            | `notification-worker`                                                                                                                             |

### Audit Queue

| Property          | Value                                                                                                   |
| :---------------- | :------------------------------------------------------------------------------------------------------ |
| Queue             | `audit.queue`                                                                                           |
| Exchange          | `nestlancer.events`                                                                                     |
| Routing Keys      | `audit.*`, `auth.login.*`, `auth.password.*`, `user.account.*`, `payment.payment.*`, `project.status.*` |
| DLQ               | `audit.queue.dlq`                                                                                       |
| Consumer Prefetch | 50                                                                                                      |
| Batch Size        | 100 records                                                                                             |
| Worker            | `audit-worker`                                                                                          |

### Media Queue

| Property          | Value               |
| :---------------- | :------------------ |
| Queue             | `media.queue`       |
| Exchange          | `nestlancer.events` |
| Routing Keys      | `media.*`           |
| DLQ               | `media.queue.dlq`   |
| Consumer Prefetch | 5                   |
| Worker            | `media-worker`      |

### Analytics Queue

| Property          | Value                 |
| :---------------- | :-------------------- |
| Queue             | `analytics.queue`     |
| Exchange          | `nestlancer.events`   |
| Routing Keys      | `analytics.*`         |
| DLQ               | `analytics.queue.dlq` |
| Consumer Prefetch | 50                    |
| Worker            | `analytics-worker`    |

### Webhook Queue

| Property          | Value                 |
| :---------------- | :-------------------- |
| Queue             | `webhook.queue`       |
| Exchange          | `nestlancer.webhooks` |
| Routing Keys      | `webhook.*`           |
| DLQ               | `webhook.queue.dlq`   |
| Consumer Prefetch | 10                    |
| Worker            | `webhook-worker`      |

### CDN Queue

| Property          | Value                             |
| :---------------- | :-------------------------------- |
| Queue             | `cdn.queue`                       |
| Exchange          | `nestlancer.events`               |
| Routing Keys      | `cdn.*`                           |
| DLQ               | `cdn.queue.dlq`                   |
| Consumer Prefetch | 10                                |
| Batch Size        | Up to 1000 paths per invalidation |
| Worker            | `cdn-worker`                      |

---

## Dead-Letter Configuration

| Property     | Value                               |
| :----------- | :---------------------------------- |
| Exchange     | `nestlancer.dlx`                    |
| Queue        | `<original>.dlq`                    |
| Max Retries  | 3                                   |
| Retry Delays | 1s → 5s → 30s (exponential backoff) |
| DLQ TTL      | 7 days                              |

### Retry Flow

```
Message fails → nack (requeue: false)
  → nestlancer.dlx (fanout)
    → <queue>.dlq
      → After TTL: discarded or manually replayed via admin API
```

---

## Message Properties

All messages published with:

- `deliveryMode: 2` (persistent)
- `contentType: application/json`
- `messageId: UUID v4`
- `timestamp: Unix epoch`
- `headers.correlationId: UUID`
- Publisher confirms enabled (`channel.waitForConfirms()`)

---

## Consumer Configuration

| Setting            | Default   | Description                                |
| :----------------- | :-------- | :----------------------------------------- |
| `prefetch`         | 10        | Messages fetched before ack (per consumer) |
| `noAck`            | false     | Manual acknowledgment required             |
| `exclusive`        | false     | Multiple consumers allowed                 |
| `consumer_timeout` | 1800000ms | 30 min max processing time                 |
