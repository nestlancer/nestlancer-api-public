# `@nestlancer/config` library

Zod-validated env loading (database, Redis, JWT, Razorpay, CORS, rate limits) via ConfigService.

## Used by

All apps

## At a glance

| | |
| --- | --- |
| **Package** | `@nestlancer/config` |
| **Source** | `libs/config/src/` |
| **Source files (non-spec `.ts`)** | 17 |
| **Exported symbols (via `index.ts`)** | 23 |
| **Workspace dependencies** | none — leaf library |
| **External npm dependencies** | 5 |

## Package layout

Real directory tree of `libs/config/src/` (generated from the filesystem, depth-limited to 2):

```
src/
├── loaders/
│   ├── env.loader.ts
│   └── secrets.loader.ts
├── schemas/
│   ├── app.schema.ts
│   ├── cors.schema.ts
│   ├── database.schema.ts
│   ├── index.ts
│   ├── jwt.schema.ts
│   ├── observability.schema.ts
│   ├── rabbitmq.schema.ts
│   ├── rate-limit.schema.ts
│   ├── razorpay.schema.ts
│   ├── redis.schema.ts
│   ├── smtp.schema.ts
│   └── storage.schema.ts
├── config.module.ts
├── config.service.ts
└── index.ts
```

## Public API (exported from `@nestlancer/config`)

Extracted by resolving every `export * from '...'` / `export { ... } from '...'` statement in
`libs/config/src/index.ts` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

### Modules (1)

| Export | Kind | Source |
| --- | --- | --- |
| `NestlancerConfigModule` | class | `config/src/config.module.ts` |

### Services (1)

| Export | Kind | Source |
| --- | --- | --- |
| `NestlancerConfigService` | class | `config/src/config.service.ts` |

### Schemas (19)

| Export | Kind | Source |
| --- | --- | --- |
| `appConfigSchema` | const | `config/src/schemas/app.schema.ts` |
| `AppConfig` | type | `config/src/schemas/app.schema.ts` |
| `databaseConfigSchema` | const | `config/src/schemas/database.schema.ts` |
| `redisConfigSchema` | const | `config/src/schemas/redis.schema.ts` |
| `jwtConfigSchema` | const | `config/src/schemas/jwt.schema.ts` |
| `rabbitmqConfigSchema` | const | `config/src/schemas/rabbitmq.schema.ts` |
| `RabbitMQConfig` | type | `config/src/schemas/rabbitmq.schema.ts` |
| `storageConfigSchema` | const | `config/src/schemas/storage.schema.ts` |
| `StorageConfig` | type | `config/src/schemas/storage.schema.ts` |
| `smtpConfigSchema` | const | `config/src/schemas/smtp.schema.ts` |
| `SmtpConfig` | type | `config/src/schemas/smtp.schema.ts` |
| `razorpayConfigSchema` | const | `config/src/schemas/razorpay.schema.ts` |
| `RazorpayConfig` | type | `config/src/schemas/razorpay.schema.ts` |
| `corsConfigSchema` | const | `config/src/schemas/cors.schema.ts` |
| `CorsConfig` | type | `config/src/schemas/cors.schema.ts` |
| `rateLimitConfigSchema` | const | `config/src/schemas/rate-limit.schema.ts` |
| `RateLimitConfig` | type | `config/src/schemas/rate-limit.schema.ts` |
| `observabilityConfigSchema` | const | `config/src/schemas/observability.schema.ts` |
| `ObservabilityConfig` | type | `config/src/schemas/observability.schema.ts` |

### Other (2)

| Export | Kind | Source |
| --- | --- | --- |
| `loadEnvConfig` | function | `config/src/loaders/env.loader.ts` |
| `loadSecrets` | function | `config/src/loaders/secrets.loader.ts` |

## Dependencies

### Workspace (`@nestlancer/*`)

_No internal @nestlancer deps — this is a leaf library other packages can depend on safely._

### External (npm)

- `@nestjs/common` `^10.0.0`
- `@nestjs/config` `^3.0.0`
- `zod` `^3.22.0`
- `@nestjs/core` `^10.0.0`
- `rxjs` `^7.8.1`

## How to use in a service

1. Add to the consuming package's `package.json`: `"@nestlancer/config": "workspace:*"`
2. Import the symbol(s) you need from `@nestlancer/config` (see the Public API tables above for exact names)
3. Register `NestlancerConfigModule` in the consuming app's root module (or a feature module)

```typescript
import { NestlancerConfigModule } from '@nestlancer/config';

@Module({
  imports: [NestlancerConfigModule],
})
export class AppModule {}
```

_Example above uses `NestlancerConfigModule`, a real export of this package (modules defined in `config/src/config.module.ts`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
