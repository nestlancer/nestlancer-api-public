#!/usr/bin/env node
/**
 * Generates rich docs under docs/components/ from source metadata.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

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
    prisma: [
      'UserCredential',
      'RefreshToken',
      'EmailVerificationToken',
      'PasswordResetToken',
      'LoginAttempt',
    ],
    summary:
      'Identity entry point: registration, login, JWT issuance, email verification, password reset, 2FA challenge, and session refresh.',
    responsibilities: [
      'Issue RS256 JWT access tokens (15 min) and rotating refresh tokens (cookie + body)',
      'Enforce Turnstile on register/login; lock accounts after failed attempts',
      'Emit outbox events for welcome/verification emails (consumed by email-worker)',
    ],
    integrations: ['ZeptoMail (via queue)', 'Cloudflare Turnstile', 'Redis (rate limits)'],
    events: [
      'auth.user.registered',
      'auth.login.success',
      'auth.email.verified',
      'auth.password.changed',
    ],
  },
  users: {
    title: 'Users Service',
    package: '@nestlancer/users-service',
    port: 3002,
    portEnv: 'USERS_SERVICE_PORT',
    apiBase: '/api/v1/users',
    prisma: ['User', 'UserPreferences', 'UserSession', 'UserActivity'],
    summary:
      'Profile, preferences, avatar, sessions, 2FA settings, GDPR export, and admin user lifecycle.',
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
    prisma: [
      'Payment',
      'PaymentIntent',
      'PaymentMethod',
      'PaymentMilestone',
      'PaymentDispute',
      'Refund',
    ],
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
    summary:
      'Formal proposals with line items, payment schedule, PDF export, acceptance/decline, and templates.',
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
    summary:
      'Active engagement after quote acceptance: status, feedback, messages, public showcase.',
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
    summary:
      'Delivery tracking: timeline entries, milestones, file deliverables, client approvals.',
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
    summary:
      'REST layer for project-scoped chat, threads, reactions, read receipts; realtime via ws-gateway.',
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
    summary:
      'In-app inbox, channel preferences, Web Push subscriptions, admin broadcast/segment sends.',
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
    summary:
      'Upload pipeline: presigned URLs, chunked uploads, virus scan, versions, public share links.',
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
    summary:
      'Public case studies and work samples with categories, search, analytics, and admin ordering.',
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
    summary:
      'Headless CMS: posts, taxonomy, comments, likes, bookmarks, RSS, scheduling, moderation.',
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
    summary:
      'Renders Handlebars templates and sends mail via ZeptoMail (transactional) or SES (bulk).',
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
    summary:
      'Writes in-app notifications, sends Web Push, publishes Redis events for Socket.IO fan-out.',
    processors: ['in-app-notification', 'push-notification', 'realtime-fanout'],
  },
  'audit-worker': {
    title: 'Audit Worker',
    package: '@nestlancer/audit-worker',
    queue: 'audit.queue',
    routingKeys: ['audit.#'],
    summary:
      'Buffers audit entries from the queue and batch-inserts into PostgreSQL for compliance queries.',
    processors: ['audit-batch-insert'],
  },
  'media-worker': {
    title: 'Media Worker',
    package: '@nestlancer/media-worker',
    queue: 'media.queue',
    routingKeys: ['media.#'],
    summary:
      'Sharp/FFmpeg processing: resize, thumbnails, metadata, virus scan, triggers CDN invalidation.',
    processors: [
      'image-resize',
      'thumbnail',
      'video-transcode',
      'virus-scan',
      'metadata-extractor',
    ],
  },
  'analytics-worker': {
    title: 'Analytics Worker',
    package: '@nestlancer/analytics-worker',
    queue: 'analytics.queue',
    routingKeys: ['analytics.#'],
    summary: 'Rolls up views, revenue snapshots, portfolio/blog engagement into reporting tables.',
    processors: [
      'user-analytics',
      'project-analytics',
      'revenue-analytics',
      'blog-analytics',
      'portfolio-analytics',
    ],
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
  'document-worker': {
    title: 'Document Worker',
    package: '@nestlancer/document-worker',
    queue: 'document.queue',
    routingKeys: ['document.#', 'quote.#', 'payment.#'],
    summary:
      'Renders quote, contract, invoice, receipt, and payment-reminder PDFs (Puppeteer) via @nestlancer/documents/@nestlancer/pdf, stores them, and emits DOCUMENT_READY to the outbox.',
    processors: [
      'quote-pdf (QUOTE_SENT / quote.quote.sent)',
      'quote-revision-pdf (QUOTE_REVISION_CREATED / document.quote.revised)',
      'contract-pdf (QUOTE_ACCEPTED / quote.quote.accepted)',
      'invoice-pdf + receipt-pdf (PAYMENT_COMPLETED / payment.payment.completed)',
      'invoice-pdf (PAYMENT_REQUESTED, MANUAL_PAYMENT_CREATED, payment.payment.initiated)',
      'reminder-pdf (PAYMENT_REMINDER / payment.payment.reminder)',
    ],
  },
  'export-worker': {
    title: 'Export Worker',
    package: '@nestlancer/export-worker',
    queue: 'export.queue',
    routingKeys: ['export.#'],
    summary:
      'Builds downloadable ZIP/CSV/JSON exports (GDPR user data, project handoff, audit log, revenue, blog posts) via @nestlancer/documents, stores them, and emits EXPORT_COMPLETED to the outbox.',
    processors: [
      'gdpr-user-export (USER_DATA_EXPORT_REQUESTED)',
      'project-export (PROJECT_EXPORT_REQUESTED)',
      'audit-export (AUDIT_EXPORT, csv/json)',
      'revenue-export (REVENUE_EXPORT_REQUESTED, csv/json)',
      'blog-posts-export (BLOG_POSTS_EXPORT_REQUESTED)',
    ],
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
  documents: {
    desc: 'DocumentGenerationService: renders and versions quote/contract/invoice/receipt PDFs and GDPR/project/audit/revenue exports, writes DocumentNumber sequences, stores via @nestlancer/storage.',
    usedBy: 'admin, payments, projects, quotes, users; document-worker, export-worker',
  },
  email: {
    desc: 'Email job interface/mapper and EmailQueueService — normalizes outbound email jobs onto the queue for email-worker to render and send.',
    usedBy: 'auth, contact; email-worker, notification-worker',
  },
  notifications: {
    desc: 'Notification job typing/mapper, user notification-preference checks, and template helpers shared between producers and notification-worker.',
    usedBy:
      'notification-worker (producers across services publish notification jobs matching this contract)',
  },
  tests: {
    desc: '⚠️ Anomalous package: only a root `jest.config.ts` is present — no `package.json`, `src/`, or `tests/` directory exists. The config targets `<rootDir>/src/**/*.ts` and `<rootDir>/tests/**/*.spec.ts`, neither of which exist. A 2026-era internal tracker (docs/archive, now retired) once listed this as "shared test factories and mocks", which today live in `libs/testing/` instead. No other package imports from `libs/tests`. Treat as a stale/incomplete scaffold pending a maintainer decision to delete it or build it out — do not assume it is a working package.',
    usedBy: 'Nothing currently (no caller found via repo-wide search)',
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

function getExternalDeps(pkgPath) {
  const pkg = readJson(pkgPath);
  if (!pkg?.dependencies) return [];
  return Object.entries(pkg.dependencies)
    .filter(([d]) => !d.startsWith('@nestlancer/'))
    .map(([d, v]) => ({ name: d, version: v }));
}

// --- Real filesystem tree (no fabricated/templated layout) ---------------------------------
function buildFileTree(dir, prefix = '', depth = 0, maxDepth = 2) {
  if (depth > maxDepth || !fs.existsSync(dir)) return '';
  let entries;
  try {
    entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  } catch {
    return '';
  }
  let out = '';
  entries.forEach((e, i) => {
    const isLast = i === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    out += `${prefix}${connector}${e.name}${e.isDirectory() ? '/' : ''}\n`;
    if (e.isDirectory()) {
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      out += buildFileTree(path.join(dir, e.name), childPrefix, depth + 1, maxDepth);
    }
  });
  return out;
}

function countFiles(dir, exts = ['.ts']) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) n += countFiles(p, exts);
    else if (exts.some((ext) => e.name.endsWith(ext)) && !e.name.endsWith('.spec.ts')) n += 1;
  }
  return n;
}

// --- Real public-API extraction (walks the real `export * from` / `export { } from` graph) ----
function extractReexportTargets(filePath) {
  let src;
  try {
    src = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }
  const re = /export\s+(?:\*|\{[^}]*\})\s+from\s+['"](\.[^'"]+)['"]/g;
  const targets = [];
  let m;
  while ((m = re.exec(src))) targets.push(m[1]);
  return targets;
}

function extractDeclaredExports(filePath) {
  let src;
  try {
    src = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }
  const re =
    /export\s+(?:default\s+)?(abstract\s+class|class|interface|async function|function|const|enum|type)\s+([A-Za-z0-9_]+)/g;
  const results = [];
  let m;
  while ((m = re.exec(src))) {
    const kind = m[1].replace('abstract class', 'class').replace('async function', 'function');
    results.push({ name: m[2], kind });
  }
  return results;
}

function resolveModulePath(baseDir, importPath) {
  const direct = path.join(baseDir, `${importPath}.ts`);
  if (fs.existsSync(direct)) return { type: 'file', path: direct };
  const asIndex = path.join(baseDir, importPath, 'index.ts');
  if (fs.existsSync(asIndex)) return { type: 'file', path: asIndex };
  const asDir = path.join(baseDir, importPath);
  if (fs.existsSync(asDir) && fs.statSync(asDir).isDirectory()) return { type: 'dir', path: asDir };
  return null;
}

const CATEGORY_BY_DIR = {
  guards: 'Guards',
  decorators: 'Decorators',
  interfaces: 'Interfaces',
  strategies: 'Strategies',
  utils: 'Utilities',
  constants: 'Constants',
  interceptors: 'Interceptors',
  filters: 'Filters',
  pipes: 'Pipes',
  dto: 'DTOs',
  enums: 'Enums',
  types: 'Types',
  exceptions: 'Exceptions',
  middleware: 'Middleware',
  transports: 'Transports',
  formatters: 'Formatters',
  permissions: 'Permissions',
  schemas: 'Schemas',
  'routing-keys': 'Routing keys',
  exchanges: 'Exchanges',
  contracts: 'Contracts',
  observability: 'Observability',
  payment: 'Payment',
  'state-machines': 'State machines',
};

function categorize(relPath) {
  const segments = relPath.split(path.sep);
  if (segments.length > 1 && CATEGORY_BY_DIR[segments[0]]) return CATEGORY_BY_DIR[segments[0]];
  const base = path.basename(relPath);
  if (/\.module\.ts$/.test(base)) return 'Modules';
  if (/\.service\.ts$/.test(base)) return 'Services';
  if (/\.guard\.ts$/.test(base)) return 'Guards';
  if (/\.decorator\.ts$/.test(base)) return 'Decorators';
  if (/\.interface\.ts$/.test(base)) return 'Interfaces';
  if (/\.util\.ts$/.test(base)) return 'Utilities';
  if (/\.strategy\.ts$/.test(base)) return 'Strategies';
  if (/\.constants?\.ts$/.test(base)) return 'Constants';
  if (/\.repository\.ts$/.test(base)) return 'Repositories';
  return 'Other';
}

const CATEGORY_ORDER = [
  'Modules',
  'Services',
  'Repositories',
  'Guards',
  'Strategies',
  'Decorators',
  'Interceptors',
  'Filters',
  'Pipes',
  'Permissions',
  'Middleware',
  'Transports',
  'Formatters',
  'Interfaces',
  'DTOs',
  'Types',
  'Schemas',
  'Enums',
  'Constants',
  'Routing keys',
  'Exchanges',
  'Contracts',
  'Observability',
  'Payment',
  'State machines',
  'Exceptions',
  'Utilities',
  'Other',
];

/**
 * Walks the real `export * from './x'` / `export { A } from './x'` graph starting at
 * `libs/<name>/src/index.ts`, resolves each target file on disk, and extracts the symbols
 * each target *actually declares* (class/interface/function/const/enum/type). This replaces
 * fabricated "Package layout" / "exported API" text with facts read straight from source.
 */
function collectLibraryApi(libDir) {
  const indexPath = path.join(libDir, 'src/index.ts');
  const byCategory = new Map();
  let fileCount = 0;
  if (!fs.existsSync(indexPath)) return { byCategory, fileCount, symbolCount: 0 };

  const seen = new Set();
  function visit(filePath) {
    if (seen.has(filePath)) return;
    seen.add(filePath);
    if (filePath !== indexPath) {
      const exports = extractDeclaredExports(filePath);
      if (exports.length) {
        fileCount += 1;
        const rel = path.relative(path.join(libDir, 'src'), filePath);
        const cat = categorize(rel);
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        for (const ex of exports) byCategory.get(cat).push({ ...ex, file: rel });
      }
    }
    const selfDir = path.dirname(filePath);
    for (const target of extractReexportTargets(filePath)) {
      const resolved = resolveModulePath(selfDir, target);
      if (!resolved) continue;
      if (resolved.type === 'file') {
        visit(resolved.path);
      } else if (resolved.type === 'dir') {
        for (const e of fs.readdirSync(resolved.path, { withFileTypes: true })) {
          if (e.isFile() && e.name.endsWith('.ts')) visit(path.join(resolved.path, e.name));
        }
      }
    }
  }
  visit(indexPath);

  let symbolCount = 0;
  for (const list of byCategory.values()) symbolCount += list.length;
  return { byCategory, fileCount, symbolCount };
}

function pickShowcaseSymbol(byCategory) {
  for (const cat of [
    'Modules',
    'Guards',
    'Services',
    'Decorators',
    'Strategies',
    'Interceptors',
    'Utilities',
  ]) {
    const list = byCategory.get(cat);
    if (list && list.length) return { ...list[0], category: cat };
  }
  for (const [cat, list] of byCategory) {
    if (list.length) return { ...list[0], category: cat };
  }
  return null;
}

function usageSnippet(pkg, showcase) {
  if (!showcase) return `import '${pkg}';`;
  const { name, category } = showcase;
  if (category === 'Modules') {
    return `import { ${name} } from '${pkg}';\n\n@Module({\n  imports: [${name}],\n})\nexport class AppModule {}`;
  }
  if (category === 'Guards') {
    return `import { ${name} } from '${pkg}';\n\n@UseGuards(${name})\n@Get()\nfindAll() {\n  /* ... */\n}`;
  }
  if (category === 'Services') {
    return `import { ${name} } from '${pkg}';\n\nconstructor(private readonly svc: ${name}) {}`;
  }
  if (category === 'Decorators') {
    return `import { ${name} } from '${pkg}';\n\n@${name}()\nhandler() {\n  /* ... */\n}`;
  }
  if (category === 'Strategies') {
    return `import { ${name} } from '${pkg}';\n\n// Registered once, e.g. in the auth module's providers: [${name}]`;
  }
  return `import { ${name} } from '${pkg}';`;
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
          ...allRoutes
            .slice(0, 40)
            .map((r) => `| \`${r.method}\` | \`${r.path}\` | \`${r.controller}\` |`),
          ...(allRoutes.length > 40
            ? [`| … | _${allRoutes.length - 40} more routes — see OpenAPI_ | |`]
            : []),
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

Full list: [environment variables](../../reference/environment-variables.md) and Infisical paths in [secrets-infisical.md](../../operations/secrets-infisical.md).

## Local development

\`\`\`bash
# Single service (watch mode)
pnpm --filter ${meta.package} dev

# Unit + integration tests
pnpm --filter ${meta.package} test

# Hit service directly (bypass gateway) — useful for debugging
curl http://localhost:${meta.port}/health
\`\`\`

Run the full stack: \`make dev\` or \`pnpm docker:up && pnpm dev\` from the monorepo root (PostgreSQL/Redis/RabbitMQ come from the shared dev VPS via Infisical — see [Local workflow](../../development/local-workflow.md)).

## Testing

- Unit tests: \`services/${name}/tests/unit/\`
- E2E: \`services/${name}/tests/e2e/\` (hits HTTP with Supertest)
- Cross-service flows: [testing strategy](../../development/testing.md), [test commands](../../development/test-commands.md)

## Operations

- Health: included in gateway \`GET /api/v1/health\` aggregation
- Logs: JSON with \`X-Correlation-ID\` from gateway
- Metrics: Prometheus scrape via \`@nestlancer/metrics\`

## Related documentation

- [System architecture](../../architecture/overview.md)
- [Database schema](../../architecture/database-schema.md)
- [Adding a new service](../../development/adding-a-service.md)
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

On failure: retry with backoff → dead-letter queue (see [DLQ runbook](../../operations/runbooks/dlq-processing.md)).

## Dependencies

${deps.map((d) => `- \`${d}\``).join('\n')}

## Local development

\`\`\`bash
pnpm --filter ${meta.package} dev
pnpm --filter ${meta.package} test
\`\`\`

RabbitMQ and PostgreSQL run on the shared dev VPS over Tailscale, not via local Docker Compose — see [Local workflow](../../development/local-workflow.md) for how to point \`.env\` at them.

## Related documentation

- [Queue topology](../../architecture/queue-topology.md)
- [Event catalog](../../architecture/event-catalog.md)
- [Adding a new worker](../../development/adding-a-worker.md)
- [CHANGELOG](../../changelog/CHANGELOG.md)
`;
}

function libDoc(name, meta) {
  const libDir = path.join(root, 'libs', name);
  const pkg = `@nestlancer/${name}`;

  // libs/tests has no package.json/src — it is not a real, installable workspace package.
  // Render a short known-issue page instead of the generic "how to use" template, which would
  // otherwise suggest usage instructions that don't apply to anything in this directory.
  if (!fs.existsSync(path.join(libDir, 'package.json'))) {
    return `# \`${pkg}\` (not a working package)

${meta.desc}

## Used by

${meta.usedBy}

## Related documentation

- [Reference: repository structure](../../reference/repository-structure.md)
- [Component index](../README.md)
`;
  }

  const workspaceDeps = getWorkspaceDeps(path.join(libDir, 'package.json'));
  const externalDeps = getExternalDeps(path.join(libDir, 'package.json'));
  const srcDir = path.join(libDir, 'src');
  const tree = buildFileTree(srcDir, '', 0, 2).trimEnd();
  const fileCountOnDisk = countFiles(srcDir);
  const { byCategory, symbolCount } = collectLibraryApi(libDir);

  const apiSections = CATEGORY_ORDER.filter((cat) => byCategory.has(cat))
    .map((cat) => {
      const list = byCategory.get(cat);
      const cap = 20;
      const rows = list
        .slice(0, cap)
        .map((e) => `| \`${e.name}\` | ${e.kind} | \`${name}/src/${e.file}\` |`);
      const overflow =
        list.length > cap
          ? [`| … | | _${list.length - cap} more — see \`${name}/src/index.ts\`_ |`]
          : [];
      return [
        `### ${cat} (${list.length})`,
        '',
        '| Export | Kind | Source |',
        '| --- | --- | --- |',
        ...rows,
        ...overflow,
      ].join('\n');
    })
    .join('\n\n');

  const showcase = pickShowcaseSymbol(byCategory);

  return `# \`${pkg}\` library

${meta.desc}

## Used by

${meta.usedBy}

## At a glance

| | |
| --- | --- |
| **Package** | \`${pkg}\` |
| **Source** | \`libs/${name}/src/\` |
| **Source files (non-spec \`.ts\`)** | ${fileCountOnDisk} |
| **Exported symbols (via \`index.ts\`)** | ${symbolCount} |
| **Workspace dependencies** | ${workspaceDeps.length || 'none — leaf library'} |
| **External npm dependencies** | ${externalDeps.length || 'none beyond NestJS/TS tooling'} |

## Package layout

Real directory tree of \`libs/${name}/src/\` (generated from the filesystem, depth-limited to 2):

\`\`\`
src/
${tree || '(empty or unreadable)'}
\`\`\`

## Public API (exported from \`${pkg}\`)

Extracted by resolving every \`export * from '...'\` / \`export { ... } from '...'\` statement in
\`libs/${name}/src/index.ts\` and reading the symbol each target file actually declares — this list
is generated from source, not hand-maintained.

${apiSections || '_No statically-extractable exports found in `index.ts` — check the file directly._'}

## Dependencies

### Workspace (\`@nestlancer/*\`)

${workspaceDeps.length ? workspaceDeps.map((d) => `- \`${d}\``).join('\n') : '_No internal @nestlancer deps — this is a leaf library other packages can depend on safely._'}

### External (npm)

${externalDeps.length ? externalDeps.map((d) => `- \`${d.name}\` \`${d.version}\``).join('\n') : '_No direct external dependencies beyond the shared NestJS/TypeScript toolchain already in the workspace root._'}

## How to use in a service

1. Add to the consuming package's \`package.json\`: \`"${pkg}": "workspace:*"\`
2. Import the symbol(s) you need from \`${pkg}\` (see the Public API tables above for exact names)
3. ${showcase && showcase.category === 'Modules' ? `Register \`${showcase.name}\` in the consuming app's root module (or a feature module)` : showcase ? `Inject/apply \`${showcase.name}\` where appropriate (${showcase.category.toLowerCase()})` : 'Wire the imported symbol into the relevant module, controller, or service'}

\`\`\`typescript
${usageSnippet(pkg, showcase)}
\`\`\`

${showcase ? `_Example above uses \`${showcase.name}\`, a real export of this package (${showcase.category.toLowerCase()} defined in \`${name}/src/${showcase.file}\`) — the surrounding NestJS wiring is illustrative, not copy-pasted from a specific call site._` : ''}

## Related documentation

- [Monorepo structure decision](../../decisions/001-monorepo-structure.md)
- [Coding standards](../../development/coding-standards.md)
- [Component index](../README.md)
`;
}

// Gateways
const gatewayDoc = fs.readFileSync(path.join(root, 'docs/components/gateway.md'), 'utf8');
// We'll overwrite gateway with expanded version below

// --- Category index pages ------------------------------------------------------------------
// These replace near-empty heading-only stubs with real, generated navigation tables so each
// subfolder is self-describing when browsed directly (not just reachable via docs/README.md).

function servicesIndexDoc() {
  const rows = Object.entries(SERVICES)
    .map(
      ([name, meta]) =>
        `| [${meta.title}](${name}.md) | \`${meta.apiBase}\` | ${meta.port} | ${meta.summary} | [API spec](../../api/services/${name}.md) |`,
    )
    .join('\n');
  return `<div align="center">

# Microservices (\`services/\`)

</div>

---

${Object.keys(SERVICES).length} independently deployable NestJS microservices sit behind the API
Gateway. Each owns its own controllers, DTOs, and Prisma models; see
[system architecture](../../architecture/overview.md) for how requests flow from the gateway to
these services and on to PostgreSQL/RabbitMQ.

| Service | Gateway prefix | Default port | Summary | Reference |
| --- | --- | --- | --- | --- |
${rows}

Each service doc includes a real, source-extracted HTTP route table (controllers under
\`src/controllers/**/*.controller.ts\`), workspace dependencies read from \`package.json\`, domain
events, and local dev commands. See [adding a new service](../../development/adding-a-service.md)
to scaffold a 17th.

[← Back to component index](../README.md)
`;
}

function workersIndexDoc() {
  const rows = Object.entries(WORKERS)
    .map(
      ([name, meta]) =>
        `| [${meta.title}](${name}.md) | \`${meta.queue}\` | ${meta.routingKeys.join(', ')} | ${meta.summary} |`,
    )
    .join('\n');
  return `<div align="center">

# Background workers (\`workers/\`)

</div>

---

${Object.keys(WORKERS).length} RabbitMQ consumers process events written to the transactional
outbox by services (see [queue topology](../../architecture/queue-topology.md) and the
[event catalog](../../architecture/event-catalog.md)). Failures retry with backoff and land in a
dead-letter queue — see the [DLQ runbook](../../operations/runbooks/dlq-processing.md).

| Worker | Queue | Routing key(s) | Summary |
| --- | --- | --- | --- |
${rows}

Each worker doc lists its processors/jobs, real workspace dependencies, and the message flow from
outbox write to side effect. See [adding a new worker](../../development/adding-a-worker.md) to
scaffold an 11th.

[← Back to component index](../README.md)
`;
}

function shortDesc(desc, maxLen = 140) {
  const firstSentence = desc.split(/(?<=[.:])\s/)[0];
  const base =
    firstSentence.length <= maxLen ? firstSentence : `${desc.slice(0, maxLen - 1).trimEnd()}…`;
  return base.length < desc.length ? `${base.replace(/[.:]$/, '')} — see full notes →` : base;
}

function libsIndexDoc() {
  const rows = Object.entries(LIBS)
    .map(([name, meta]) => {
      const libDir = path.join(root, 'libs', name);
      const hasPkg = fs.existsSync(path.join(libDir, 'package.json'));
      const { symbolCount } = hasPkg ? collectLibraryApi(libDir) : { symbolCount: 0 };
      const status = hasPkg ? `${symbolCount} exports` : '⚠️ not a working package';
      return `| [\`@nestlancer/${name}\`](${name}.md) | ${shortDesc(meta.desc)} | ${status} |`;
    })
    .join('\n');
  return `<div align="center">

# Shared libraries (\`libs/\`)

</div>

---

${Object.keys(LIBS).length} internal \`@nestlancer/*\` workspace packages shared across services,
workers, and gateways. Each is published only inside the pnpm workspace (\`workspace:*\`), never to
a public registry. Every library doc is generated from its real \`src/index.ts\` export graph — the
"exports" column below is a live count, not an estimate.

| Library | What it provides | Public API |
| --- | --- | --- |
${rows}

See [monorepo structure](../../decisions/001-monorepo-structure.md) for why shared code lives in
\`libs/\` instead of being duplicated per service, and
[coding standards](../../development/coding-standards.md) for conventions new libraries should
follow.

[← Back to component index](../README.md)
`;
}

function componentsIndexDoc() {
  const totalLibExports = Object.keys(LIBS).reduce((sum, name) => {
    const libDir = path.join(root, 'libs', name);
    if (!fs.existsSync(path.join(libDir, 'package.json'))) return sum;
    return sum + collectLibraryApi(libDir).symbolCount;
  }, 0);
  return `<div align="center">

# Backend components

</div>

---

Everything under this folder documents a piece of **code that actually runs** in the monorepo —
as opposed to \`docs/architecture/\` (how the pieces fit together) or \`docs/api/\` (the HTTP
contract each service exposes). Start at [docs/README.md](../README.md) for the full doc map.

| Category | Count | Index | What it is |
| --- | --- | --- | --- |
| Gateways | 2 | [gateway.md](gateway.md) · [ws-gateway.md](ws-gateway.md) | HTTP API Gateway and WebSocket Gateway — the only components with public ingress |
| Microservices | ${Object.keys(SERVICES).length} | [services/README.md](services/README.md) | Independently deployable NestJS apps, one bounded context each |
| Workers | ${Object.keys(WORKERS).length} | [workers/README.md](workers/README.md) | RabbitMQ consumers that process outbox events (email, notifications, exports, …) |
| Shared libraries | ${Object.keys(LIBS).length} | [libs/README.md](libs/README.md) | \`@nestlancer/*\` workspace packages (${totalLibExports} exported symbols total, extracted from source) |

## How these docs are generated

Service, worker, and library pages under this folder are produced by
\`scripts/docs/generate-component-docs.mjs\` (see [scripts reference](../reference/scripts.md))
directly from the source tree: controller files are parsed for real HTTP routes, \`package.json\`
files are read for real workspace/external dependencies, and library \`index.ts\` barrels are
walked to list real exported symbols. Hand-curated prose (one-line descriptions, "used by"
callers, domain event names) is layered on top where static extraction can't infer intent. Re-run
the generator after any source change that should be reflected here.

## Reading order for newcomers

1. [Architecture overview](../architecture/overview.md) — the big picture first
2. [Gateway](gateway.md) — where every external request enters
3. Pick one [service](services/README.md) relevant to your task and read it end-to-end
4. Skim [libraries](libs/README.md) you'll actually import before reinventing something that
   already exists in \`libs/\`
5. [Workers](workers/README.md) only if your change touches an async side effect

[← Back to documentation index](../README.md)
`;
}

for (const [name, meta] of Object.entries(SERVICES)) {
  fs.writeFileSync(
    path.join(root, 'docs/components/services', `${name}.md`),
    serviceDoc(name, meta),
  );
}
for (const [name, meta] of Object.entries(WORKERS)) {
  fs.writeFileSync(path.join(root, 'docs/components/workers', `${name}.md`), workerDoc(name, meta));
}
for (const [name, meta] of Object.entries(LIBS)) {
  fs.writeFileSync(path.join(root, 'docs/components/libs', `${name}.md`), libDoc(name, meta));
}

fs.writeFileSync(path.join(root, 'docs/components/services/README.md'), servicesIndexDoc());
fs.writeFileSync(path.join(root, 'docs/components/workers/README.md'), workersIndexDoc());
fs.writeFileSync(path.join(root, 'docs/components/libs/README.md'), libsIndexDoc());
fs.writeFileSync(path.join(root, 'docs/components/README.md'), componentsIndexDoc());

console.log('Generated expanded component documentation.');
