# `@nestlancer/documents` library

DocumentGenerationService: renders and versions quote/contract/invoice/receipt PDFs and GDPR/project/audit/revenue exports, writes DocumentNumber sequences, stores via @nestlancer/storage.

## Used by

admin, payments, projects, quotes, users; document-worker, export-worker

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/documents` |
| **Source** | `libs/documents/src/` |
| **Source files (non-spec `.ts`)** | 8 |
| **Exported symbols (via `index.ts`)** | 16 |
| **Workspace dependencies** | 4 |
| **External npm dependencies** | 4 |

## Package layout

Real directory tree of `libs/documents/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── interfaces/
│   └── document.interface.ts
├── document-generation.service.ts
├── document-number-aliases.ts
├── document-number.service.ts
├── document-storage.service.ts
├── documents.module.ts
├── index.ts
└── payment-document-context.ts
```

## Public API (exported from `@nestlancer/documents`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/documents/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `DocumentsModule` | class | `documents/src/documents.module.ts` |

### Services (3)

| Export | Kind | Source |
| --- | --- | --- |
| `DocumentNumberService` | class | `documents/src/document-number.service.ts` |
| `DocumentStorageService` | class | `documents/src/document-storage.service.ts` |
| `DocumentGenerationService` | class | `documents/src/document-generation.service.ts` |

### Interfaces (7)

| Export | Kind | Source |
| --- | --- | --- |
| `GenerateDocumentOptions` | interface | `documents/src/interfaces/document.interface.ts` |
| `GeneratedDocumentResult` | interface | `documents/src/interfaces/document.interface.ts` |
| `DocumentVersionInfo` | interface | `documents/src/interfaces/document.interface.ts` |
| `DocumentDownloadResult` | interface | `documents/src/interfaces/document.interface.ts` |
| `DOCUMENT_TYPE_PREFIX` | const | `documents/src/interfaces/document.interface.ts` |
| `DOCUMENT_BUCKET_MAP` | const | `documents/src/interfaces/document.interface.ts` |
| `DOCUMENT_STORAGE_PREFIX` | const | `documents/src/interfaces/document.interface.ts` |

### Other (5)

| Export | Kind | Source |
| --- | --- | --- |
| `expandDocumentNumberCandidates` | function | `documents/src/document-number-aliases.ts` |
| `isLegacyDocumentNumber` | function | `documents/src/document-number-aliases.ts` |
| `resolvePaymentReference` | function | `documents/src/payment-document-context.ts` |
| `buildPaymentDocumentContext` | function | `documents/src/payment-document-context.ts` |
| `paymentStatusLabel` | function | `documents/src/payment-document-context.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

- `@nestlancer/common`
- `@nestlancer/database`
- `@nestlancer/pdf`
- `@nestlancer/storage`

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/config` `^3.1.1`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/documents": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/documents` (see the Public API tables above for exact names)
3. Register `DocumentsModule` in the consuming app's root module (or a feature module)

```typescript
import { DocumentsModule } from '@nestlancer/documents';

@Module({
  imports: [DocumentsModule],
})
export class AppModule {}
```

_Example above uses `DocumentsModule`, a real export of this package (modules defined in `documents/src/documents.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
