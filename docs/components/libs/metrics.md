# `@nestlancer/metrics` library

Prometheus HTTP/DB/queue metrics collectors and interceptor.

## Used by

Gateway, workers

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/metrics` |
| **Source** | `libs/metrics/src/` |
| **Source files (non-spec `.ts`)** | 13 |
| **Exported symbols (via `index.ts`)** | 15 |
| **Workspace dependencies** | none — leaf library |
| **External npm dependencies** | 4 |

## Package layout

Real directory tree of `libs/metrics/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── collectors/
│   ├── cache.collector.ts
│   ├── custom.collector.ts
│   ├── database.collector.ts
│   ├── http.collector.ts
│   └── queue.collector.ts
├── interceptors/
│   └── metrics.interceptor.ts
├── interfaces/
│   └── metric.interface.ts
├── bootstrap.ts
├── http-route.ts
├── index.ts
├── metrics-server.ts
├── metrics.module.ts
└── metrics.service.ts
```

## Public API (exported from `@nestlancer/metrics`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/metrics/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `MetricsModule` | class | `metrics/src/metrics.module.ts` |

### Services (1)

| Export | Kind | Source |
| --- | --- | --- |
| `MetricsService` | class | `metrics/src/metrics.service.ts` |

### Interceptors (1)

| Export | Kind | Source |
| --- | --- | --- |
| `MetricsInterceptor` | class | `metrics/src/interceptors/metrics.interceptor.ts` |

### Interfaces (3)

| Export | Kind | Source |
| --- | --- | --- |
| `MetricLabels` | interface | `metrics/src/interfaces/metric.interface.ts` |
| `CounterMetric` | interface | `metrics/src/interfaces/metric.interface.ts` |
| `HistogramMetric` | interface | `metrics/src/interfaces/metric.interface.ts` |

### Other (9)

| Export | Kind | Source |
| --- | --- | --- |
| `MetricsServerOptions` | interface | `metrics/src/metrics-server.ts` |
| `startMetricsServer` | function | `metrics/src/metrics-server.ts` |
| `stopMetricsServer` | function | `metrics/src/metrics-server.ts` |
| `bootstrapMetrics` | function | `metrics/src/bootstrap.ts` |
| `HttpMetricsCollector` | class | `metrics/src/collectors/http.collector.ts` |
| `QueueMetricsCollector` | class | `metrics/src/collectors/queue.collector.ts` |
| `DatabaseMetricsCollector` | class | `metrics/src/collectors/database.collector.ts` |
| `CacheMetricsCollector` | class | `metrics/src/collectors/cache.collector.ts` |
| `CustomMetricsCollector` | class | `metrics/src/collectors/custom.collector.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

_No internal @nestlancer deps — this is a leaf library other packages can depend on safely._

### External (npm)

- `@nestjs/common` `^10.0.0`
- `prom-client` `^15.0.0`
- `rxjs` `^7.8.1`
- `@nestjs/core` `^10.0.0`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/metrics": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/metrics` (see the Public API tables above for exact names)
3. Register `MetricsModule` in the consuming app's root module (or a feature module)

```typescript
import { MetricsModule } from '@nestlancer/metrics';

@Module({
  imports: [MetricsModule],
})
export class AppModule {}
```

_Example above uses `MetricsModule`, a real export of this package (modules defined in `metrics/src/metrics.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
