<div align="center">

# Database (Prisma)

### PostgreSQL 16 is the system of record. Schema and migrations live under `prisma/`. Seeding lives in `seed/`.

</div>

---

## 📖 Table of Contents

- [Layout](#layout)
- [Commands](#commands)
- [Read/write split](#readwrite-split)
- [📚 Related documentation](#related-documentation)

---

## Layout

| Path                 | Purpose                                                            |
| :------------------- | :----------------------------------------------------------------- |
| `prisma/schema/`     | Split Prisma models by domain (`user.prisma`, `payment.prisma`, …) |
| `prisma/migrations/` | Versioned SQL migrations                                           |
| `seed/`              | API seed for Postgres and MinIO (`bash seed/seed.sh`)              |

---

## Commands

```bash
pnpm db:generate    # Prisma client
make db-migrate     # Apply migrations
make db-seed        # Seed core, blogs, and portfolio via seed/seed.sh
make db-reset       # Drop + migrate + seed (destructive)
```

---

## Read/write split

- **Writes:** `PrismaWriteService` (primary)
- **Reads:** `PrismaReadService` (replica when configured)

See [ADR 005](../adr/005-read-write-split.md) and [`@nestlancer/database`](../components/libs/database.md).

---

## 📚 Related documentation

- [Prisma package README](../../prisma/README.md)
- [Database schema](../architecture/database-schema.md)
- [Database runbook](../runbooks/database-failover.md)
