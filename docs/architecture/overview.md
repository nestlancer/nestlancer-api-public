<div align="center">

# System Architecture Overview

</div>

---

## 📖 Table of Contents

- [Introduction](#introduction)
- [High-Level Architecture](#high-level-architecture)
- [Components](#components)
- [Key Architectural Decisions](#key-architectural-decisions)
- [Request Flow Example](#request-flow-example)
- [Deployment](#deployment)

---

## Introduction

Nestlancer is a client studio platform backend built as a **NestJS monorepo**. It consists of an API Gateway, a WebSocket Gateway, 16 microservices, 8 asynchronous workers, and 24 shared libraries — designed for one operator (ADMIN) serving many clients (USER).

---

## High-Level Architecture

```
Client → Cloudflare (CDN / Turnstile CAPTCHA)
  → Nginx (TLS termination / Rate limiting)
    → API Gateway (Auth / RBAC / Validation / Routing)
      → [Microservice] → PostgreSQL / Redis
        → Outbox Event → RabbitMQ → [Worker]
```

---

## Components

### Entry Layer

| Component             | Port   | Description                                                                 |
| :-------------------- | :----- | :-------------------------------------------------------------------------- |
| **Nginx**             | 80/443 | TLS termination, rate limiting, static asset serving, reverse proxy         |
| **API Gateway**       | 3000   | Authentication, RBAC, validation, request routing to services               |
| **WebSocket Gateway** | 3001\* | Real-time messaging and notifications via Socket.IO (\*see port note above) |

### Middleware Pipeline (API Gateway)

All requests pass through this ordered middleware pipeline:

1. **CORS Middleware** – Cross-origin request handling
2. **Request Tracer** – Generates/forwards `X-Correlation-ID`
3. **JWT Auth Guard** – Token validation (skipped for `@Public()` routes)
4. **Rate Limiter** – Per-tier rate limiting (anonymous: 30/min, authenticated: 100/min, admin: 300/min)
5. **Validation Pipe** – DTO validation via `class-validator`
6. **CSRF Guard** – Double-submit cookie pattern for web clients

### ⚙️ Microservices (16)

Default ports from each service’s `*_SERVICE_PORT` env (local dev). **Authoritative list:** [modification-playbook § Service ports](../guides/modification-playbook.md#service-port-quick-reference) and per-service docs under [components/services/](../components/services/).

| Service       | Port | Env variable                 | Description                                 |
| :------------ | :--- | :--------------------------- | :------------------------------------------ |
| Auth          | 3001 | `AUTH_SERVICE_PORT`          | Authentication, JWT, 2FA, sessions          |
| Users         | 3002 | `USERS_SERVICE_PORT`         | User profiles, preferences, sessions        |
| Payments      | 3003 | `PAYMENTS_SERVICE_PORT`      | Razorpay integration, payment processing    |
| Webhooks      | 3004 | `WEBHOOKS_SERVICE_PORT`      | Inbound webhook ingestion                   |
| Admin         | 3005 | `ADMIN_SERVICE_PORT`         | System administration, config, audit        |
| Requests      | 3006 | `REQUESTS_SERVICE_PORT`      | Service request management                  |
| Quotes        | 3007 | `QUOTES_SERVICE_PORT`        | Quote/proposal generation and acceptance    |
| Projects      | 3008 | `PROJECTS_SERVICE_PORT`      | Project lifecycle management                |
| Progress      | 3009 | `PROGRESS_SERVICE_PORT`      | Milestones, deliverables, progress tracking |
| Messaging     | 3010 | `MESSAGING_SERVICE_PORT`     | Real-time messaging via conversations       |
| Notifications | 3011 | `NOTIFICATIONS_SERVICE_PORT` | Multi-channel notification delivery         |
| Media         | 3012 | `MEDIA_SERVICE_PORT`         | File upload, processing, CDN integration    |
| Portfolio     | 3013 | `PORTFOLIO_SERVICE_PORT`     | Public portfolio showcase                   |
| Blog          | 3014 | `BLOG_SERVICE_PORT`          | Blog posts, comments, categories            |
| Contact       | 3015 | `CONTACT_SERVICE_PORT`       | Contact form submissions                    |
| Health        | 3016 | `HEALTH_SERVICE_PORT`        | System health checks and readiness probes   |

> **Note:** The **WebSocket gateway** also defaults to port **3001** in some configs. In Docker Compose, auth and ws-gateway use distinct host ports — do not bind both to the same host port when running outside Compose.

### Async Workers (8)

| Worker              | Queue                | Description                                  |
| :------------------ | :------------------- | :------------------------------------------- |
| Email Worker        | `email.queue`        | Sends transactional emails via ZeptoMail/SES |
| Notification Worker | `notification.queue` | Sends push notifications, in-app             |
| Audit Worker        | `audit.queue`        | Batch-inserts audit logs to PostgreSQL       |
| Media Worker        | `media.queue`        | Image resize, video transcode, virus scan    |
| Analytics Worker    | `analytics.queue`    | Aggregates view counts, statistics           |
| Webhook Worker      | `webhook.queue`      | Processes inbound/outbound webhooks          |
| CDN Worker          | `cdn.queue`          | CloudFront/Cloudflare cache invalidation     |
| Outbox Poller       | –                    | Polls outbox table, publishes to RabbitMQ    |

### Infrastructure

| Component                 | Technology              | Purpose                                         |
| :------------------------ | :---------------------- | :---------------------------------------------- |
| **PostgreSQL 16**         | Primary + Read Replicas | Persistent data storage (R/W split via Patroni) |
| **Redis 7 (Cache)**       | Port 6379               | Application caching with LRU eviction           |
| **Redis 7 (Pub/Sub)**     | Port 6380               | WebSocket cross-instance communication          |
| **RabbitMQ 3.13**         | Port 5672               | Event bus for async processing                  |
| **S3-Compatible**         | –                       | File storage (private + public buckets)         |
| **CloudFront/Cloudflare** | –                       | CDN for public assets                           |

---

## Key Architectural Decisions

| ADR     | Decision                      | Rationale                                                           |
| :------ | :---------------------------- | :------------------------------------------------------------------ |
| ADR-001 | pnpm + Turborepo monorepo     | Shared code, single CI pipeline, atomic refactors                   |
| ADR-002 | PostgreSQL with read replicas | ACID for payments, JSONB for metadata, Prisma support               |
| ADR-003 | JWT + refresh token rotation  | 15min access / 7d refresh, dual delivery (cookie + Bearer)          |
| ADR-004 | Transactional outbox pattern  | At-least-once delivery, no dual-write problem                       |
| ADR-005 | Read/write split              | `PrismaWriteService` for mutations, `PrismaReadService` for queries |
| ADR-006 | RabbitMQ topic exchange       | Flexible routing, dead-letter queues, publisher confirms            |
| ADR-007 | Idempotency keys              | Redis + PostgreSQL, 24h TTL, prevents duplicate payments            |
| ADR-008 | Tag-based cache invalidation  | Entity-specific TTLs, Redis sets for tag→key mapping                |

---

## Request Flow Example

### Project Lifecycle

```
1. Client submits service request → POST /api/v1/requests
2. Admin reviews request → PATCH /api/v1/requests/:id/status
3. Admin sends quote → POST /api/v1/quotes
4. Client accepts quote → POST /api/v1/quotes/:id/accept
5. Project created automatically → Project + Milestones + Payment Schedule
6. Admin tracks progress → POST /api/v1/progress/:projectId/entries
7. Deliverables uploaded → POST /api/v1/progress/:projectId/deliverables
8. Client approves milestone → POST /api/v1/progress/:projectId/milestones/:id/approve
9. Payment processed → POST /api/v1/payments/intents → Razorpay → Webhook
10. Project completed → PATCH /api/v1/projects/:id/status
```

---

## Deployment

- **Container orchestration**: Kubernetes (EKS)
- **Infrastructure as Code**: Terraform (AWS)
- **CI/CD**: GitHub Actions (lint → test → build → deploy)
- **Environments**: Development → Staging → Production
- **Monitoring**: Prometheus + Grafana + Jaeger + Alertmanager
