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

Critical operations (payments, quote acceptance) must not be processed multiple times due to client retries, network issues, or duplicate webhook deliveries.

---

## Decision

Implement **idempotency keys** using Redis (fast check) + PostgreSQL (durable store).

### Flow

```
1. Client sends request with `Idempotency-Key: <UUID v4>` header
2. IdempotencyGuard checks Redis: idempotency:<key>
   a. Key exists + same request hash → Return cached response
   b. Key exists + different hash → 409 IdempotencyConflictException
   c. Key not found → Allow request to proceed
3. After handler execution, IdempotencyInterceptor stores response
   in Redis (TTL 24h) and PostgreSQL (durable)
```

### Required Endpoints

- `POST /payments/intents` – Payment creation
- `POST /payments/confirm` – Payment confirmation
- `POST /quotes/:id/accept` – Quote acceptance
- `POST /requests` – Request submission
- `POST /milestones/:id/release-payment` – Milestone payment release

### Decorator

```typescript
@Post('intents')
@Idempotent()
async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) { ... }
```

---

## Rationale

- **Redis**: O(1) lookup for majority of checks, handles high throughput
- **PostgreSQL**: Durable fallback if Redis is unavailable or evicts under memory pressure
- **24h TTL**: Sufficient window for client retries, automatic cleanup
- **Request hash**: Prevents misuse of same key with different payloads

---

## Consequences

- Clients must generate and send UUID v4 idempotency keys
- Duplicate requests within 24h return cached responses (same status code and body)
- Daily cleanup job purges expired PostgreSQL entries
