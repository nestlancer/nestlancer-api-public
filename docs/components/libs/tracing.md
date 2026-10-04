# `@nestlancer/tracing` library

OpenTelemetry bootstrap and correlation-id middleware.

## Used by

Gateway, services

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/tracing` |
| **Source** | `libs/tracing/src/` |
| **Source files (non-spec `.ts`)** | 7 |
| **Exported symbols (via `index.ts`)** | 7 |
| **Workspace dependencies** | 2 |
| **External npm dependencies** | 9 |

## Package layout

Real directory tree of `libs/tracing/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── interceptors/
│   └── tracing.interceptor.ts
├── middleware/
│   └── correlation-id.middleware.ts
├── index.ts
├── install-http-observability.ts
├── otel-bootstrap.ts
├── tracing.module.ts
└── tracing.service.ts
```

## Public API (exported from `@nestlancer/tracing`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/tracing/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `TracingModule` | class | `tracing/src/tracing.module.ts` |

### Services (1)

| Export | Kind | Source |
| --- | --- | --- |
| `TracingService` | class | `tracing/src/tracing.service.ts` |

### Interceptors (1)

| Export | Kind | Source |
| --- | --- | --- |
| `TracingInterceptor` | class | `tracing/src/interceptors/tracing.interceptor.ts` |

### Middleware (1)

| Export | Kind | Source |
| --- | --- | --- |
| `CorrelationIdMiddleware` | class | `tracing/src/middleware/correlation-id.middleware.ts` |

### Other (3)

| Export | Kind | Source |
| --- | --- | --- |
| `initTracing` | function | `tracing/src/otel-bootstrap.ts` |
| `shutdownTracing` | function | `tracing/src/otel-bootstrap.ts` |
| `installHttpObservability` | function | `tracing/src/install-http-observability.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

- `@nestlancer/common`
- `@nestlancer/logger`

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@opentelemetry/auto-instrumentations-node` `^0.56.0`
- `@opentelemetry/exporter-trace-otlp-http` `^0.57.0`
- `@opentelemetry/resources` `^1.30.0`
- `@opentelemetry/sdk-node` `^0.57.0`
- `@opentelemetry/semantic-conventions` `^1.28.0`
- `rxjs` `^7.8.1`
- `@nestjs/core` `^10.0.0`
- `uuid` `^13.0.0`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/tracing": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/tracing` (see the Public API tables above for exact names)
3. Register `TracingModule` in the consuming app's root module (or a feature module)

```typescript
import { TracingModule } from '@nestlancer/tracing';

@Module({
  imports: [TracingModule],
})
export class AppModule {}
```

_Example above uses `TracingModule`, a real export of this package (modules defined in `tracing/src/tracing.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
