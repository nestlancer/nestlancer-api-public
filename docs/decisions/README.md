<div align="center">

# Architecture decision records

### Why the backend is built the way it is. Each record captures context, the decision, and trade-offs at the time it was made — they are not updated when circumstances change; a superseded decision gets a new record that says so.

</div>

---

## Index

| # | Decision | One-line context |
| :-- | :-- | :-- |
| [001](001-monorepo-structure.md) | Monorepo structure | pnpm + Turborepo workspace sharing code across 16 services, 10 workers, 2 gateways |
| [002](002-database-choice.md) | Database choice | PostgreSQL for transactional payments, metadata, search, read scaling |
| [003](003-auth-strategy.md) | Auth strategy | Cookie sessions (web) + Bearer tokens (API/mobile), with 2FA |
| [004](004-outbox-pattern.md) | Outbox pattern | Transactional outbox to avoid dual-write inconsistency when publishing to RabbitMQ |
| [005](005-read-write-split.md) | Read/write split | PostgreSQL read replicas for read-heavy portfolio/blog/admin endpoints |
| [006](006-queue-topology.md) | Queue topology | RabbitMQ exchange/routing-key design for event-driven service↔worker communication |
| [007](007-idempotency-strategy.md) | Idempotency strategy | Idempotency keys to make payment/quote-acceptance operations retry-safe |
| [008](008-caching-strategy.md) | Caching strategy | Redis caching for frequently-read portfolio/blog/profile/config data |
| [009](009-milestone-lifecycle.md) | Milestone lifecycle | Canonical `Milestone` status state machine shared by delivery, approval, and payments |

## About this folder

- Previously `docs/adr/`. Renamed to `docs/decisions/` and renumbered during the 2026-10
  documentation reset to resolve a numbering collision (two files were both `001-*`) — see the
  migration note at the top of [009-milestone-lifecycle.md](009-milestone-lifecycle.md).
- New decisions get the next free number — check this index first.
- Most records follow a Status / Date / Context / Decision / Rationale / Alternatives /
  Trade-offs / Consequences template. `009` predates that convention and reads as a domain design
  note instead; it is kept because the content is still accurate and useful.
- These are **point-in-time** records. For how the system actually behaves today, prefer
  [`docs/architecture/`](../architecture/) and the source code; come here for *why*.
