<div align="center">

# `@nestlancer/common` library

### Foundation: API envelope types, enums, decorators (@Public, @Roles), filters, interceptors, money/pagination utils.

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

Every service and gateway

---

## Package layout

```
libs/common/src/
├── index.ts          # public exports
├── common.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/common": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/common` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/common';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/common` library** — Nestlancer backend component documentation

</div>
