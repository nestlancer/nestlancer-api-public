# `@nestlancer/websocket` library

Socket.IO Redis adapter helpers, room manager, presence — shared with ws-gateway.

## Used by

ws-gateway, notification-worker

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/websocket` |
| **Source** | `libs/websocket/src/` |
| **Source files (non-spec `.ts`)** | 8 |
| **Exported symbols (via `index.ts`)** | 10 |
| **Workspace dependencies** | none — leaf library |
| **External npm dependencies** | 8 |

## Package layout

Real directory tree of `libs/websocket/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── adapters/
│   └── redis.adapter.ts
├── decorators/
│   └── ws-auth.decorator.ts
├── guards/
│   ├── ws-auth.guard.ts
│   └── ws-throttle.guard.ts
├── interfaces/
│   └── ws-event.interface.ts
├── utils/
│   └── ws-auth.util.ts
├── index.ts
└── websocket-lib.module.ts
```

## Public API (exported from `@nestlancer/websocket`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/websocket/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `WebSocketLibModule` | class | `websocket/src/websocket-lib.module.ts` |

### Guards (2)

| Export | Kind | Source |
| --- | --- | --- |
| `WsAuthGuard` | class | `websocket/src/guards/ws-auth.guard.ts` |
| `WsThrottleGuard` | class | `websocket/src/guards/ws-throttle.guard.ts` |

### Decorators (1)

| Export | Kind | Source |
| --- | --- | --- |
| `WsCurrentUser` | const | `websocket/src/decorators/ws-auth.decorator.ts` |

### Interfaces (2)

| Export | Kind | Source |
| --- | --- | --- |
| `WsEvent` | interface | `websocket/src/interfaces/ws-event.interface.ts` |
| `WsRoom` | interface | `websocket/src/interfaces/ws-event.interface.ts` |

### Utilities (3)

| Export | Kind | Source |
| --- | --- | --- |
| `WsAuthenticatedUser` | type | `websocket/src/utils/ws-auth.util.ts` |
| `extractWsToken` | function | `websocket/src/utils/ws-auth.util.ts` |
| `attachAuthenticatedWsUser` | function | `websocket/src/utils/ws-auth.util.ts` |

### Other (1)

| Export | Kind | Source |
| --- | --- | --- |
| `RedisIoAdapter` | class | `websocket/src/adapters/redis.adapter.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

_No internal @nestlancer deps — this is a leaf library other packages can depend on safely._

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/websockets` `^10.0.0`
- `@nestjs/platform-socket.io` `^10.0.0`
- `socket.io` `^4.7.0`
- `ioredis` `^5.3.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`
- `jsonwebtoken` `^9.0.2`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/websocket": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/websocket` (see the Public API tables above for exact names)
3. Register `WebSocketLibModule` in the consuming app's root module (or a feature module)

```typescript
import { WebSocketLibModule } from '@nestlancer/websocket';

@Module({
  imports: [WebSocketLibModule],
})
export class AppModule {}
```

_Example above uses `WebSocketLibModule`, a real export of this package (modules defined in `websocket/src/websocket-lib.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
