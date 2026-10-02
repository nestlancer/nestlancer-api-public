<div align="center">

# `@nestlancer/websocket` library

### Socket.IO Redis adapter helpers, room manager, presence — shared with ws-gateway.

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

ws-gateway, notification-worker

---

## Package layout

```
libs/websocket/src/
├── index.ts          # public exports
├── websocket.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/websocket": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/websocket` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/websocket';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/websocket` library** — Nestlancer backend component documentation

</div>
