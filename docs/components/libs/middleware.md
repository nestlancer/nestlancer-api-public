# `@nestlancer/middleware` library

Rate limiter tiers, maintenance mode, feature flags, Helmet, CORS helpers.

## Used by

gateway primarily

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/middleware` |
| **Source** | `libs/middleware/src/` |
| **Source files (non-spec `.ts`)** | 10 |
| **Exported symbols (via `index.ts`)** | 10 |
| **Workspace dependencies** | 2 |
| **External npm dependencies** | 5 |

## Package layout

Real directory tree of `libs/middleware/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── guards/
│   ├── maintenance-cache.ts
│   ├── maintenance.guard.ts
│   └── throttle.guard.ts
├── interceptors/
│   ├── cache.interceptor.ts
│   └── response-serializer.interceptor.ts
├── compression.config.ts
├── cors.config.ts
├── helmet.config.ts
├── index.ts
└── middleware.module.ts
```

## Public API (exported from `@nestlancer/middleware`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/middleware/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `MiddlewareModule` | class | `middleware/src/middleware.module.ts` |

### Guards (3)

| Export | Kind | Source |
| --- | --- | --- |
| `ThrottleGuard` | class | `middleware/src/guards/throttle.guard.ts` |
| `MaintenanceGuard` | class | `middleware/src/guards/maintenance.guard.ts` |
| `MAINTENANCE_CACHE_KEY` | const | `middleware/src/guards/maintenance-cache.ts` |

### Interceptors (3)

| Export | Kind | Source |
| --- | --- | --- |
| `ResponseSerializerInterceptor` | class | `middleware/src/interceptors/response-serializer.interceptor.ts` |
| `CacheInterceptor` | class | `middleware/src/interceptors/cache.interceptor.ts` |
| `shouldCacheResponse` | function | `middleware/src/interceptors/cache.interceptor.ts` |

### Other (3)

| Export | Kind | Source |
| --- | --- | --- |
| `getCorsConfig` | function | `middleware/src/cors.config.ts` |
| `getHelmetConfig` | function | `middleware/src/helmet.config.ts` |
| `getCompressionConfig` | function | `middleware/src/compression.config.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

- `@nestlancer/cache`
- `@nestlancer/common`

### External (npm)

- `@nestjs/common` `^10.0.0`
- `helmet` `^7.0.0`
- `compression` `^1.7.0`
- `rxjs` `^7.8.1`
- `@nestjs/core` `^10.0.0`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/middleware": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/middleware` (see the Public API tables above for exact names)
3. Register `MiddlewareModule` in the consuming app's root module (or a feature module)

```typescript
import { MiddlewareModule } from '@nestlancer/middleware';

@Module({
  imports: [MiddlewareModule],
})
export class AppModule {}
```

_Example above uses `MiddlewareModule`, a real export of this package (modules defined in `middleware/src/middleware.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
