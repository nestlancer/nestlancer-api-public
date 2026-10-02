#!/usr/bin/env node
/**
 * Generates rich docs under docs/components/ from source metadata.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const SERVICES = {
  health: {
    title: 'Health Service',
    package: '@nestlancer/health-service',
    port: 3016,
    portEnv: 'HEALTH_SERVICE_PORT',
    apiBase: '/api/v1/health',
    prisma: ['System health aggregates — no primary business tables'],
    summary:
      'Operational health for Kubernetes probes, admin diagnostics, and dependency status (PostgreSQL, Redis, RabbitMQ, S3, workers, WebSocket).',
    responsibilities: [
      'Liveness/readiness endpoints for orchestration',
      'Deep dependency checks with structured JSON for Grafana/Alertmanager',
      'Admin-only debug: feature flags, worker registry, system metrics',
    ],
    integrations: ['PostgreSQL', 'Redis', 'RabbitMQ', 'S3/B2', 'SMTP', 'external APIs'],
    events: [],
  },
  auth: {
    title: 'Auth Service',
    package: '@nestlancer/auth-service',
    port: 3001,
    portEnv: 'AUTH_SERVICE_PORT',
    apiBase: '/api/v1/auth',
    prisma: ['UserCredential', 'RefreshToken', 'EmailVerificationToken', 'PasswordResetToken', 'LoginAttempt'],
    summary:
      'Identity entry point: registration, login, JWT issuance, email verification, password reset, 2FA challenge, and session refresh.',
    responsibilities: [
      'Issue RS256 JWT access tokens (15 min) and rotating refresh tokens (cookie + body)',
      'Enforce Turnstile on register/login; lock accounts after failed attempts',
      'Emit outbox events for welcome/verification emails (consumed by email-worker)',
    ],
    integrations: ['ZeptoMail (via queue)', 'Cloudflare Turnstile', 'Redis (rate limits)'],
    events: ['auth.user.registered', 'auth.login.success', 'auth.email.verified', 'auth.password.changed'],
  },
  users: {
    title: 'Users Service',
    package: '@nestlancer/users-service',
    port: 3002,
    portEnv: 'USERS_SERVICE_PORT',
    apiBase: '/api/v1/users',
    prisma: ['User', 'UserPreferences', 'UserSession', 'UserActivity'],
    summary: 'Profile, preferences, avatar, sessions, 2FA settings, GDPR export, and admin user lifecycle.',
    responsibilities: [
      'Self-service profile and security settings',
      'Session list/revoke and activity log',
      'Admin: search users, change role/status, bulk ops, password reset, data export',
    ],
    integrations: ['Media service (avatars)', 'S3 presigned uploads'],
    events: ['user.profile.updated', 'user.account.suspended', 'user.account.deleted'],
  },
  payments: {
    title: 'Payments Service',
    package: '@nestlancer/payments-service',
    port: 3003,
    portEnv: 'PAYMENTS_SERVICE_PORT',
    apiBase: '/api/v1/payments',
    prisma: ['Payment', 'PaymentIntent', 'PaymentMethod', 'PaymentMilestone', 'PaymentDispute', 'Refund'],
    summary:
      'Razorpay checkout in INR (amounts in paise), milestones, invoices/receipts PDF, refunds, disputes, and admin reconciliation.',
    responsibilities: [
      'Create/confirm payment intents with idempotency keys',
      'Webhook handling for payment.captured / failed (also via webhooks service)',
      'Admin refunds, revenue reports, milestone scheduling tied to projects',
    ],
    integrations: ['Razorpay API', 'PDF lib', 'Outbox → email-worker'],
    events: ['payment.payment.completed', 'payment.payment.failed', 'payment.payment.refunded'],
  },
  webhooks: {
    title: 'Webhooks Ingestion Service',
    package: '@nestlancer/webhooks-service',
    port: 3004,
    portEnv: 'WEBHOOKS_SERVICE_PORT',
    apiBase: '/api/v1/webhooks',
    prisma: ['WebhookEventLog', 'WebhookProviderConfig'],
    summary:
      'Dedicated ingress for third-party webhooks (Razorpay, GitHub). Verifies signatures, logs payloads, enqueues to webhook-worker.',
    responsibilities: [
      'Provider-specific signature verification (HMAC)',
      'IP allowlist and aggressive rate limits',
      'Never mutates domain state directly — async processing only',
    ],
    integrations: ['RabbitMQ webhook.queue'],
    events: [],
  },
  admin: {
    title: 'Admin Service',
    package: '@nestlancer/admin-service',
    port: 3005,
    portEnv: 'ADMIN_SERVICE_PORT',
    apiBase: '/api/v1/admin',
    prisma: [
      'SystemConfig',
      'EmailTemplate',
      'FeatureFlag',
      'AuditLog',
      'Webhook',
      'Backup',
      'Announcement',
    ],
    summary:
      'Operator console backend: dashboards, system config, feature flags, audit, impersonation, backups, webhook management.',
    responsibilities: [
      'Aggregate metrics across services (revenue, users, projects)',
      'Maintenance mode and cache busting',
      'GDPR-aware impersonation with audit trail',
    ],
    integrations: ['All domain services via gateway proxy', 'Redis cache flush'],
    events: [],
  },
  requests: {
    title: 'Requests Service',
    package: '@nestlancer/requests-service',
    port: 3006,
    portEnv: 'REQUESTS_SERVICE_PORT',
    apiBase: '/api/v1/requests',
    prisma: ['ServiceRequest', 'RequestAttachment', 'RequestNote', 'RequestStatusHistory'],
    summary: 'Client project inquiries from draft through admin review before a quote is issued.',
    responsibilities: [
      'CRUD for client requests with category and attachments',
      'Status workflow: draft → submitted → in_review → quoted/closed',
      'Admin notes and internal status changes',
    ],
    integrations: ['Media (attachments)', 'Notifications'],
    events: ['request.request.submitted', 'request.status.changed'],
  },
  quotes: {
    title: 'Quotes Service',
    package: '@nestlancer/quotes-service',
    port: 3007,
    portEnv: 'QUOTES_SERVICE_PORT',
    apiBase: '/api/v1/quotes',
    prisma: ['Quote', 'QuoteLineItem', 'QuotePaymentBreakdown', 'QuoteTemplate'],
    summary: 'Formal proposals with line items, payment schedule, PDF export, acceptance/decline, and templates.',
    responsibilities: [
      'Admin creates/sends quotes linked to requests',
      'Client accepts → triggers project creation (projects service)',
      'Expiry, duplication, and template library',
    ],
    integrations: ['PDF generation', 'Projects service', 'Email worker'],
    events: ['quote.quote.sent', 'quote.quote.accepted', 'quote.quote.declined'],
  },
  projects: {
    title: 'Projects Service',
    package: '@nestlancer/projects-service',
    port: 3008,
    portEnv: 'PROJECTS_SERVICE_PORT',
    apiBase: '/api/v1/projects',
    prisma: ['Project', 'ProjectFeedback', 'ProjectMessage', 'ProjectTemplate'],
    summary: 'Active engagement after quote acceptance: status, feedback, messages, public showcase.',
    responsibilities: [
      'Lifecycle: active → on_hold → completed/cancelled',
      'Client feedback and revision requests',
      'Public read-only project pages for portfolio marketing',
    ],
    integrations: ['Progress', 'Payments', 'Messaging'],
    events: ['project.project.created', 'project.project.completed'],
  },
  progress: {
    title: 'Progress Service',
    package: '@nestlancer/progress-service',
    port: 3009,
    portEnv: 'PROGRESS_SERVICE_PORT',
    apiBase: '/api/v1/progress',
    prisma: ['ProgressEntry', 'Milestone', 'Deliverable'],
    summary: 'Delivery tracking: timeline entries, milestones, file deliverables, client approvals.',
    responsibilities: [
      'Admin posts progress updates and uploads deliverables',
      'Client approves milestones / requests changes on deliverables',
      'Gates payment milestones when configured',
    ],
    integrations: ['Media', 'Payments milestones', 'Notifications'],
    events: ['progress.milestone.approved', 'progress.deliverable.uploaded'],
  },
  messaging: {
    title: 'Messaging Service',
    package: '@nestlancer/messaging-service',
    port: 3010,
    portEnv: 'MESSAGING_SERVICE_PORT',
    apiBase: '/api/v1/messaging',
    prisma: ['Conversation', 'Message', 'MessageReaction', 'MessageReadReceipt'],
    summary: 'REST layer for project-scoped chat, threads, reactions, read receipts; realtime via ws-gateway.',
    responsibilities: [
      'Conversation list and message history with pagination',
      'Chat threads per project; file attachments via media',
      'Admin moderation and flagged messages',
    ],
    integrations: ['Redis pub/sub → ws-gateway', 'Media'],
    events: ['message.message.sent'],
  },
  notifications: {
    title: 'Notifications Service',
    package: '@nestlancer/notifications-service',
    port: 3011,
    portEnv: 'NOTIFICATIONS_SERVICE_PORT',
    apiBase: '/api/v1/notifications',
    prisma: ['Notification', 'NotificationPreference', 'PushSubscription', 'NotificationTemplate'],
    summary: 'In-app inbox, channel preferences, Web Push subscriptions, admin broadcast/segment sends.',
    responsibilities: [
      'Persist notifications and delivery logs',
      'Enqueue push/email based on user preferences',
      'Template CRUD for admin',
    ],
    integrations: ['notification-worker', 'Web Push (VAPID)'],
    events: ['notification.notification.created'],
  },
  media: {
    title: 'Media Service',
    package: '@nestlancer/media-service',
    port: 3012,
    portEnv: 'MEDIA_SERVICE_PORT',
    apiBase: '/api/v1/media',
    prisma: ['Media', 'MediaVersion', 'MediaShareLink', 'ChunkedUploadSession', 'QuarantinedFile'],
    summary: 'Upload pipeline: presigned URLs, chunked uploads, virus scan, versions, public share links.',
    responsibilities: [
      'Direct and multipart upload to B2/S3 private bucket',
      'Enqueue media-worker for resize/thumbnail/transcode',
      'Quarantine infected files; admin release/delete',
    ],
    integrations: ['B2/S3', 'media-worker', 'cdn-worker'],
    events: ['media.media.uploaded', 'media.media.processed'],
  },
  portfolio: {
    title: 'Portfolio Service',
    package: '@nestlancer/portfolio-service',
    port: 3013,
    portEnv: 'PORTFOLIO_SERVICE_PORT',
    apiBase: '/api/v1/portfolio',
    prisma: ['PortfolioItem', 'PortfolioCategory', 'PortfolioTag', 'PortfolioLike'],
    summary: 'Public case studies and work samples with categories, search, analytics, and admin ordering.',
    responsibilities: [
      'Public listing/detail with view analytics',
      'Admin CRUD, privacy, featured ordering',
      'Timeline endpoint for project history display',
    ],
    integrations: ['Media', 'analytics-worker'],
    events: [],
  },
  blog: {
    title: 'Blog Service',
    package: '@nestlancer/blog-service',
    port: 3014,
    portEnv: 'BLOG_SERVICE_PORT',
    apiBase: '/api/v1/blog',
    prisma: ['Post', 'Comment', 'BlogCategory', 'BlogTag', 'Bookmark', 'PostView'],
    summary: 'Headless CMS: posts, taxonomy, comments, likes, bookmarks, RSS, scheduling, moderation.',
    responsibilities: [
      'Public read APIs with ISR-friendly shapes',
      'Client-side view tracking and engagement endpoints',
      'Admin editor, revisions, scheduled publish, comment moderation',
    ],
    integrations: ['Media', 'CDN cache invalidation'],
    events: [],
  },
  contact: {
    title: 'Contact Service',
    package: '@nestlancer/contact-service',
    port: 3015,
    portEnv: 'CONTACT_SERVICE_PORT',
    apiBase: '/api/v1/contact',
    prisma: ['ContactMessage', 'ContactNote', 'ContactTag', 'AutoReply'],
    summary: 'Marketing contact form, spam filtering, auto-replies, admin CRM inbox.',
    responsibilities: [
      'Public submit with Turnstile',
      'Admin assign/respond/tag/export',
      'Configurable auto-reply rules',
    ],
    integrations: ['Email worker', 'Turnstile'],
    events: [],
  },
};

const WORKERS = {
  'email-worker': {
    title: 'Email Worker',
    package: '@nestlancer/email-worker',
    queue: 'email.queue',
    routingKeys: ['email.#'],
    summary: 'Renders Handlebars templates and sends mail via ZeptoMail (transactional) or SES (bulk).',
    processors: [
      'verification-email',
      'password-reset',
      'welcome',
      'quote-sent/accepted',
      'payment-received/reminder/failed',
      'project-update/completed',
      'contact-auto-reply/response',
      'announcement',
    ],
  },
  'notification-worker': {
    title: 'Notification Worker',
    package: '@nestlancer/notification-worker',
    queue: 'notification.queue',
    routingKeys: ['notification.#'],
    summary: 'Writes in-app notifications, sends Web Push, publishes Redis events for Socket.IO fan-out.',
    processors: ['in-app-notification', 'push-notification', 'realtime-fanout'],
  },
  'audit-worker': {
    title: 'Audit Worker',
    package: '@nestlancer/audit-worker',
    queue: 'audit.queue',
    routingKeys: ['audit.#'],
    summary: 'Buffers audit entries from the queue and batch-inserts into PostgreSQL for compliance queries.',
    processors: ['audit-batch-insert'],
  },
  'media-worker': {
    title: 'Media Worker',
    package: '@nestlancer/media-worker',
    queue: 'media.queue',
    routingKeys: ['media.#'],
    summary: 'Sharp/FFmpeg processing: resize, thumbnails, metadata, virus scan, triggers CDN invalidation.',
    processors: ['image-resize', 'thumbnail', 'video-transcode', 'virus-scan', 'metadata-extractor'],
  },
  'analytics-worker': {
    title: 'Analytics Worker',
    package: '@nestlancer/analytics-worker',
    queue: 'analytics.queue',
    routingKeys: ['analytics.#'],
    summary: 'Rolls up views, revenue snapshots, portfolio/blog engagement into reporting tables.',
    processors: ['user-analytics', 'project-analytics', 'revenue-analytics', 'blog-analytics', 'portfolio-analytics'],
  },
  'webhook-worker': {
    title: 'Webhook Worker',
    package: '@nestlancer/webhook-worker',
    queue: 'webhook.queue',
    routingKeys: ['webhook.#'],
    summary: 'Applies Razorpay/GitHub webhook side effects (payment state, deployment hooks).',
    processors: ['razorpay-webhook', 'github-webhook', 'generic-webhook'],
  },
  'cdn-worker': {
    title: 'CDN Worker',
    package: '@nestlancer/cdn-worker',
    queue: 'cdn.queue',
    routingKeys: ['cdn.#'],
    summary: 'Batches Cloudflare/CloudFront cache purges after media/blog/portfolio updates.',
    processors: ['path-invalidation', 'batch-invalidation'],
  },
  'outbox-poller': {
    title: 'Outbox Poller',
    package: '@nestlancer/outbox-poller',
    queue: '(database poll — not a consumer queue)',
    routingKeys: ['publishes to nestlancer.events'],
    summary:
      'Polls `OutboxEvent` rows (PENDING), publishes to RabbitMQ with confirms, marks PROCESSED or retries.',
    processors: ['outbox-poller', 'outbox-publisher'],
  },
};

const LIBS = {
  common: {
    desc: 'Foundation: API envelope types, enums, decorators (@Public, @Roles), filters, interceptors, money/pagination utils.',
    usedBy: 'Every service and gateway',
  },
  config: {
    desc: 'Zod-validated env loading (database, Redis, JWT, Razorpay, CORS, rate limits) via ConfigService.',
    usedBy: 'All apps',
  },
  database: {
    desc: 'PrismaModule with PrismaWriteService / PrismaReadService, @Transactional(), base repository.',
    usedBy: 'All domain services',
  },
  cache: {
    desc: 'Redis cache with TTL and tag-based invalidation decorators (@Cacheable, @CacheInvalidate).',
    usedBy: 'High-read services (blog, portfolio, admin dashboard)',
  },
  queue: {
    desc: 'RabbitMQ publisher/consumer helpers, routing key constants, DLQ service.',
    usedBy: 'Services emitting events; all workers',
  },
  outbox: {
    desc: 'Transactional outbox write API — insert event in same DB transaction as business write.',
    usedBy: 'Auth, payments, quotes, projects, etc.',
  },
  'auth-lib': {
    desc: 'JwtAuthGuard, RolesGuard, PermissionsGuard, strategies, @CurrentUser(), CSRF helpers.',
    usedBy: 'Gateway + services exposing user/admin routes',
  },
  logger: {
    desc: 'Structured JSON logging with correlation ID and request middleware.',
    usedBy: 'All apps',
  },
  metrics: {
    desc: 'Prometheus HTTP/DB/queue metrics collectors and interceptor.',
    usedBy: 'Gateway, workers',
  },
  tracing: {
    desc: 'OpenTelemetry bootstrap and correlation-id middleware.',
    usedBy: 'Gateway, services',
  },
  'health-lib': {
    desc: 'Terminus-style indicators for DB, Redis, RabbitMQ, disk, memory.',
    usedBy: 'health service',
  },
  idempotency: {
    desc: 'Stores idempotency keys in Redis+PG for 24h; required on payment mutations.',
    usedBy: 'payments, gateway',
  },
  audit: {
    desc: '@Auditable() decorator and audit writer — often combined with audit-worker.',
    usedBy: 'admin, users, payments',
  },
  alerts: {
    desc: 'Slack/PagerDuty/email alert channels for ops runbooks.',
    usedBy: 'health, gateway',
  },
  middleware: {
    desc: 'Rate limiter tiers, maintenance mode, feature flags, Helmet, CORS helpers.',
    usedBy: 'gateway primarily',
  },
  storage: {
    desc: 'S3-compatible provider (B2), presigned PUT/GET, content-type detection.',
    usedBy: 'media, users (avatar)',
  },
  mail: {
    desc: 'Provider abstraction over ZeptoMail/SES/SMTP used by email-worker.',
    usedBy: 'email-worker',
  },
  crypto: {
    desc: 'bcrypt hashing, AES encryption, HMAC, TOTP for 2FA secrets.',
    usedBy: 'auth, users',
  },
  websocket: {
    desc: 'Socket.IO Redis adapter helpers, room manager, presence — shared with ws-gateway.',
    usedBy: 'ws-gateway, notification-worker',
  },
  pdf: {
    desc: 'PDFKit templates for quotes, invoices, receipts.',
    usedBy: 'quotes, payments',
  },
  search: {
    desc: 'Prisma filter/sort builder for list endpoints.',
    usedBy: 'blog, portfolio, requests',
  },
  'circuit-breaker': {
    desc: 'Opossum-style breaker for external HTTP (Razorpay, etc.).',
    usedBy: 'payments',
  },
  turnstile: {
    desc: 'Cloudflare Turnstile server-side verification guard.',
    usedBy: 'auth, contact, gateway',
  },
  testing: {
    desc: 'Factories, Prisma/Redis/RabbitMQ mocks, auth helpers for Jest.',
    usedBy: 'All test suites',
  },
};

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function listControllers(serviceDir) {
  const ctrlDir = path.join(serviceDir, 'src/controllers');
  if (!fs.existsSync(ctrlDir)) return [];
  const files = [];
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.controller.ts')) files.push(p);
    }
  }
  walk(ctrlDir);
  return files;
}

function extractRoutes(controllerPath) {
  const src = fs.readFileSync(controllerPath, 'utf8');
  const routes = [];
  const controllerMatch = src.match(/@Controller\(([^)]*)\)/);
  const base = controllerMatch ? controllerMatch[1].replace(/['"`]/g, '').trim() : '';
  const methodRe = /@(Get|Post|Put|Patch|Delete)\(['"`]?([^'"`)]*)['"`]?\)/g;
  let m;
  while ((m = methodRe.exec(src))) {
    const sub = m[2] || '';
    const full = [base, sub].filter(Boolean).join('/').replace(/\/+/g, '/');
    routes.push({ method: m[1].toUpperCase(), path: full ? `/${full}` : '/' });
  }
  return routes;
}

function getWorkspaceDeps(pkgPath) {
  const pkg = readJson(pkgPath);
  if (!pkg?.dependencies) return [];
  return Object.keys(pkg.dependencies).filter((d) => d.startsWith('@nestlancer/'));
}

function serviceDoc(name, meta) {
  const serviceDir = path.join(root, 'services', name);
  const controllers = listControllers(serviceDir);
  const allRoutes = [];
  for (const c of controllers) {
    const rel = path.relative(serviceDir, c);
    const routes = extractRoutes(c);
    for (const r of routes) {
      allRoutes.push({ ...r, controller: rel });
    }
  }
  const deps = getWorkspaceDeps(path.join(serviceDir, 'package.json'));
  const apiSpec = `../../api/services/${name}.md`;

  const routeTable =
    allRoutes.length > 0
      ? [
          '| Method | Path (service-relative) | Controller |',
          '| ------ | ------------------------ | ---------- |',
          ...allRoutes.slice(0, 40).map((r) => `| \`${r.method}\` | \`${r.path}\` | \`${r.controller}\` |`),
          ...(allRoutes.length > 40 ? [`| … | _${allRoutes.length - 40} more routes — see OpenAPI_ | |`] : []),
        ].join('\n')
      : '_Route list: use gateway OpenAPI (`/docs-all-json`) — controllers may live under `src/modules/`._';

  return `# ${meta.title}

${meta.summary}

## At a glance

| | |
| --- | --- |
| **Package** | \`${meta.package}\` |
| **Source** | \`services/${name}/\` |
| **Default port** | ${meta.port} (env: \`${meta.portEnv}\`) |
| **Gateway prefix** | \`${meta.apiBase}\` |
| **Primary data** | ${meta.prisma.join(', ')} |
| **Detailed API spec** | [${name} endpoints](${apiSpec}) |

## What this service owns

${meta.responsibilities.map((r) => `- ${r}`).join('\n')}

## How it fits in the platform

\`\`\`
Client → Gateway (${meta.apiBase}) → ${meta.title} → PostgreSQL
                                      ↓
                              Outbox → RabbitMQ → Workers (email, notification, …)
\`\`\`

Studio model: one **ADMIN** operator serves many **USER** clients. This service enforces role checks via \`@nestlancer/auth-lib\` guards on user vs admin controllers.

## HTTP surface (discovered from controllers)

Gateway exposes these under \`${meta.apiBase}\`. Paths below are **relative to the service controller prefix**; the gateway may add version prefixes.

${routeTable}

For request/response examples, error codes, and rate limits, see [${apiSpec}](${apiSpec}) and [API standards](../../api/standards.md).

## Dependencies (\`@nestlancer/*\`)

${deps.length ? deps.map((d) => `- \`${d}\``).join('\n') : '- (see package.json)'}

## External integrations

${meta.integrations.map((i) => `- ${i}`).join('\n')}

## Domain events (outbox)

${meta.events.length ? meta.events.map((e) => `- \`${e}\` → see [event catalog](../../architecture/event-catalog.md)`).join('\n') : '_This service may consume events but does not publish primary domain events — check code for outbox writes._'}

## Configuration

| Variable | Purpose |
| -------- | ------- |
| \`${meta.portEnv}\` | HTTP port (default ${meta.port}) |
| \`DATABASE_URL\` | PostgreSQL (via \`@nestlancer/database\`) |
| \`REDIS_URL\` | Cache / rate limits where used |
| \`RABBITMQ_URL\` | Event publishing |

Full list: [environment variables](../../guides/environment-variables.md) and Infisical paths in [infisical.md](../../guides/infisical.md).

## Local development

\`\`\`bash
# Single service (watch mode)
pnpm --filter ${meta.package} dev

# Unit + integration tests
pnpm --filter ${meta.package} test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:${meta.port}/health
\`\`\`

Run the full stack: \`make dev\` or \`pnpm dev\` from the monorepo root (starts infra via Docker Compose).

## Testing

- Unit tests: \`services/${name}/tests/unit/\`
- E2E: \`services/${name}/tests/e2e/\` (hits HTTP with Supertest)
- Cross-service flows: [testing strategy](../../guides/testing-strategy.md), [test commands](../../guides/test-commands.md)

## Operations

- Health: included in gateway \`GET /api/v1/health\` aggregation
- Logs: JSON with \`X-Correlation-ID\` from gateway
- Metrics: Prometheus scrape via \`@nestlancer/metrics\`

## Related documentation

- [System architecture](../../architecture/overview.md)
- [Database schema](../../architecture/database-schema.md)
- [Adding a new service](../../guides/adding-new-service.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)
`;
}

function workerDoc(name, meta) {
  const workerDir = path.join(root, 'workers', name);
  const deps = getWorkspaceDeps(path.join(workerDir, 'package.json'));
  return `# ${meta.title}

${meta.summary}

## At a glance

| | |
| --- | --- |
| **Package** | \`${meta.package}\` |
| **Source** | \`workers/${name}/\` |
| **Queue** | \`${meta.queue}\` |
| **Routing** | ${meta.routingKeys.join(', ')} |

## Processors / jobs

${meta.processors.map((p) => `- \`${p}\``).join('\n')}

## Message flow

\`\`\`
Service commits business data + OutboxEvent (same transaction)
        → outbox-poller publishes to RabbitMQ
        → ${meta.title} consumes from ${meta.queue}
        → side effect (email, push, S3, analytics DB, …)
\`\`\`

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../runbooks/dlq-processing.md)).

## Dependencies

${deps.map((d) => `- \`${d}\``).join('\n')}

## Local development

\`\`\`bash
pnpm --filter ${meta.package} dev
pnpm --filter ${meta.package} test
\`\`\`

Ensure RabbitMQ and PostgreSQL are running (\`make dev-services\`).

## Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../guides/adding-new-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)
`;
}

function libDoc(name, meta) {
  const libDir = path.join(root, 'libs', name);
  const deps = getWorkspaceDeps(path.join(libDir, 'package.json'));
  const pkg = `@nestlancer/${name}`;
  return `# \`${pkg}\` library

${meta.desc}

## Used by

${meta.usedBy}

## Package layout

\`\`\`
libs/${name}/src/
├── index.ts          # public exports
├── ${name}.module.ts # NestJS DynamicModule (if applicable)
└── …
\`\`\`

## Workspace dependencies

${deps.length ? deps.map((d) => `- \`${d}\``).join('\n') : '_No internal @nestlancer deps — leaf library._'}

## How to use in a service

1. Add to \`package.json\`: \`"${pkg}": "workspace:*"\`
2. Import module in \`app.module.ts\`
3. Import symbols from \`${pkg}\` in controllers/services

\`\`\`typescript
import { /* … */ } from '${pkg}';
\`\`\`

## Related documentation

- [Monorepo ADR](../../adr/001-monorepo-structure.md)
- [Coding standards](../../guides/coding-standards.md)
- [Component index](../README.md)
`;
}

// Gateways
const gatewayDoc = fs.readFileSync(path.join(root, 'docs/components/gateway.md'), 'utf8');
// We'll overwrite gateway with expanded version below

for (const [name, meta] of Object.entries(SERVICES)) {
  fs.writeFileSync(path.join(root, 'docs/components/services', `${name}.md`), serviceDoc(name, meta));
}
for (const [name, meta] of Object.entries(WORKERS)) {
  fs.writeFileSync(path.join(root, 'docs/components/workers', `${name}.md`), workerDoc(name, meta));
}
for (const [name, meta] of Object.entries(LIBS)) {
  fs.writeFileSync(path.join(root, 'docs/components/libs', `${name}.md`), libDoc(name, meta));
}

console.log('Generated expanded component documentation.');
