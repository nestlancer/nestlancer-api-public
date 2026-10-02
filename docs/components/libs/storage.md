<div align="center">

# `@nestlancer/storage` library

### S3-compatible object storage, presigned PUT/GET, content-type detection.

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

media, users (avatar)

---

## Package layout

```
libs/storage/src/
├── index.ts          # public exports
├── storage.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/storage": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/storage` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/storage';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/storage` library** — Nestlancer backend component documentation

</div>
