# `@nestlancer/cache` library

Redis cache with TTL and tag-based invalidation decorators (@Cacheable, @CacheInvalidate).

## Used by

High-read services (blog, portfolio, admin dashboard)

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/cache` |
| **Source** | `libs/cache/src/` |
| **Source files (non-spec `.ts`)** | 10 |
| **Exported symbols (via `index.ts`)** | 13 |
| **Workspace dependencies** | none — leaf library |
| **External npm dependencies** | 4 |

## Package layout

Real directory tree of `libs/cache/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── decorators/
│   ├── cache-invalidate.decorator.ts
│   └── cacheable.decorator.ts
├── interfaces/
│   └── cache-options.interface.ts
├── strategies/
│   ├── tag-invalidation.strategy.ts
│   └── ttl.strategy.ts
├── access-token-revocation.service.ts
├── cache.module.ts
├── cache.service.ts
├── index.ts
└── worker-heartbeat.service.ts
```

## Public API (exported from `@nestlancer/cache`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/cache/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `CacheModule` | class | `cache/src/cache.module.ts` |

### Services (4)

| Export | Kind | Source |
| --- | --- | --- |
| `RefreshRotationGrace` | type | `cache/src/access-token-revocation.service.ts` |
| `AccessTokenRevocationService` | class | `cache/src/access-token-revocation.service.ts` |
| `CacheService` | class | `cache/src/cache.service.ts` |
| `WorkerHeartbeatService` | class | `cache/src/worker-heartbeat.service.ts` |

### Strategies (2)

| Export | Kind | Source |
| --- | --- | --- |
| `TtlStrategy` | class | `cache/src/strategies/ttl.strategy.ts` |
| `TagInvalidationStrategy` | class | `cache/src/strategies/tag-invalidation.strategy.ts` |

### Decorators (5)

| Export | Kind | Source |
| --- | --- | --- |
| `CACHEABLE_KEY` | const | `cache/src/decorators/cacheable.decorator.ts` |
| `CacheableOptions` | interface | `cache/src/decorators/cacheable.decorator.ts` |
| `Cacheable` | const | `cache/src/decorators/cacheable.decorator.ts` |
| `CACHE_INVALIDATE_KEY` | const | `cache/src/decorators/cache-invalidate.decorator.ts` |
| `CacheInvalidate` | const | `cache/src/decorators/cache-invalidate.decorator.ts` |

### Interfaces (1)

| Export | Kind | Source |
| --- | --- | --- |
| `CacheModuleOptions` | interface | `cache/src/interfaces/cache-options.interface.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

_No internal @nestlancer deps — this is a leaf library other packages can depend on safely._

### External (npm)

- `@nestjs/common` `^10.0.0`
- `ioredis` `^5.3.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/cache": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/cache` (see the Public API tables above for exact names)
3. Register `CacheModule` in the consuming app's root module (or a feature module)

```typescript
import { CacheModule } from '@nestlancer/cache';

@Module({
  imports: [CacheModule],
})
export class AppModule {}
```

_Example above uses `CacheModule`, a real export of this package (modules defined in `cache/src/cache.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
