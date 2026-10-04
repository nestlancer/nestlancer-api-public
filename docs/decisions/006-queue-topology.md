## 📖 Table of Contents

- [Status](#status)
- [Date](#date)
- [Context](#context)
- [Decision](#decision)
- [Rationale](#rationale)
- [Alternatives Considered](#alternatives-considered)
- [Consequences](#consequences)

---

## Status

Accepted

---

## Date

2025-12-01

---

## Context

We need a message broker topology that supports event-driven communication between services and workers with reliable delivery, flexible routing, and failure handling.

---

## Decision

Use **RabbitMQ** with topic exchange for domain events and direct exchange for webhooks.

### Exchanges

- `nestlancer.events` (topic) – All domain events, flexible routing via patterns
- `nestlancer.webhooks` (direct) – Targeted webhook deliveries
- `nestlancer.dlx` (fanout) – Dead-letter exchange for failed messages

### Message Properties

- Persistent delivery (`deliveryMode: 2`)
- Publisher confirms for reliable publishing
- Manual consumer acknowledgment
- JSON content type

### Failure Handling

- 3 retry attempts with exponential backoff (1s, 5s, 30s)
- Failed messages routed to DLQ after max retries
- DLQ retained for 7 days for manual inspection/replay

---

## Rationale

- **Topic exchange**: Flexible routing patterns (e.g., `payment.*.*`, `*.*.created`)
- **Publisher confirms**: Guarantees message is persisted by RabbitMQ
- **Manual ack**: Prevents message loss if consumer crashes mid-processing
- **DLQ**: Preserves failed messages for debugging and replay

---

## Alternatives Considered

- **Redis Streams**: Less feature-rich, no native DLQ, no exchange routing
- **Apache Kafka**: Overkill for current message volume, higher operational complexity

---

## Consequences

- Workers must be idempotent (at-least-once delivery)
- Queue topology defined in `definitions.json` and loaded on startup
- Monitoring via RabbitMQ management plugin and Prometheus exporter
