# `@nestlancer/queue` library

RabbitMQ publisher/consumer helpers, routing key constants, DLQ service.

## Used by

Services emitting events; all workers

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/queue` |
| **Source** | `libs/queue/src/` |
| **Source files (non-spec `.ts`)** | 11 |
| **Exported symbols (via `index.ts`)** | 14 |
| **Workspace dependencies** | 1 |
| **External npm dependencies** | 5 |

## Package layout

Real directory tree of `libs/queue/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── decorators/
│   ├── consume.decorator.ts
│   ├── process.decorator.ts
│   └── processor.decorator.ts
├── exchanges/
│   └── index.ts
├── interfaces/
│   └── queue-message.interface.ts
├── routing-keys/
│   └── index.ts
├── dlq.service.ts
├── index.ts
├── queue-consumer.service.ts
├── queue-publisher.service.ts
└── queue.module.ts
```

## Public API (exported from `@nestlancer/queue`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/queue/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (2)

| Export | Kind | Source |
| --- | --- | --- |
| `QueueModuleAsyncOptions` | interface | `queue/src/queue.module.ts` |
| `QueueModule` | class | `queue/src/queue.module.ts` |

### Services (3)

| Export | Kind | Source |
| --- | --- | --- |
| `QueuePublisherService` | class | `queue/src/queue-publisher.service.ts` |
| `QueueConsumerService` | class | `queue/src/queue-consumer.service.ts` |
| `DlqService` | class | `queue/src/dlq.service.ts` |

### Decorators (6)

| Export | Kind | Source |
| --- | --- | --- |
| `CONSUME_KEY` | const | `queue/src/decorators/consume.decorator.ts` |
| `Consume` | const | `queue/src/decorators/consume.decorator.ts` |
| `PROCESSOR_KEY` | const | `queue/src/decorators/processor.decorator.ts` |
| `Processor` | const | `queue/src/decorators/processor.decorator.ts` |
| `PROCESS_KEY` | const | `queue/src/decorators/process.decorator.ts` |
| `Process` | const | `queue/src/decorators/process.decorator.ts` |

### Interfaces (1)

| Export | Kind | Source |
| --- | --- | --- |
| `QueueMessage` | interface | `queue/src/interfaces/queue-message.interface.ts` |

### Routing keys (1)

| Export | Kind | Source |
| --- | --- | --- |
| `ROUTING_KEYS` | const | `queue/src/routing-keys/index.ts` |

### Exchanges (1)

| Export | Kind | Source |
| --- | --- | --- |
| `EXCHANGES` | const | `queue/src/exchanges/index.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

- `@nestlancer/common`

### External (npm)

- `@nestjs/common` `^10.0.0`
- `amqplib` `^0.10.0`
- `@types/amqplib` `^0.10.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/queue": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/queue` (see the Public API tables above for exact names)
3. Register `QueueModuleAsyncOptions` in the consuming app's root module (or a feature module)

```typescript
import { QueueModuleAsyncOptions } from '@nestlancer/queue';

@Module({
  imports: [QueueModuleAsyncOptions],
})
export class AppModule {}
```

_Example above uses `QueueModuleAsyncOptions`, a real export of this package (modules defined in `queue/src/queue.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
