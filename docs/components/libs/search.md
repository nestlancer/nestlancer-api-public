<div align="center">

# `@nestlancer/search` library

### Prisma filter/sort builder for list endpoints.

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

blog, portfolio, requests

---

## Package layout

```
libs/search/src/
├── index.ts          # public exports
├── search.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/search": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/search` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/search';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/search` library** — Nestlancer backend component documentation

</div>
