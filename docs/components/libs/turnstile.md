<div align="center">

# `@nestlancer/turnstile` library

### Cloudflare Turnstile server-side verification guard.

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

auth, contact, gateway

---

## Package layout

```
libs/turnstile/src/
├── index.ts          # public exports
├── turnstile.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

- `@nestlancer/cache`

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/turnstile": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/turnstile` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/turnstile';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/turnstile` library** — Nestlancer backend component documentation

</div>
