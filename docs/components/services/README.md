<div align="center">

# Microservices (`services/`)

</div>

---

16 independently deployable NestJS microservices sit behind the API
Gateway. Each owns its own controllers, DTOs, and Prisma models; see
[system architecture](../../architecture/overview.md) for how requests flow from the gateway to
these services and on to PostgreSQL/RabbitMQ.

| Service | Gateway prefix | Default port | Summary | Reference |
| --- | --- | --- | --- | --- |
| [Health Service](health.md) | `/api/v1/health` | 3016 | Operational health for Kubernetes probes, admin diagnostics, and dependency status (PostgreSQL, Redis, RabbitMQ, S3, workers, WebSocket). | [API spec](../../api/services/health.md) |
| [Auth Service](auth.md) | `/api/v1/auth` | 3001 | Identity entry point: registration, login, JWT issuance, email verification, password reset, 2FA challenge, and session refresh. | [API spec](../../api/services/auth.md) |
| [Users Service](users.md) | `/api/v1/users` | 3002 | Profile, preferences, avatar, sessions, 2FA settings, GDPR export, and admin user lifecycle. | [API spec](../../api/services/users.md) |
| [Payments Service](payments.md) | `/api/v1/payments` | 3003 | Razorpay checkout in INR (amounts in paise), milestones, invoices/receipts PDF, refunds, disputes, and admin reconciliation. | [API spec](../../api/services/payments.md) |
| [Webhooks Ingestion Service](webhooks.md) | `/api/v1/webhooks` | 3004 | Dedicated ingress for third-party webhooks (Razorpay, GitHub). Verifies signatures, logs payloads, enqueues to webhook-worker. | [API spec](../../api/services/webhooks.md) |
| [Admin Service](admin.md) | `/api/v1/admin` | 3005 | Operator console backend: dashboards, system config, feature flags, audit, impersonation, backups, webhook management. | [API spec](../../api/services/admin.md) |
| [Requests Service](requests.md) | `/api/v1/requests` | 3006 | Client project inquiries from draft through admin review before a quote is issued. | [API spec](../../api/services/requests.md) |
| [Quotes Service](quotes.md) | `/api/v1/quotes` | 3007 | Formal proposals with line items, payment schedule, PDF export, acceptance/decline, and templates. | [API spec](../../api/services/quotes.md) |
| [Projects Service](projects.md) | `/api/v1/projects` | 3008 | Active engagement after quote acceptance: status, feedback, messages, public showcase. | [API spec](../../api/services/projects.md) |
| [Progress Service](progress.md) | `/api/v1/progress` | 3009 | Delivery tracking: timeline entries, milestones, file deliverables, client approvals. | [API spec](../../api/services/progress.md) |
| [Messaging Service](messaging.md) | `/api/v1/messaging` | 3010 | REST layer for project-scoped chat, threads, reactions, read receipts; realtime via ws-gateway. | [API spec](../../api/services/messaging.md) |
| [Notifications Service](notifications.md) | `/api/v1/notifications` | 3011 | In-app inbox, channel preferences, Web Push subscriptions, admin broadcast/segment sends. | [API spec](../../api/services/notifications.md) |
| [Media Service](media.md) | `/api/v1/media` | 3012 | Upload pipeline: presigned URLs, chunked uploads, virus scan, versions, public share links. | [API spec](../../api/services/media.md) |
| [Portfolio Service](portfolio.md) | `/api/v1/portfolio` | 3013 | Public case studies and work samples with categories, search, analytics, and admin ordering. | [API spec](../../api/services/portfolio.md) |
| [Blog Service](blog.md) | `/api/v1/blog` | 3014 | Headless CMS: posts, taxonomy, comments, likes, bookmarks, RSS, scheduling, moderation. | [API spec](../../api/services/blog.md) |
| [Contact Service](contact.md) | `/api/v1/contact` | 3015 | Marketing contact form, spam filtering, auto-replies, admin CRM inbox. | [API spec](../../api/services/contact.md) |

Each service doc includes a real, source-extracted HTTP route table (controllers under
`src/controllers/**/*.controller.ts`), workspace dependencies read from `package.json`, domain
events, and local dev commands. See [adding a new service](../../development/adding-a-service.md)
to scaffold a 17th.

[← Back to component index](../README.md)
