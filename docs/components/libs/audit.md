<div align="center">

# `@nestlancer/audit` library

### @Auditable() decorator and audit writer — often combined with audit-worker.

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

admin, users, payments

---

## Package layout

```
libs/audit/src/
├── index.ts          # public exports
├── audit.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

- `@nestlancer/queue`
- `@nestlancer/database`

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/audit": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/audit` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/audit';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/audit` library** — Nestlancer backend component documentation

</div>
