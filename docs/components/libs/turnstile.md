# `@nestlancer/turnstile` library

Cloudflare Turnstile server-side verification guard.

## Used by

auth, contact, gateway

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/turnstile` |
| **Source** | `libs/turnstile/src/` |
| **Source files (non-spec `.ts`)** | 6 |
| **Exported symbols (via `index.ts`)** | 6 |
| **Workspace dependencies** | 1 |
| **External npm dependencies** | 3 |

## Package layout

Real directory tree of `libs/turnstile/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── decorators/
│   └── require-turnstile.decorator.ts
├── interfaces/
│   └── turnstile.interface.ts
├── index.ts
├── turnstile.guard.ts
├── turnstile.module.ts
└── turnstile.service.ts
```

## Public API (exported from `@nestlancer/turnstile`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/turnstile/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `TurnstileModule` | class | `turnstile/src/turnstile.module.ts` |

### Services (1)

| Export | Kind | Source |
| --- | --- | --- |
| `TurnstileService` | class | `turnstile/src/turnstile.service.ts` |

### Guards (1)

| Export | Kind | Source |
| --- | --- | --- |
| `TurnstileGuard` | class | `turnstile/src/turnstile.guard.ts` |

### Decorators (2)

| Export | Kind | Source |
| --- | --- | --- |
| `REQUIRE_TURNSTILE_KEY` | const | `turnstile/src/decorators/require-turnstile.decorator.ts` |
| `RequireTurnstile` | const | `turnstile/src/decorators/require-turnstile.decorator.ts` |

### Interfaces (1)

| Export | Kind | Source |
| --- | --- | --- |
| `TurnstileResult` | interface | `turnstile/src/interfaces/turnstile.interface.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

- `@nestlancer/cache`

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/turnstile": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/turnstile` (see the Public API tables above for exact names)
3. Register `TurnstileModule` in the consuming app's root module (or a feature module)

```typescript
import { TurnstileModule } from '@nestlancer/turnstile';

@Module({
  imports: [TurnstileModule],
})
export class AppModule {}
```

_Example above uses `TurnstileModule`, a real export of this package (modules defined in `turnstile/src/turnstile.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
