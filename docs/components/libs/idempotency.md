# `@nestlancer/idempotency` library

Stores idempotency keys in Redis+PG for 24h; required on payment mutations.

## Used by

payments, gateway

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/idempotency` |
| **Source** | `libs/idempotency/src/` |
| **Source files (non-spec `.ts`)** | 8 |
| **Exported symbols (via `index.ts`)** | 8 |
| **Workspace dependencies** | 2 |
| **External npm dependencies** | 3 |

## Package layout

Real directory tree of `libs/idempotency/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── decorators/
│   └── idempotent.decorator.ts
├── interfaces/
│   └── idempotency.interface.ts
├── stores/
│   ├── database.store.ts
│   └── redis.store.ts
├── idempotency.guard.ts
├── idempotency.interceptor.ts
├── idempotency.module.ts
└── index.ts
```

## Public API (exported from `@nestlancer/idempotency`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/idempotency/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `IdempotencyModule` | class | `idempotency/src/idempotency.module.ts` |

### Guards (1)

| Export | Kind | Source |
| --- | --- | --- |
| `IdempotencyGuard` | class | `idempotency/src/idempotency.guard.ts` |

### Decorators (2)

| Export | Kind | Source |
| --- | --- | --- |
| `IDEMPOTENT_KEY` | const | `idempotency/src/decorators/idempotent.decorator.ts` |
| `Idempotent` | const | `idempotency/src/decorators/idempotent.decorator.ts` |

### Interfaces (1)

| Export | Kind | Source |
| --- | --- | --- |
| `IdempotencyRecord` | interface | `idempotency/src/interfaces/idempotency.interface.ts` |

### Other (3)

| Export | Kind | Source |
| --- | --- | --- |
| `IdempotencyInterceptor` | class | `idempotency/src/idempotency.interceptor.ts` |
| `RedisIdempotencyStore` | class | `idempotency/src/stores/redis.store.ts` |
| `DatabaseIdempotencyStore` | class | `idempotency/src/stores/database.store.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

- `@nestlancer/cache`
- `@nestlancer/database`

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/idempotency": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/idempotency` (see the Public API tables above for exact names)
3. Register `IdempotencyModule` in the consuming app's root module (or a feature module)

```typescript
import { IdempotencyModule } from '@nestlancer/idempotency';

@Module({
  imports: [IdempotencyModule],
})
export class AppModule {}
```

_Example above uses `IdempotencyModule`, a real export of this package (modules defined in `idempotency/src/idempotency.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
