<div align="center">

# `@nestlancer/pdf` library

### PDFKit templates for quotes, invoices, receipts.

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

quotes, payments

---

## Package layout

```
libs/pdf/src/
├── index.ts          # public exports
├── pdf.module.ts # NestJS DynamicModule (if applicable)
└── …
```

---

## Workspace dependencies

_No internal @nestlancer deps — leaf library._

---

## How to use in a service

1. Add to `package.json`: `"@nestlancer/pdf": "workspace:*"`
2. Import module in `app.module.ts`
3. Import symbols from `@nestlancer/pdf` in controllers/services

```typescript
import {} from /* … */ '@nestlancer/pdf';
```

---

## 📚 Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)

---

<div align="center">

**`@nestlancer/pdf` library** — Nestlancer backend component documentation

</div>
