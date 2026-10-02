<div align="center">

# `@nestlancer/metrics` library

### Prometheus HTTP/DB/queue metrics collectors and interceptor.

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

Gateway, workers

---

## Package layout

```
libs/metrics/src/
├── index.ts          # public exports
├── metrics.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/metrics": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/metrics` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/metrics';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/metrics` library** — Nestlancer backend component documentation

</div>
