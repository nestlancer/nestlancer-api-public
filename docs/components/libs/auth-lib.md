<div align="center">

# `@nestlancer/auth-lib` library

### JwtAuthGuard, RolesGuard, PermissionsGuard, strategies, @CurrentUser(), CSRF helpers.

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

Gateway + services exposing user/admin routes

---

## Package layout

```
libs/auth-lib/src/
├── index.ts          # public exports
├── auth-lib.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

- `@nestlancer/common`

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/auth-lib": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/auth-lib` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/auth-lib';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/auth-lib` library** — Nestlancer backend component documentation

</div>
