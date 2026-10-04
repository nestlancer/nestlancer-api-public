# `@nestlancer/health-lib` library

Terminus-style indicators for DB, Redis, RabbitMQ, disk, memory.

## Used by

health service

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/health-lib` |
| **Source** | `libs/health-lib/src/` |
| **Source files (non-spec `.ts`)** | 9 |
| **Exported symbols (via `index.ts`)** | 9 |
| **Workspace dependencies** | 1 |
| **External npm dependencies** | 3 |

## Package layout

Real directory tree of `libs/health-lib/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── indicators/
│   ├── database.indicator.ts
│   ├── disk.indicator.ts
│   ├── memory.indicator.ts
│   ├── rabbitmq.indicator.ts
│   ├── redis.indicator.ts
│   └── storage.indicator.ts
├── interfaces/
│   └── health.interface.ts
├── health-lib.module.ts
└── index.ts
```

## Public API (exported from `@nestlancer/health-lib`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/health-lib/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `HealthLibModule` | class | `health-lib/src/health-lib.module.ts` |

### Interfaces (2)

| Export | Kind | Source |
| --- | --- | --- |
| `HealthCheckResult` | interface | `health-lib/src/interfaces/health.interface.ts` |
| `AggregatedHealthResult` | interface | `health-lib/src/interfaces/health.interface.ts` |

### Other (6)

| Export | Kind | Source |
| --- | --- | --- |
| `DatabaseHealthIndicator` | class | `health-lib/src/indicators/database.indicator.ts` |
| `RedisHealthIndicator` | class | `health-lib/src/indicators/redis.indicator.ts` |
| `RabbitmqHealthIndicator` | class | `health-lib/src/indicators/rabbitmq.indicator.ts` |
| `StorageHealthIndicator` | class | `health-lib/src/indicators/storage.indicator.ts` |
| `MemoryHealthIndicator` | class | `health-lib/src/indicators/memory.indicator.ts` |
| `DiskHealthIndicator` | class | `health-lib/src/indicators/disk.indicator.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

- `@nestlancer/storage`

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/health-lib": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/health-lib` (see the Public API tables above for exact names)
3. Register `HealthLibModule` in the consuming app's root module (or a feature module)

```typescript
import { HealthLibModule } from '@nestlancer/health-lib';

@Module({
  imports: [HealthLibModule],
})
export class AppModule {}
```

_Example above uses `HealthLibModule`, a real export of this package (modules defined in `health-lib/src/health-lib.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
