<div align="center">

# `@nestlancer/circuit-breaker` library

### Opossum-style breaker for external HTTP (Razorpay, etc.).

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

payments

---

## Package layout

```
libs/circuit-breaker/src/
├── index.ts          # public exports
├── circuit-breaker.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/circuit-breaker": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/circuit-breaker` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/circuit-breaker';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/circuit-breaker` library** — Nestlancer backend component documentation

</div>
