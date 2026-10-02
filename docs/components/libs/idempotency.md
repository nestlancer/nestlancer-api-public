<div align="center">

# `@nestlancer/idempotency` library

### Stores idempotency keys in Redis+PG for 24h; required on payment mutations.

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

payments, gateway

---

## Package layout

```
libs/idempotency/src/
├── index.ts          # public exports
├── idempotency.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

- `@nestlancer/cache`
- `@nestlancer/database`

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/idempotency": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/idempotency` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/idempotency';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/idempotency` library** — Nestlancer backend component documentation

</div>
