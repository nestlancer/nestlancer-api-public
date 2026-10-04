## 📖 Table of Contents

- [Status](#status)
- [Date](#date)
- [Context](#context)
- [Decision](#decision)
- [Rationale](#rationale)
- [Consequences](#consequences)

---

## Status

Accepted

---

## Date

2025-12-01

---

## Context

Services need to publish domain events to RabbitMQ after business operations. Direct publishing creates a dual-write problem: the DB write may succeed but the queue publish may fail (or vice versa), leading to inconsistency.

---

## Decision

Use the **transactional outbox pattern**: write events to an `OutboxEvent` table in the same database transaction as the business operation. A separate `outbox-poller` worker polls the table and publishes events to RabbitMQ.

### Flow

```
Service: BEGIN TRANSACTION
  1. INSERT/UPDATE business data
  2. INSERT INTO outbox_events (aggregateType, aggregateId, eventType, payload)
  COMMIT

Outbox Poller (every 1-5s):
  1. SELECT * FROM outbox_events WHERE status = 'PENDING'
     ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED
  2. Publish each event to RabbitMQ
  3. UPDATE status = 'PUBLISHED', publishedAt = NOW()

Cleanup (daily):
  DELETE FROM outbox_events WHERE status = 'PUBLISHED' AND created_at < NOW() - INTERVAL '7 days'
```

---

## Rationale

- **Guarantees at-least-once delivery**: Event is persisted atomically with business data
- **No dual-write problem**: Single database transaction for both operations
- **Reliable**: Even if RabbitMQ is temporarily down, events are stored and published when it recovers
- **Simple**: No distributed transaction coordination (2PC/saga)

---

## Consequences

- Slightly higher latency for event delivery (polling interval)
- Outbox table must be cleaned up regularly
- Events may be published more than once (consumers must be idempotent)
- `SKIP LOCKED` enables multiple poller instances without contention
