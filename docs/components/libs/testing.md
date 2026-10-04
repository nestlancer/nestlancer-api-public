# `@nestlancer/testing` library

Factories, Prisma/Redis/RabbitMQ mocks, auth helpers for Jest.

## Used by

All test suites

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/testing` |
| **Source** | `libs/testing/src/` |
| **Source files (non-spec `.ts`)** | 16 |
| **Exported symbols (via `index.ts`)** | 29 |
| **Workspace dependencies** | none — leaf library |
| **External npm dependencies** | 9 |

## Package layout

Real directory tree of `libs/testing/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── factories/
│   ├── project.factory.ts
│   └── user.factory.ts
├── helpers/
│   ├── integration-jwt.env.ts
│   ├── test-auth.helper.ts
│   ├── test-database.helper.ts
│   ├── test-queue.helper.ts
│   └── test-redis.helper.ts
├── mocks/
│   ├── cache.mock.ts
│   ├── mail.mock.ts
│   ├── queue.mock.ts
│   └── storage.mock.ts
├── decorators.mock.ts
├── index.ts
├── testing.module.ts
├── ua-parser.mock.ts
└── uuid.mock.ts
```

## Public API (exported from `@nestlancer/testing`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/testing/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `TestingModule` | class | `testing/src/testing.module.ts` |

### Other (28)

| Export | Kind | Source |
| --- | --- | --- |
| `createTestUser` | function | `testing/src/factories/user.factory.ts` |
| `createTestAdmin` | function | `testing/src/factories/user.factory.ts` |
| `createTestProject` | function | `testing/src/factories/project.factory.ts` |
| `alignReadReplicaWithPrimary` | function | `testing/src/helpers/test-database.helper.ts` |
| `applyTestDatabaseMigrations` | function | `testing/src/helpers/test-database.helper.ts` |
| `testMigrationsReady` | function | `testing/src/helpers/test-database.helper.ts` |
| `setupTestDatabase` | function | `testing/src/helpers/test-database.helper.ts` |
| `teardownTestDatabase` | function | `testing/src/helpers/test-database.helper.ts` |
| `resetTestDatabase` | function | `testing/src/helpers/test-database.helper.ts` |
| `getTestPrismaClient` | function | `testing/src/helpers/test-database.helper.ts` |
| `TestJwtPayload` | interface | `testing/src/helpers/test-auth.helper.ts` |
| `createTestJwt` | function | `testing/src/helpers/test-auth.helper.ts` |
| `createTestRefreshToken` | function | `testing/src/helpers/test-auth.helper.ts` |
| `createAuthHeader` | function | `testing/src/helpers/test-auth.helper.ts` |
| `applyIntegrationJwtEnv` | function | `testing/src/helpers/integration-jwt.env.ts` |
| `setupTestRedis` | function | `testing/src/helpers/test-redis.helper.ts` |
| `teardownTestRedis` | function | `testing/src/helpers/test-redis.helper.ts` |
| `resetTestRedis` | function | `testing/src/helpers/test-redis.helper.ts` |
| `getTestRedisClient` | function | `testing/src/helpers/test-redis.helper.ts` |
| `setupTestQueue` | function | `testing/src/helpers/test-queue.helper.ts` |
| … | | _8 more — see `testing/src/index.ts`_ |

## Dependencies

### Workspace (`@nestlancer/*`)

_No internal @nestlancer deps — this is a leaf library other packages can depend on safely._

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/testing` `^10.0.0`
- `jest` `^29.0.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`
- `amqplib` `^0.10.0`
- `jsonwebtoken` `^9.0.0`
- `@types/amqplib` `^0.10.0`
- `@types/jsonwebtoken` `^9.0.0`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/testing": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/testing` (see the Public API tables above for exact names)
3. Register `TestingModule` in the consuming app's root module (or a feature module)

```typescript
import { TestingModule } from '@nestlancer/testing';

@Module({
  imports: [TestingModule],
})
export class AppModule {}
```

_Example above uses `TestingModule`, a real export of this package (modules defined in `testing/src/testing.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
