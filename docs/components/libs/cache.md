<div align="center">

# `@nestlancer/cache` library

### Redis cache with TTL and tag-based invalidation decorators (@Cacheable, @CacheInvalidate).

</div>

---

## 📖 Table of Contents

- [Used by](#used-by)
- [Package layout](#package-layout)
- [Workspace dependencies](#workspace-dependencies)
- [How to use in a service](#how-to-use-in-a-service)
- [📚 Related documentation](#related-documentation)

---

## Used by

High-read services (blog, portfolio, admin dashboard)

---

## Package layout

```
libs/cache/src/
├── index.ts          # public exports
├── cache.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/cache": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/cache` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/cache';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/cache` library** — Nestlancer backend component documentation

</div>
