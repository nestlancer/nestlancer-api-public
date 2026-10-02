<div align="center">

# `@nestlancer/config` library

### Zod-validated env loading (database, Redis, JWT, Razorpay, CORS, rate limits) via ConfigService.

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
libs/config/src/
├── index.ts          # public exports
├── config.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/config": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/config` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/config';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/config` library** — Nestlancer backend component documentation

</div>
