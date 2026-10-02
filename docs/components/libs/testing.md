<div align="center">

# `@nestlancer/testing` library

### Factories, Prisma/Redis/RabbitMQ mocks, auth helpers for Jest.

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

All test suites

---

## Package layout

```
libs/testing/src/
├── index.ts          # public exports
├── testing.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/testing": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/testing` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/testing';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/testing` library** — Nestlancer backend component documentation

</div>
