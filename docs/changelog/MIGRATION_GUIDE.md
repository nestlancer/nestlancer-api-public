<div align="center">

# Migration Guide

</div>

---

## 📖 Table of Contents

- [Upgrading Between Versions](#upgrading-between-versions)
- [Database Migrations](#database-migrations)
- [Breaking Change Policy](#breaking-change-policy)
- [Rollback Procedure](#rollback-procedure)

---

## Upgrading Between Versions

### [v1.x → v2.x] (Future)

> [!NOTE]
> No breaking v2 changes planned yet. This document will be populated when API v2 is released.

---

## Database Migrations

All database migrations are managed via Prisma. To upgrade:

```bash
# Pull latest code
git pull origin main

# Install dependencies
pnpm install

# Run pending migrations
pnpm prisma migrate deploy

# Verify
pnpm prisma migrate status
```

---

## Breaking Change Policy

- **API v1**: No breaking changes. New fields may be added (backward compatible).
- **Deprecation**: Features deprecated in minor versions, removed in next major.
- **Communication**: Breaking changes announced 30 days before major release.

---

## Rollback Procedure

If a migration causes issues:

```bash
# Revert to previous version
scripts/deploy/rollback.sh --service=all

# Manual DB rollback (if needed)
scripts/db/restore.sh --backup=<backup-file>
```
