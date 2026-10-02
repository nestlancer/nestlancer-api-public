<div align="center">

# `@nestlancer/outbox` library

### Transactional outbox write API — insert event in same DB transaction as business write.

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

Auth, payments, quotes, projects, etc.

---

## Package layout

```
libs/outbox/src/
├── index.ts          # public exports
├── outbox.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

- `@nestlancer/common`
- `@nestlancer/database`
- `@nestlancer/queue`

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/outbox": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/outbox` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/outbox';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/outbox` library** — Nestlancer backend component documentation

</div>
