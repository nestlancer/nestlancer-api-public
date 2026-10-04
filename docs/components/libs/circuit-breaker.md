# `@nestlancer/circuit-breaker` library

Opossum-style breaker for external HTTP (Razorpay, etc.).

## Used by

payments

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/circuit-breaker` |
| **Source** | `libs/circuit-breaker/src/` |
| **Source files (non-spec `.ts`)** | 5 |
| **Exported symbols (via `index.ts`)** | 6 |
| **Workspace dependencies** | none — leaf library |
| **External npm dependencies** | 3 |

## Package layout

Real directory tree of `libs/circuit-breaker/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── decorators/
│   └── circuit-breaker.decorator.ts
├── interfaces/
│   └── circuit-breaker.interface.ts
├── circuit-breaker.module.ts
├── circuit-breaker.service.ts
└── index.ts
```

## Public API (exported from `@nestlancer/circuit-breaker`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/circuit-breaker/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `CircuitBreakerModule` | class | `circuit-breaker/src/circuit-breaker.module.ts` |

### Services (1)

| Export | Kind | Source |
| --- | --- | --- |
| `CircuitBreakerService` | class | `circuit-breaker/src/circuit-breaker.service.ts` |

### Decorators (2)

| Export | Kind | Source |
| --- | --- | --- |
| `CIRCUIT_BREAKER_KEY` | const | `circuit-breaker/src/decorators/circuit-breaker.decorator.ts` |
| `WithCircuitBreaker` | const | `circuit-breaker/src/decorators/circuit-breaker.decorator.ts` |

### Interfaces (2)

| Export | Kind | Source |
| --- | --- | --- |
| `CircuitState` | enum | `circuit-breaker/src/interfaces/circuit-breaker.interface.ts` |
| `CircuitBreakerOptions` | interface | `circuit-breaker/src/interfaces/circuit-breaker.interface.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

_No internal @nestlancer deps — this is a leaf library other packages can depend on safely._

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/circuit-breaker": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/circuit-breaker` (see the Public API tables above for exact names)
3. Register `CircuitBreakerModule` in the consuming app's root module (or a feature module)

```typescript
import { CircuitBreakerModule } from '@nestlancer/circuit-breaker';

@Module({
  imports: [CircuitBreakerModule],
})
export class AppModule {}
```

_Example above uses `CircuitBreakerModule`, a real export of this package (modules defined in `circuit-breaker/src/circuit-breaker.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
