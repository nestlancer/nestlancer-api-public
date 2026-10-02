<div align="center">

# `@nestlancer/logger` library

### Structured JSON logging with correlation ID and request middleware.

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

All apps

---

## Package layout

```
libs/logger/src/
├── index.ts          # public exports
├── logger.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/logger": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/logger` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/logger';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/logger` library** — Nestlancer backend component documentation

</div>
