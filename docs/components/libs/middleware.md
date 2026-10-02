<div align="center">

# `@nestlancer/middleware` library

### Rate limiter tiers, maintenance mode, feature flags, Helmet, CORS helpers.

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

gateway primarily

---

## Package layout

```
libs/middleware/src/
├── index.ts          # public exports
├── middleware.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/middleware": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/middleware` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/middleware';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/middleware` library** — Nestlancer backend component documentation

</div>
