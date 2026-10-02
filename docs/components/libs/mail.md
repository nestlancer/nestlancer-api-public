<div align="center">

# `@nestlancer/mail` library

### Provider abstraction over ZeptoMail/SES/SMTP used by email-worker.

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

email-worker

---

## Package layout

```
libs/mail/src/
├── index.ts          # public exports
├── mail.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/mail": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/mail` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/mail';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/mail` library** — Nestlancer backend component documentation

</div>
