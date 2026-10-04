# `@nestlancer/alerts` library

Slack/PagerDuty/email alert channels for ops runbooks.

## Used by

health, gateway

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/alerts` |
| **Source** | `libs/alerts/src/` |
| **Source files (non-spec `.ts`)** | 8 |
| **Exported symbols (via `index.ts`)** | 7 |
| **Workspace dependencies** | none — leaf library |
| **External npm dependencies** | 3 |

## Package layout

Real directory tree of `libs/alerts/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── channels/
│   ├── email-alert.channel.ts
│   ├── pagerduty.channel.ts
│   └── slack.channel.ts
├── interfaces/
│   └── alert.interface.ts
├── rules/
│   └── alert-rules.config.ts
├── alerts.module.ts
├── alerts.service.ts
└── index.ts
```

## Public API (exported from `@nestlancer/alerts`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/alerts/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `AlertsModule` | class | `alerts/src/alerts.module.ts` |

### Services (1)

| Export | Kind | Source |
| --- | --- | --- |
| `AlertsService` | class | `alerts/src/alerts.service.ts` |

### Interfaces (1)

| Export | Kind | Source |
| --- | --- | --- |
| `AlertPayload` | interface | `alerts/src/interfaces/alert.interface.ts` |

### Other (4)

| Export | Kind | Source |
| --- | --- | --- |
| `PagerdutyChannel` | class | `alerts/src/channels/pagerduty.channel.ts` |
| `SlackChannel` | class | `alerts/src/channels/slack.channel.ts` |
| `EmailAlertChannel` | class | `alerts/src/channels/email-alert.channel.ts` |
| `ALERT_RULES` | const | `alerts/src/rules/alert-rules.config.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

_No internal @nestlancer deps — this is a leaf library other packages can depend on safely._

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/alerts": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/alerts` (see the Public API tables above for exact names)
3. Register `AlertsModule` in the consuming app's root module (or a feature module)

```typescript
import { AlertsModule } from '@nestlancer/alerts';

@Module({
  imports: [AlertsModule],
})
export class AppModule {}
```

_Example above uses `AlertsModule`, a real export of this package (modules defined in `alerts/src/alerts.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
