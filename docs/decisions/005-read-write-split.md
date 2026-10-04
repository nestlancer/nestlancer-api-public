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

Portfolio, blog, and admin dashboard endpoints are read-heavy and can benefit from PostgreSQL read replicas to reduce load on the primary database.

---

## Decision

Use separate Prisma clients for reads and writes.

- **`PrismaWriteService`**: Connects to primary PostgreSQL for INSERT, UPDATE, DELETE
- **`PrismaReadService`**: Connects to read replica(s) for SELECT queries
- **Decorators**: `@ReadOnly()` routes method to read client, default is write client

### Usage

```typescript
@ReadOnly()
async findPublishedPortfolioItems(pagination: PaginationParams) {
  // Automatically uses PrismaReadService (replica)
}

async createPortfolioItem(data: CreatePortfolioItemDto) {
  // Uses PrismaWriteService (primary) by default
}
```

---

## Rationale

- Offloads read-heavy queries (portfolio listing, blog, analytics) from primary
- Primary handles only mutations, reducing connection pool pressure
- Transparent to service layer via decorators
- Fallback to write client if no replica configured

---

## Consequences

- Read replica lag tolerance: ~100ms for most endpoints
- Avoid reading immediately after writing (read-after-write consistency)
- `DATABASE_READ_REPLICA_URLS` environment variable (optional)
