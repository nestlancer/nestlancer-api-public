<div align="center">

# Shared libraries (`libs/`)

</div>

---

28 internal `@nestlancer/*` workspace packages shared across services,
workers, and gateways. Each is published only inside the pnpm workspace (`workspace:*`), never to
a public registry. Every library doc is generated from its real `src/index.ts` export graph — the
"exports" column below is a live count, not an estimate.

| Library | What it provides | Public API |
| --- | --- | --- |
| [`@nestlancer/common`](common.md) | Foundation — see full notes → | 275 exports |
| [`@nestlancer/config`](config.md) | Zod-validated env loading (database, Redis, JWT, Razorpay, CORS, rate limits) via ConfigService. | 23 exports |
| [`@nestlancer/database`](database.md) | PrismaModule with PrismaWriteService / PrismaReadService, @Transactional(), base repository. | 15 exports |
| [`@nestlancer/cache`](cache.md) | Redis cache with TTL and tag-based invalidation decorators (@Cacheable, @CacheInvalidate). | 13 exports |
| [`@nestlancer/queue`](queue.md) | RabbitMQ publisher/consumer helpers, routing key constants, DLQ service. | 14 exports |
| [`@nestlancer/outbox`](outbox.md) | Transactional outbox write API — insert event in same DB transaction as business write. | 11 exports |
| [`@nestlancer/auth-lib`](auth-lib.md) | JwtAuthGuard, RolesGuard, PermissionsGuard, strategies, @CurrentUser(), CSRF helpers. | 23 exports |
| [`@nestlancer/logger`](logger.md) | Structured JSON logging with correlation ID and request middleware. | 9 exports |
| [`@nestlancer/metrics`](metrics.md) | Prometheus HTTP/DB/queue metrics collectors and interceptor. | 15 exports |
| [`@nestlancer/tracing`](tracing.md) | OpenTelemetry bootstrap and correlation-id middleware. | 7 exports |
| [`@nestlancer/health-lib`](health-lib.md) | Terminus-style indicators for DB, Redis, RabbitMQ, disk, memory. | 9 exports |
| [`@nestlancer/idempotency`](idempotency.md) | Stores idempotency keys in Redis+PG for 24h; required on payment mutations. | 8 exports |
| [`@nestlancer/audit`](audit.md) | @Auditable() decorator and audit writer — often combined with audit-worker. | 10 exports |
| [`@nestlancer/alerts`](alerts.md) | Slack/PagerDuty/email alert channels for ops runbooks. | 7 exports |
| [`@nestlancer/middleware`](middleware.md) | Rate limiter tiers, maintenance mode, feature flags, Helmet, CORS helpers. | 10 exports |
| [`@nestlancer/storage`](storage.md) | S3-compatible provider (B2), presigned PUT/GET, content-type detection. | 9 exports |
| [`@nestlancer/mail`](mail.md) | Provider abstraction over ZeptoMail/SES/SMTP used by email-worker. | 9 exports |
| [`@nestlancer/crypto`](crypto.md) | bcrypt hashing, AES encryption, HMAC, TOTP for 2FA secrets. | 10 exports |
| [`@nestlancer/websocket`](websocket.md) | Socket.IO Redis adapter helpers, room manager, presence — shared with ws-gateway. | 10 exports |
| [`@nestlancer/pdf`](pdf.md) | PDFKit templates for quotes, invoices, receipts. | 60 exports |
| [`@nestlancer/search`](search.md) | Prisma filter/sort builder for list endpoints. | 5 exports |
| [`@nestlancer/circuit-breaker`](circuit-breaker.md) | Opossum-style breaker for external HTTP (Razorpay, etc.). | 6 exports |
| [`@nestlancer/turnstile`](turnstile.md) | Cloudflare Turnstile server-side verification guard. | 6 exports |
| [`@nestlancer/testing`](testing.md) | Factories, Prisma/Redis/RabbitMQ mocks, auth helpers for Jest. | 29 exports |
| [`@nestlancer/documents`](documents.md) | DocumentGenerationService — see full notes → | 16 exports |
| [`@nestlancer/email`](email.md) | Email job interface/mapper and EmailQueueService — normalizes outbound email jobs onto the queue for email-worker to render and send. | 14 exports |
| [`@nestlancer/notifications`](notifications.md) | Notification job typing/mapper, user notification-preference checks, and template helpers shared between producers and notification-worker. | 16 exports |
| [`@nestlancer/tests`](tests.md) | ⚠️ Anomalous package — see full notes → | ⚠️ not a working package |

See [monorepo structure](../../decisions/001-monorepo-structure.md) for why shared code lives in
`libs/` instead of being duplicated per service, and
[coding standards](../../development/coding-standards.md) for conventions new libraries should
follow.

[← Back to component index](../README.md)
