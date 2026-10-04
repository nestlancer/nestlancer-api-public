# `@nestlancer/outbox` library

Transactional outbox write API — insert event in same DB transaction as business write.

## Used by

Auth, payments, quotes, projects, etc.

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/outbox` |
| **Source** | `libs/outbox/src/` |
| **Source files (non-spec `.ts`)** | 8 |
| **Exported symbols (via `index.ts`)** | 11 |
| **Workspace dependencies** | 3 |
| **External npm dependencies** | 3 |

## Package layout

Real directory tree of `libs/outbox/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── interfaces/
│   └── outbox-event.interface.ts
├── index.ts
├── outbox-poller.service.ts
├── outbox-prisma.initializer.ts
├── outbox-routing.ts
├── outbox.module.ts
├── outbox.repository.ts
└── outbox.service.ts
```

## Public API (exported from `@nestlancer/outbox`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/outbox/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `OutboxModule` | class | `outbox/src/outbox.module.ts` |

### Services (2)

| Export | Kind | Source |
| --- | --- | --- |
| `OutboxService` | class | `outbox/src/outbox.service.ts` |
| `OutboxPollerService` | class | `outbox/src/outbox-poller.service.ts` |

### Repositories (1)

| Export | Kind | Source |
| --- | --- | --- |
| `OutboxRepository` | class | `outbox/src/outbox.repository.ts` |

### Interfaces (1)

| Export | Kind | Source |
| --- | --- | --- |
| `OutboxEventPayload` | interface | `outbox/src/interfaces/outbox-event.interface.ts` |

### Other (6)

| Export | Kind | Source |
| --- | --- | --- |
| `OUTBOX_TYPE_TO_ROUTING_KEY` | const | `outbox/src/outbox-routing.ts` |
| `getEventsExchange` | function | `outbox/src/outbox-routing.ts` |
| `LEGACY_OUTBOX_ROUTING_KEYS` | const | `outbox/src/outbox-routing.ts` |
| `OutboxRoutingTarget` | interface | `outbox/src/outbox-routing.ts` |
| `resolveOutboxRouting` | function | `outbox/src/outbox-routing.ts` |
| `PROJECTS_LIFECYCLE_BINDINGS` | const | `outbox/src/outbox-routing.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

- `@nestlancer/common`
- `@nestlancer/database`
- `@nestlancer/queue`

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/outbox": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/outbox` (see the Public API tables above for exact names)
3. Register `OutboxModule` in the consuming app's root module (or a feature module)

```typescript
import { OutboxModule } from '@nestlancer/outbox';

@Module({
  imports: [OutboxModule],
})
export class AppModule {}
```

_Example above uses `OutboxModule`, a real export of this package (modules defined in `outbox/src/outbox.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
