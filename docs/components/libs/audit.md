# `@nestlancer/audit` library

@Auditable() decorator and audit writer — often combined with audit-worker.

## Used by

admin, users, payments

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/audit` |
| **Source** | `libs/audit/src/` |
| **Source files (non-spec `.ts`)** | 8 |
| **Exported symbols (via `index.ts`)** | 10 |
| **Workspace dependencies** | 3 |
| **External npm dependencies** | 3 |

## Package layout

Real directory tree of `libs/audit/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── decorators/
│   └── auditable.decorator.ts
├── interfaces/
│   ├── audit-context.interface.ts
│   └── audit-entry.interface.ts
├── audit-queue.service.ts
├── audit-writer.service.ts
├── audit.module.ts
├── audit.repository.ts
└── index.ts
```

## Public API (exported from `@nestlancer/audit`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/audit/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `AuditModule` | class | `audit/src/audit.module.ts` |

### Services (4)

| Export | Kind | Source |
| --- | --- | --- |
| `AuditWriterService` | class | `audit/src/audit-writer.service.ts` |
| `AuditQueueEntry` | type | `audit/src/audit-queue.service.ts` |
| `publishAuditEntry` | function | `audit/src/audit-queue.service.ts` |
| `publishAuditEntrySafe` | function | `audit/src/audit-queue.service.ts` |

### Repositories (1)

| Export | Kind | Source |
| --- | --- | --- |
| `AuditRepository` | class | `audit/src/audit.repository.ts` |

### Decorators (2)

| Export | Kind | Source |
| --- | --- | --- |
| `AUDITABLE_KEY` | const | `audit/src/decorators/auditable.decorator.ts` |
| `Auditable` | const | `audit/src/decorators/auditable.decorator.ts` |

### Interfaces (2)

| Export | Kind | Source |
| --- | --- | --- |
| `AuditEntry` | interface | `audit/src/interfaces/audit-entry.interface.ts` |
| `AuditContext` | interface | `audit/src/interfaces/audit-context.interface.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

- `@nestlancer/common`
- `@nestlancer/queue`
- `@nestlancer/database`

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/audit": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/audit` (see the Public API tables above for exact names)
3. Register `AuditModule` in the consuming app's root module (or a feature module)

```typescript
import { AuditModule } from '@nestlancer/audit';

@Module({
  imports: [AuditModule],
})
export class AppModule {}
```

_Example above uses `AuditModule`, a real export of this package (modules defined in `audit/src/audit.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
