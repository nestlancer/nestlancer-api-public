# `@nestlancer/auth-lib` library

JwtAuthGuard, RolesGuard, PermissionsGuard, strategies, @CurrentUser(), CSRF helpers.

## Used by

Gateway + services exposing user/admin routes

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/auth-lib` |
| **Source** | `libs/auth-lib/src/` |
| **Source files (non-spec `.ts`)** | 17 |
| **Exported symbols (via `index.ts`)** | 23 |
| **Workspace dependencies** | 1 |
| **External npm dependencies** | 8 |

## Package layout

Real directory tree of `libs/auth-lib/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── decorators/
│   ├── auth.decorator.ts
│   ├── permissions.decorator.ts
│   ├── roles.decorator.ts
│   └── user.decorator.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── optional-jwt-auth.guard.ts
│   ├── permissions.guard.ts
│   └── roles.guard.ts
├── interfaces/
│   └── auth.interface.ts
├── permissions/
│   ├── default-permissions.config.ts
│   └── permissions-resolver.ts
├── strategies/
│   └── jwt.strategy.ts
├── utils/
│   ├── password.util.ts
│   └── token.util.ts
├── auth-lib.module.ts
├── constants.ts
└── index.ts
```

## Public API (exported from `@nestlancer/auth-lib`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/auth-lib/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `AuthLibModule` | class | `auth-lib/src/auth-lib.module.ts` |

### Guards (4)

| Export | Kind | Source |
| --- | --- | --- |
| `JwtAuthGuard` | class | `auth-lib/src/guards/jwt-auth.guard.ts` |
| `OptionalJwtAuthGuard` | class | `auth-lib/src/guards/optional-jwt-auth.guard.ts` |
| `RolesGuard` | class | `auth-lib/src/guards/roles.guard.ts` |
| `PermissionsGuard` | class | `auth-lib/src/guards/permissions.guard.ts` |

### Strategies (1)

| Export | Kind | Source |
| --- | --- | --- |
| `JwtStrategy` | class | `auth-lib/src/strategies/jwt.strategy.ts` |

### Decorators (5)

| Export | Kind | Source |
| --- | --- | --- |
| `Auth` | const | `auth-lib/src/decorators/auth.decorator.ts` |
| `Roles` | const | `auth-lib/src/decorators/roles.decorator.ts` |
| `Permissions` | const | `auth-lib/src/decorators/permissions.decorator.ts` |
| `ActiveUser` | const | `auth-lib/src/decorators/user.decorator.ts` |
| `CurrentUser` | const | `auth-lib/src/decorators/user.decorator.ts` |

### Permissions (3)

| Export | Kind | Source |
| --- | --- | --- |
| `flattenRolePermissions` | function | `auth-lib/src/permissions/permissions-resolver.ts` |
| `hasAllPermissions` | function | `auth-lib/src/permissions/permissions-resolver.ts` |
| `DEFAULT_ROLE_PERMISSIONS` | const | `auth-lib/src/permissions/default-permissions.config.ts` |

### Interfaces (3)

| Export | Kind | Source |
| --- | --- | --- |
| `JwtPayload` | interface | `auth-lib/src/interfaces/auth.interface.ts` |
| `AuthenticatedUser` | interface | `auth-lib/src/interfaces/auth.interface.ts` |
| `TokenPair` | interface | `auth-lib/src/interfaces/auth.interface.ts` |

### Utilities (3)

| Export | Kind | Source |
| --- | --- | --- |
| `createAccessToken` | function | `auth-lib/src/utils/token.util.ts` |
| `createRefreshToken` | function | `auth-lib/src/utils/token.util.ts` |
| `validatePasswordStrength` | function | `auth-lib/src/utils/password.util.ts` |

### Other (3)

| Export | Kind | Source |
| --- | --- | --- |
| `PERMISSIONS_KEY` | const | `auth-lib/src/constants.ts` |
| `ROLES_KEY` | const | `auth-lib/src/constants.ts` |
| `IS_PUBLIC_KEY` | const | `auth-lib/src/constants.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

- `@nestlancer/common`

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/jwt` `^10.0.0`
- `@nestjs/passport` `^10.0.0`
- `passport` `^0.7.0`
- `passport-jwt` `^4.0.0`
- `@types/passport-jwt` `^4.0.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/auth-lib": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/auth-lib` (see the Public API tables above for exact names)
3. Register `AuthLibModule` in the consuming app's root module (or a feature module)

```typescript
import { AuthLibModule } from '@nestlancer/auth-lib';

@Module({
  imports: [AuthLibModule],
})
export class AppModule {}
```

_Example above uses `AuthLibModule`, a real export of this package (modules defined in `auth-lib/src/auth-lib.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
