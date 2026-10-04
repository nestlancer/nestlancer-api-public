# `@nestlancer/crypto` library

bcrypt hashing, AES encryption, HMAC, TOTP for 2FA secrets.

## Used by

auth, users

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/crypto` |
| **Source** | `libs/crypto/src/` |
| **Source files (non-spec `.ts`)** | 7 |
| **Exported symbols (via `index.ts`)** | 10 |
| **Workspace dependencies** | none — leaf library |
| **External npm dependencies** | 5 |

## Package layout

Real directory tree of `libs/crypto/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── interfaces/
│   └── crypto.interface.ts
├── crypto.module.ts
├── encryption.service.ts
├── hashing.service.ts
├── hmac.service.ts
├── index.ts
└── totp.service.ts
```

## Public API (exported from `@nestlancer/crypto`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/crypto/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `CryptoModule` | class | `crypto/src/crypto.module.ts` |

### Services (4)

| Export | Kind | Source |
| --- | --- | --- |
| `HashingService` | class | `crypto/src/hashing.service.ts` |
| `EncryptionService` | class | `crypto/src/encryption.service.ts` |
| `HmacService` | class | `crypto/src/hmac.service.ts` |
| `TotpService` | class | `crypto/src/totp.service.ts` |

### Interfaces (5)

| Export | Kind | Source |
| --- | --- | --- |
| `IHashingService` | interface | `crypto/src/interfaces/crypto.interface.ts` |
| `IEncryptionService` | interface | `crypto/src/interfaces/crypto.interface.ts` |
| `IHmacService` | interface | `crypto/src/interfaces/crypto.interface.ts` |
| `ITotpService` | interface | `crypto/src/interfaces/crypto.interface.ts` |
| `TotpSecret` | interface | `crypto/src/interfaces/crypto.interface.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

_No internal @nestlancer deps — this is a leaf library other packages can depend on safely._

### External (npm)

- `@nestjs/common` `^10.0.0`
- `bcrypt` `^5.1.0`
- `@types/bcrypt` `^5.0.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/crypto": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/crypto` (see the Public API tables above for exact names)
3. Register `CryptoModule` in the consuming app's root module (or a feature module)

```typescript
import { CryptoModule } from '@nestlancer/crypto';

@Module({
  imports: [CryptoModule],
})
export class AppModule {}
```

_Example above uses `CryptoModule`, a real export of this package (modules defined in `crypto/src/crypto.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
