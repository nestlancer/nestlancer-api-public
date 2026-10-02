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

We need a primary database that supports transactional payment processing, flexible metadata storage, full-text search, and read scaling.

---

## Decision

Use **PostgreSQL 16** with **read replicas** managed via Patroni for high availability. ORM: **Prisma 5.x**.

---

## Rationale

- **ACID compliance**: Critical for payment processing and financial operations
- **JSONB support**: Flexible metadata storage (budgetRange, preferences, SEO data)
- **Full-text search**: `tsvector` for user/portfolio/blog search without Elasticsearch
- **Read replicas**: Patroni-managed streaming replication for read-heavy workloads
- **Prisma ORM**: Type-safe queries, migrations, and schema-as-code
- **Mature ecosystem**: Extensive tooling, monitoring, and community support

---

## Alternatives Considered

- **MongoDB**: Rejected due to lack of multi-document transactions across collections, weaker consistency guarantees for financial data
- **MySQL**: Less powerful JSONB support, fewer advanced features

---

## Consequences

- Read/write split via separate Prisma clients (ADR-005)
- Connection pooling via `connection_limit` in DATABASE_URL
- Partitioning for high-volume tables (AuditLog, PostView)
