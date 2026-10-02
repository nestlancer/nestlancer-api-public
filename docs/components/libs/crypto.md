<div align="center">

# `@nestlancer/crypto` library

### bcrypt hashing, AES encryption, HMAC, TOTP for 2FA secrets.

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

auth, users

---

## Package layout

```
libs/crypto/src/
├── index.ts          # public exports
├── crypto.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/crypto": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/crypto` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/crypto';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/crypto` library** — Nestlancer backend component documentation

</div>
