<div align="center">

# `@nestlancer/queue` library

### RabbitMQ publisher/consumer helpers, routing key constants, DLQ service.

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

Services emitting events; all workers

---

## Package layout

```
libs/queue/src/
├── index.ts          # public exports
├── queue.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/queue": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/queue` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/queue';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/queue` library** — Nestlancer backend component documentation

</div>
