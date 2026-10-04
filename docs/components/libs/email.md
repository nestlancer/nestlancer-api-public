# `@nestlancer/email` library

Email job interface/mapper and EmailQueueService — normalizes outbound email jobs onto the queue for email-worker to render and send.

## Used by

auth, contact; email-worker, notification-worker

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/email` |
| **Source** | `libs/email/src/` |
| **Source files (non-spec `.ts`)** | 5 |
| **Exported symbols (via `index.ts`)** | 14 |
| **Workspace dependencies** | 2 |
| **External npm dependencies** | none beyond NestJS/TS tooling |

## Package layout

Real directory tree of `libs/email/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── email-job.interface.ts
├── email-job.mapper.ts
├── email-queue.service.ts
├── email-sender.config.ts
└── index.ts
```

## Public API (exported from `@nestlancer/email`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/email/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Services (2)

| Export | Kind | Source |
| --- | --- | --- |
| `publishEmailJob` | function | `email/src/email-queue.service.ts` |
| `publishEmailJobs` | function | `email/src/email-queue.service.ts` |

### Interfaces (5)

| Export | Kind | Source |
| --- | --- | --- |
| `EmailJobType` | enum | `email/src/email-job.interface.ts` |
| `EmailSenderProfile` | type | `email/src/email-job.interface.ts` |
| `EmailAttachment` | interface | `email/src/email-job.interface.ts` |
| `EmailJob` | interface | `email/src/email-job.interface.ts` |
| `isEmailJob` | function | `email/src/email-job.interface.ts` |

### Other (7)

| Export | Kind | Source |
| --- | --- | --- |
| `EmailSenderConfig` | interface | `email/src/email-sender.config.ts` |
| `loadEmailSenderConfig` | function | `email/src/email-sender.config.ts` |
| `resolveEmailFrom` | function | `email/src/email-sender.config.ts` |
| `resolveEmailReplyTo` | function | `email/src/email-sender.config.ts` |
| `EmailJobMapperContext` | interface | `email/src/email-job.mapper.ts` |
| `mapToEmailJobs` | function | `email/src/email-job.mapper.ts` |
| `emailJobTemplateName` | function | `email/src/email-job.mapper.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

- `@nestlancer/common`
- `@nestlancer/queue`

### External (npm)

_No direct external dependencies beyond the shared NestJS/TypeScript toolchain already in the workspace root._

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/email": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/email` (see the Public API tables above for exact names)
3. Inject/apply `publishEmailJob` where appropriate (services)

```typescript
import { publishEmailJob } from '@nestlancer/email';

constructor(private readonly svc: publishEmailJob) {}
```

_Example above uses `publishEmailJob`, a real export of this package (services defined in `email/src/email-queue.service.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
