## 📖 Table of Contents

- [Monorepo Management](#monorepo-management)
- [Programming Language](#programming-language)
- [🏗️ Backend Frameworks](#backend-frameworks)
- [🗄️ Databases & ORM](#databases-orm)
- [Message Queue & Streaming](#message-queue-streaming)
- [Caching](#caching)
- [Storage & CDN](#storage-cdn)
- [API Gateway & Entry Layer](#api-gateway-entry-layer)
- [Authentication & Security](#authentication-security)
- [Payment & Third-Party Integrations](#payment-third-party-integrations)
- [Observability & Monitoring](#observability-monitoring)
- [⚙️ Workers (Async Processing)](#workers-async-processing)
- [Shared Libraries (Internal)](#shared-libraries-internal)
- [🧪 Testing](#testing)
- [Deployment & Infrastructure](#deployment-infrastructure)
- [Development Tools](#development-tools)
- [📚 Documentation](#documentation)

---

## 🧰 Monorepo Management

- **pnpm** `[Free]` – Fast, disk-space-efficient package manager with workspace support.
- **Turborepo** `[Free]` – High-performance build system for monorepos (caching, parallel execution).

---

## 💻 Programming Language

- **TypeScript** `[Free]` – Strictly typed JavaScript, used across all services and libraries.

---

## 🏗️ Backend Frameworks

- **NestJS** `[Free]` – Progressive Node.js framework for building efficient and scalable server-side applications (used for all services, gateways, and workers).
- **Express** `[Free]` (underlying) – NestJS uses Express by default (optional Fastify).

---

## 🗄️ Databases & ORM

- **PostgreSQL** `[Free]` – Primary relational database.
  - Self-hosted primary instance for writes, with read replicas for read-heavy operations.
  - **Patroni** `[Free]` – High availability and auto-failover (self-hosted instead of RDS).
- **Prisma** `[Free]` – Type-safe ORM with migrations, used for database access and schema management.

---

## 🚦 Message Queue & Streaming

- **RabbitMQ** `[Free]` – Message broker with exchanges, queues, DLQ, and per-queue TTL.
  - Exchanges: `events`, `webhooks`
  - Dead Letter Queue (DLQ) for failed messages.

---

## ⚡ Caching

- **Redis** `[Free]` – Self-hosted, two dedicated instances:
  - **Redis Cache** `[Free]` – General caching, rate limiting, idempotency store (fast check).
  - **Redis Pub/Sub** `[Free]` – Real-time message fan-out for WebSocket instances.

---

## 📦 Storage & CDN

- **Object Storage (S3-compatible)** `[Freemium]` – AWS S3 or any S3-compatible API for high-performance object storage.
  - **Storage Architecture (Dual Bucket)**:
    - `nestlancer-private`: Used for secure, client-facing project deliverables. Strictly private, accessed via temporary presigned URLs only.
    - `nestlancer-public`: Used for portfolio, blog, and public assets. Exposed directly via Cloudflare CDN.
  - **Storage Cost**: ₹0.006 per GB/month (approx. ₹6/TB).
  - **Egress**: **Free** when served via Cloudflare CDN (Bandwidth Alliance) from the public bucket.
  - **Class A Ops**: Free (up to 2,500 per day), then ₹0.005 per 10,000.
  - **Class B Ops**: Free (up to 2,500 per day), then ₹0.004 per 10,000.
- **CDN (Cloudflare)** `[Free]` – Content delivery network.
  - **Features**: Global CDN, DDoS protection, origin pull from S3-compatible storage.

---

## 🌐 API Gateway & Entry Layer

- **Load Balancer (Nginx)** `[Free]` – For TLS termination, sticky sessions for WebSockets.
- **Custom API Gateway** `[Free]` – NestJS-based gateway handling routing, versioning, throttling, and Swagger/OpenAPI exposure.
- **WebSocket Gateway** `[Free]` – Separate NestJS gateway for real-time connections (JWT auth, rooms, presence).

---

## 🔐 Authentication & Security

- **JWT** `[Free]` – For stateless authentication (access & refresh tokens).
- **RBAC** `[Free]` – Role-based access control with permission guards.
- **API Keys** `[Free]` – For machine-to-machine communication.
- **CSRF Protection** `[Free]` – Security for state-changing requests.
- **Crypto Utilities** `[Free]` – Hashing (bcrypt), encryption, HMAC, TOTP (2FA).
- **Cloudflare Turnstile** `[Free]` – Privacy-friendly bot protection (replaces Captcha).
- **Virus Scanning (ClamAV)** `[Free]` – Open-source media file scanning.
- **Secrets Management** `[Free]` – Centralized secret management via standard environment variables (integrated with Vault, K8s Secrets, or AWS Secrets Manager in production).

---

## 💳 Payment & Third-Party Integrations

- **Razorpay** `[Paid]` – Payment gateway.
  - **Domestic**: 2% per successful transaction.
  - **International**: 3% per successful transaction.
  - **Notes**: +18% GST on platform fees. No setup or AMC fees.
- **Third-Party APIs** `[Varies]` – Git integrations, CI services, etc.
- **Email** `[Freemium / Paid]`
  - **ZeptoMail** `[Paid]` – For critical transactional emails (Auth/AuthZ). No additional cost for multiple sender identities (e.g., `payments@`, `support@`). Billed via credits (₹2.50 per 10k emails).
  - **AWS SES** `[Paid]` – For high-volume notifications. No cost for verifying multiple email identities or domain-wide identities. Pay-as-you-go (₹0.10 per 1k emails).
- **Web Push (VAPID)** `[Free]` – Native browser push notifications using the VAPID protocol, processed directly by the Notification Worker (no third-party middleman like Firebase required).
- **Object Storage Providers** `[Freemium]` – S3-compatible storage (pluggable via `@nestlancer/storage` library).

---

## 📊 Observability & Monitoring

- **Logging** `[Free]` – Structured JSON logs with correlation IDs.
- **Metrics (Prometheus)** `[Free]` – Custom metrics (HTTP, queue, DB, cache).
- **Tracing (Jaeger)** `[Free]` – OpenTelemetry for distributed tracing.
- **Health Checks** `[Free]` – Kubernetes liveness/readiness probes.
- **Alerting** `[Freemium]` – Discord/Telegram `[Free]`, UptimeRobot `[Freemium]`, or Grafana OnCall `[Freemium]`.

---

## ⚙️ Workers (Async Processing)

All workers are NestJS applications consuming from RabbitMQ:

- **Email Worker** – Sends emails with retries, backoff, circuit breaker.
- **Notification Worker** – Delivers in-app, push, and real-time notifications via Redis Pub/Sub.
- **Audit Worker** – Batch inserts audit logs.
- **Media Worker** – Image resizing (Sharp), thumbnail generation, video transcoding (FFmpeg), virus scanning (ClamAV).
- **Analytics Worker** – Aggregates data for reports.
- **Webhook Worker** – Processes incoming webhooks (idempotent, provider-specific handlers).
- **CDN Worker** – Batches and sends cache invalidation requests.
- **Outbox Poller** – Polls transactional outbox table and publishes events to RabbitMQ.

---

## 🧩 Shared Libraries (Internal)

All located in `libs/` and published within the monorepo:

- `common` – Constants, enums, types, DTOs, exceptions, interceptors, pipes, utils.
- `config` – Environment and secrets loading with validation (Zod schemas).
- `database` – Prisma service with read/write separation, repositories, transactional decorators.
- `cache` – Redis caching with TTL, tagging, and invalidation.
- `queue` – RabbitMQ publisher/consumer abstractions, DLQ handling.
- `outbox` – Transactional outbox pattern implementation.
- `auth-lib` – Guards, strategies, decorators for JWT, roles, permissions.
- `logger` – Structured logging with multiple transports.
- `metrics` – Prometheus metrics collection and exposition.
- `tracing` – OpenTelemetry setup and correlation ID propagation.
- `health-lib` – Health indicators for various dependencies.
- `idempotency` – Idempotency key handling (Redis + DB).
- `audit` – Direct audit log writer (no events).
- `alerts` – Alerting channels and rules.
- `middleware` – Reusable middleware (CORS, rate limiter, feature flags, etc.).
- `storage` – Pluggable storage providers (Cloudflare R2, local).
- `mail` – Email providers (SES, SMTP, SendGrid) with templating.
- `crypto` – Hashing, encryption, HMAC, TOTP.
- `websocket` – WebSocket adapter, auth, room management.
- `pdf` – PDF generation (quotes, invoices, receipts).
- `search` – Meilisearch integration for efficient filtering and full-text search.
- `circuit-breaker` – Circuit breaker pattern for external calls.
- `turnstile` – Turnstile verification guard.
- `testing` – Factories, mocks, helpers for unit and e2e tests.

---

## 🧪 Testing

- **Jest** `[Free]` – Unit and integration tests.
- **Supertest** `[Free]` – E2E tests for HTTP endpoints.
- **Custom test factories** `[Free]` – For creating test data.
- **Mocks** `[Free]` – For external services (Prisma, Redis, RabbitMQ, etc.).

---

## 🐳 Deployment & Infrastructure

- **Containerization (Docker)** `[Free]` – Multi-stage builds, base images.
- **Orchestration (K8s/K3s)** `[Free]` – Deployed on **Private VPS** with high-performance resources (AMD EPYC/Ryzen, NVMe storage).
- **Infrastructure as Code (Terraform)** `[Free]` – Modules for VPS provisioning.
- **CI/CD (GitHub Actions)** `[Freemium]` – For CI, CD, and security scanning.

---

## 🔧 Development Tools

- **ESLint & Prettier** `[Free]` – Linting and formatting.
- **Husky & lint-staged** `[Free]` – Git hooks and staged linting.
- **commitlint** `[Free]` – Enforce conventional commits.
- **NestJS CLI** `[Free]` – For scaffolding and building.
- **Makefile** `[Free]` – Common development tasks.

---

## 📚 Documentation

- **OpenAPI / Swagger** `[Free]` – API specification (served via gateway).
- **Postman** `[Freemium]` – For API exploration.
- **Architecture Decision Records (ADRs)** `[Free]` – Document key technical decisions.
- **Runbooks & Guides** `[Free]` – Incident response and developer onboarding.

---

This tech stack reflects a modern, scalable, and production-ready system designed for high availability, observability, and developer productivity.
