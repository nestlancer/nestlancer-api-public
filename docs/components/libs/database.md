# `@nestlancer/database` library

PrismaModule with PrismaWriteService / PrismaReadService, @Transactional(), base repository.

## Used by

All domain services

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/database` |
| **Source** | `libs/database/src/` |
| **Source files (non-spec `.ts`)** | 12 |
| **Exported symbols (via `index.ts`)** | 15 |
| **Workspace dependencies** | none — leaf library |
| **External npm dependencies** | 5 |

## Package layout

Real directory tree of `libs/database/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── decorators/
│   ├── read-only.decorator.ts
│   └── transactional.decorator.ts
├── utils/
│   ├── must-change-password.util.ts
│   ├── pagination.util.ts
│   ├── pg-pool.util.ts
│   ├── query-builder.util.ts
│   └── soft-delete.util.ts
├── base.repository.ts
├── database.module.ts
├── index.ts
├── prisma-read.service.ts
└── prisma-write.service.ts
```

## Public API (exported from `@nestlancer/database`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/database/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `DatabaseModule` | class | `database/src/database.module.ts` |

### Services (2)

| Export | Kind | Source |
| --- | --- | --- |
| `PrismaWriteService` | class | `database/src/prisma-write.service.ts` |
| `PrismaReadService` | class | `database/src/prisma-read.service.ts` |

### Repositories (1)

| Export | Kind | Source |
| --- | --- | --- |
| `BaseRepository` | class | `database/src/base.repository.ts` |

### Decorators (4)

| Export | Kind | Source |
| --- | --- | --- |
| `IS_READ_ONLY` | const | `database/src/decorators/read-only.decorator.ts` |
| `ReadOnly` | const | `database/src/decorators/read-only.decorator.ts` |
| `IS_TRANSACTIONAL` | const | `database/src/decorators/transactional.decorator.ts` |
| `Transactional` | const | `database/src/decorators/transactional.decorator.ts` |

### Utilities (7)

| Export | Kind | Source |
| --- | --- | --- |
| `buildOrderBy` | function | `database/src/utils/query-builder.util.ts` |
| `NOT_DELETED` | const | `database/src/utils/soft-delete.util.ts` |
| `SOFT_DELETE` | const | `database/src/utils/soft-delete.util.ts` |
| `buildPrismaSkipTake` | function | `database/src/utils/pagination.util.ts` |
| `createPgPool` | function | `database/src/utils/pg-pool.util.ts` |
| `readMustChangePassword` | function | `database/src/utils/must-change-password.util.ts` |
| `setMustChangePassword` | function | `database/src/utils/must-change-password.util.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

_No internal @nestlancer deps — this is a leaf library other packages can depend on safely._

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@prisma/client` `^7.4.1`
- `prisma` `^7.4.1`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/database": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/database` (see the Public API tables above for exact names)
3. Register `DatabaseModule` in the consuming app's root module (or a feature module)

```typescript
import { DatabaseModule } from '@nestlancer/database';

@Module({
  imports: [DatabaseModule],
})
export class AppModule {}
```

_Example above uses `DatabaseModule`, a real export of this package (modules defined in `database/src/database.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
