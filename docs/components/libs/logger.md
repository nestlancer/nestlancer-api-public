# `@nestlancer/logger` library

Structured JSON logging with correlation ID and request middleware.

## Used by

All apps

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/logger` |
| **Source** | `libs/logger/src/` |
| **Source files (non-spec `.ts`)** | 11 |
| **Exported symbols (via `index.ts`)** | 9 |
| **Workspace dependencies** | 1 |
| **External npm dependencies** | 3 |

## Package layout

Real directory tree of `libs/logger/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── formatters/
│   ├── json.formatter.ts
│   └── pretty.formatter.ts
├── middleware/
│   └── request-logger.middleware.ts
├── transports/
│   ├── console.transport.ts
│   └── file.transport.ts
├── index.ts
├── install-json-console-logger.ts
├── log-context.ts
├── logger.module.ts
├── logger.service.ts
└── write-log.ts
```

## Public API (exported from `@nestlancer/logger`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/logger/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `LoggerModule` | class | `logger/src/logger.module.ts` |

### Services (1)

| Export | Kind | Source |
| --- | --- | --- |
| `NestlancerLoggerService` | class | `logger/src/logger.service.ts` |

### Middleware (1)

| Export | Kind | Source |
| --- | --- | --- |
| `RequestLoggerMiddleware` | class | `logger/src/middleware/request-logger.middleware.ts` |

### Transports (3)

| Export | Kind | Source |
| --- | --- | --- |
| `ConsoleTransport` | class | `logger/src/transports/console.transport.ts` |
| `FileTransportOptions` | interface | `logger/src/transports/file.transport.ts` |
| `FileTransport` | class | `logger/src/transports/file.transport.ts` |

### Formatters (2)

| Export | Kind | Source |
| --- | --- | --- |
| `formatJson` | function | `logger/src/formatters/json.formatter.ts` |
| `formatPretty` | function | `logger/src/formatters/pretty.formatter.ts` |

### Other (1)

| Export | Kind | Source |
| --- | --- | --- |
| `installJsonConsoleLogger` | function | `logger/src/install-json-console-logger.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

- `@nestlancer/common`

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/logger": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/logger` (see the Public API tables above for exact names)
3. Register `LoggerModule` in the consuming app's root module (or a feature module)

```typescript
import { LoggerModule } from '@nestlancer/logger';

@Module({
  imports: [LoggerModule],
})
export class AppModule {}
```

_Example above uses `LoggerModule`, a real export of this package (modules defined in `logger/src/logger.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
