# `@nestlancer/notifications` library

Notification job typing/mapper, user notification-preference checks, and template helpers shared between producers and notification-worker.

## Used by

notification-worker (producers across services publish notification jobs matching this contract)

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/notifications` |
| **Source** | `libs/notifications/src/` |
| **Source files (non-spec `.ts`)** | 6 |
| **Exported symbols (via `index.ts`)** | 16 |
| **Workspace dependencies** | 1 |
| **External npm dependencies** | none beyond NestJS/TS tooling |

## Package layout

Real directory tree of `libs/notifications/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── index.ts
├── is-notification-job.ts
├── notification-job.mapper.ts
├── notification-preference.util.ts
├── notification-template.util.ts
└── notification-types.ts
```

## Public API (exported from `@nestlancer/notifications`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/notifications/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Utilities (10)

| Export | Kind | Source |
| --- | --- | --- |
| `renderNotificationTemplate` | function | `notifications/src/notification-template.util.ts` |
| `humanizeStatusLabel` | function | `notifications/src/notification-template.util.ts` |
| `preferMapperCopyWhenSparse` | function | `notifications/src/notification-template.util.ts` |
| `parseEnabledNotificationTypes` | function | `notifications/src/notification-template.util.ts` |
| `isNotificationTypeAllowed` | function | `notifications/src/notification-template.util.ts` |
| `resolvePreferenceCategory` | function | `notifications/src/notification-preference.util.ts` |
| `minutesInTimeZone` | function | `notifications/src/notification-preference.util.ts` |
| `isInQuietHours` | function | `notifications/src/notification-preference.util.ts` |
| `NotificationPreferenceRecord` | interface | `notifications/src/notification-preference.util.ts` |
| `shouldDeliverNotification` | function | `notifications/src/notification-preference.util.ts` |

### Other (6)

| Export | Kind | Source |
| --- | --- | --- |
| `NotificationEventType` | const | `notifications/src/notification-types.ts` |
| `NotificationEventTypeValue` | type | `notifications/src/notification-types.ts` |
| `isNotificationJob` | function | `notifications/src/is-notification-job.ts` |
| `defaultInAppChannels` | function | `notifications/src/is-notification-job.ts` |
| `NotificationJobMapperContext` | interface | `notifications/src/notification-job.mapper.ts` |
| `mapToNotificationJobs` | function | `notifications/src/notification-job.mapper.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

- `@nestlancer/common`

### External (npm)

_No direct external dependencies beyond the shared NestJS/TypeScript toolchain already in the workspace root._

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/notifications": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/notifications` (see the Public API tables above for exact names)
3. Inject/apply `renderNotificationTemplate` where appropriate (utilities)

```typescript
import { renderNotificationTemplate } from '@nestlancer/notifications';
```

_Example above uses `renderNotificationTemplate`, a real export of this package (utilities defined in `notifications/src/notification-template.util.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
