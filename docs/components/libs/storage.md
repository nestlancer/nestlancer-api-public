# `@nestlancer/storage` library

S3-compatible provider (B2), presigned PUT/GET, content-type detection.

## Used by

media, users (avatar)

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/storage` |
| **Source** | `libs/storage/src/` |
| **Source files (non-spec `.ts`)** | 7 |
| **Exported symbols (via `index.ts`)** | 9 |
| **Workspace dependencies** | none — leaf library |
| **External npm dependencies** | 5 |

## Package layout

Real directory tree of `libs/storage/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── interfaces/
│   └── storage.interface.ts
├── providers/
│   ├── local.provider.ts
│   ├── s3.provider.ts
│   └── sigv4-get.util.ts
├── index.ts
├── storage.module.ts
└── storage.service.ts
```

## Public API (exported from `@nestlancer/storage`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/storage/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `StorageModule` | class | `storage/src/storage.module.ts` |

### Services (1)

| Export | Kind | Source |
| --- | --- | --- |
| `StorageService` | class | `storage/src/storage.service.ts` |

### Interfaces (6)

| Export | Kind | Source |
| --- | --- | --- |
| `StorageProvider` | interface | `storage/src/interfaces/storage.interface.ts` |
| `UploadResult` | interface | `storage/src/interfaces/storage.interface.ts` |
| `SignedUrlOptions` | interface | `storage/src/interfaces/storage.interface.ts` |
| `StorageModuleOptions` | interface | `storage/src/interfaces/storage.interface.ts` |
| `S3StorageConfig` | interface | `storage/src/interfaces/storage.interface.ts` |
| `LocalStorageConfig` | interface | `storage/src/interfaces/storage.interface.ts` |

### Other (1)

| Export | Kind | Source |
| --- | --- | --- |
| `LocalProvider` | class | `storage/src/providers/local.provider.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

_No internal @nestlancer deps — this is a leaf library other packages can depend on safely._

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@aws-sdk/client-s3` `^3.400.0`
- `@aws-sdk/s3-request-presigner` `^3.400.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/storage": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/storage` (see the Public API tables above for exact names)
3. Register `StorageModule` in the consuming app's root module (or a feature module)

```typescript
import { StorageModule } from '@nestlancer/storage';

@Module({
  imports: [StorageModule],
})
export class AppModule {}
```

_Example above uses `StorageModule`, a real export of this package (modules defined in `storage/src/storage.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
