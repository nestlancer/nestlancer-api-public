<div align="center">

# `@nestlancer/health-lib` library

### Terminus-style indicators for DB, Redis, RabbitMQ, disk, memory.

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

health service

---

## Package layout

```
libs/health-lib/src/
├── index.ts          # public exports
├── health-lib.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

- `@nestlancer/storage`

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/health-lib": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/health-lib` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/health-lib';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/health-lib` library** — Nestlancer backend component documentation

</div>
