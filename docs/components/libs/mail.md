# `@nestlancer/mail` library

Provider abstraction over ZeptoMail/SES/SMTP used by email-worker.

## Used by

email-worker

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/mail` |
| **Source** | `libs/mail/src/` |
| **Source files (non-spec `.ts`)** | 5 |
| **Exported symbols (via `index.ts`)** | 9 |
| **Workspace dependencies** | none — leaf library |
| **External npm dependencies** | 5 |

## Package layout

Real directory tree of `libs/mail/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── interfaces/
│   └── mail.interface.ts
├── templates/
│   └── handlebars.engine.ts
├── index.ts
├── mail.module.ts
└── mail.service.ts
```

## Public API (exported from `@nestlancer/mail`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/mail/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (2)

| Export | Kind | Source |
| --- | --- | --- |
| `MailModuleAsyncOptions` | interface | `mail/src/mail.module.ts` |
| `MailModule` | class | `mail/src/mail.module.ts` |

### Services (4)

| Export | Kind | Source |
| --- | --- | --- |
| `ZEPTOMAIL_SMTP_BY_DC` | const | `mail/src/mail.service.ts` |
| `resolveZeptoSmtpHost` | function | `mail/src/mail.service.ts` |
| `MailModuleConfig` | interface | `mail/src/mail.service.ts` |
| `MailService` | class | `mail/src/mail.service.ts` |

### Interfaces (2)

| Export | Kind | Source |
| --- | --- | --- |
| `MailOptions` | interface | `mail/src/interfaces/mail.interface.ts` |
| `MailAttachment` | interface | `mail/src/interfaces/mail.interface.ts` |

### Other (1)

| Export | Kind | Source |
| --- | --- | --- |
| `renderTemplate` | function | `mail/src/templates/handlebars.engine.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

_No internal @nestlancer deps — this is a leaf library other packages can depend on safely._

### External (npm)

- `@nestjs/common` `^10.0.0`
- `nodemailer` `^8.0.1`
- `resend` `^2.0.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/mail": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/mail` (see the Public API tables above for exact names)
3. Register `MailModuleAsyncOptions` in the consuming app's root module (or a feature module)

```typescript
import { MailModuleAsyncOptions } from '@nestlancer/mail';

@Module({
  imports: [MailModuleAsyncOptions],
})
export class AppModule {}
```

_Example above uses `MailModuleAsyncOptions`, a real export of this package (modules defined in `mail/src/mail.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
