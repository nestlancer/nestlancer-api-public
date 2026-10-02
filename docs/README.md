<div align="center">

# Nestlancer Backend API — Documentation

### Central documentation for the NestJS monorepo. Maintenance notes: [DOCUMENTATION.md](DOCUMENTATION.md). Use this index when onboarding or changing a service, worker, library, or gateway.

</div>

---

## 📖 Table of Contents

- [🚀 Start here](#start-here)
- [🧩 Components (code you run)](#components-code-you-run)
- [Architecture & decisions](#architecture-decisions)
- [📘 Guides](#guides)
- [🛠 Operations](#operations)
- [Deploy & infra](#deploy-infra)
- [📋 Changelog](#changelog)
- [Maintaining docs](#maintaining-docs)
- [Archive (historical)](#archive-historical)

---

## 🚀 Start here

| Document                                                 | Description                                |
| :------------------------------------------------------- | :----------------------------------------- |
| [Onboarding](guides/onboarding.md)                       | Day 1 full-stack setup (backend focus)     |
| [Modification playbook](guides/modification-playbook.md) | How to add endpoints, services, migrations |
| [Getting started](guides/getting-started.md)             | Prerequisites, install, first run          |
| [Local development](guides/local-development.md)         | Dev workflow, Docker, env files            |
| [Architecture overview](architecture/overview.md)        | System diagram, ports, data flow           |
| [API standards](api/standards.md)                        | Envelope format, auth, versioning, errors  |
| [OpenAPI / contracts](api/README.md)                     | Merged spec, Postman, endpoint references  |

---

## 🧩 Components (code you run)

### 🌐 Gateways

| Component         | Doc                                                  |
| :---------------- | :--------------------------------------------------- |
| API Gateway       | [components/gateway.md](components/gateway.md)       |
| WebSocket Gateway | [components/ws-gateway.md](components/ws-gateway.md) |

### ⚙️ Microservices (16)

| Service       | Doc                                                   | API spec                                                       |
| :------------ | :---------------------------------------------------- | :------------------------------------------------------------- |
| Health        | [health](components/services/health.md)               | [api/services/health.md](api/services/health.md)               |
| Auth          | [auth](components/services/auth.md)                   | [api/services/auth.md](api/services/auth.md)                   |
| Users         | [users](components/services/users.md)                 | [api/services/users.md](api/services/users.md)                 |
| Requests      | [requests](components/services/requests.md)           | [api/services/requests.md](api/services/requests.md)           |
| Quotes        | [quotes](components/services/quotes.md)               | [api/services/quotes.md](api/services/quotes.md)               |
| Projects      | [projects](components/services/projects.md)           | [api/services/projects.md](api/services/projects.md)           |
| Progress      | [progress](components/services/progress.md)           | [api/services/progress.md](api/services/progress.md)           |
| Payments      | [payments](components/services/payments.md)           | [api/services/payments.md](api/services/payments.md)           |
| Messaging     | [messaging](components/services/messaging.md)         | [api/services/messaging.md](api/services/messaging.md)         |
| Notifications | [notifications](components/services/notifications.md) | [api/services/notifications.md](api/services/notifications.md) |
| Media         | [media](components/services/media.md)                 | [api/services/media.md](api/services/media.md)                 |
| Portfolio     | [portfolio](components/services/portfolio.md)         | [api/services/portfolio.md](api/services/portfolio.md)         |
| Blog          | [blog](components/services/blog.md)                   | [api/services/blog.md](api/services/blog.md)                   |
| Contact       | [contact](components/services/contact.md)             | [api/services/contact.md](api/services/contact.md)             |
| Admin         | [admin](components/services/admin.md)                 | [api/services/admin.md](api/services/admin.md)                 |
| Webhooks      | [webhooks](components/services/webhooks.md)           | [api/services/webhooks.md](api/services/webhooks.md)           |

### ⚙️ Workers (8)

| Worker        | Doc                                                              |
| :------------ | :--------------------------------------------------------------- |
| Email         | [email-worker](components/workers/email-worker.md)               |
| Notification  | [notification-worker](components/workers/notification-worker.md) |
| Audit         | [audit-worker](components/workers/audit-worker.md)               |
| Media         | [media-worker](components/workers/media-worker.md)               |
| Analytics     | [analytics-worker](components/workers/analytics-worker.md)       |
| Webhook       | [webhook-worker](components/workers/webhook-worker.md)           |
| CDN           | [cdn-worker](components/workers/cdn-worker.md)                   |
| Outbox poller | [outbox-poller](components/workers/outbox-poller.md)             |

### 📚 Shared libraries (24)

See [components/libs/](components/libs/) — one doc per package (`common`, `database`, `queue`, `auth-lib`, …).

---

## Architecture & decisions

| Topic           | Doc                                                                      |
| :-------------- | :----------------------------------------------------------------------- |
| Data flow       | [architecture/data-flow.md](architecture/data-flow.md)                   |
| Database schema | [architecture/database-schema.md](architecture/database-schema.md)       |
| Events          | [architecture/event-catalog.md](architecture/event-catalog.md)           |
| Queues          | [architecture/queue-topology.md](architecture/queue-topology.md)         |
| WebSockets      | [architecture/websocket-protocol.md](architecture/websocket-protocol.md) |
| ADRs            | [adr/](adr/)                                                             |
| Prisma / DB     | [database/README.md](database/README.md)                                 |

---

## 📘 Guides

| Guide                 | Doc                                                                |
| :-------------------- | :----------------------------------------------------------------- |
| Environment variables | [guides/environment-variables.md](guides/environment-variables.md) |
| Infisical secrets     | [guides/infisical.md](guides/infisical.md)                         |
| Coding standards      | [guides/coding-standards.md](guides/coding-standards.md)           |
| Testing strategy      | [guides/testing-strategy.md](guides/testing-strategy.md)           |
| Test commands         | [guides/test-commands.md](guides/test-commands.md)                 |
| Troubleshooting       | [guides/troubleshooting.md](guides/troubleshooting.md)             |
| Add a service         | [guides/adding-new-service.md](guides/adding-new-service.md)       |
| Add a worker          | [guides/adding-new-worker.md](guides/adding-new-worker.md)         |
| Production VPS deploy | [guides/production-vps-deploy.md](guides/production-vps-deploy.md) |
| Production Compose deploy (GHCR + Infisical + image builds) | [guides/prod-deployment.md](guides/prod-deployment.md) |
| Nginx + Docker dev    | [guides/nginx.md](guides/nginx.md)                                 |
| S3 storage setup      | [guides/s3-storage-setup.md](guides/s3-storage-setup.md)           |

---

## 🛠 Operations

| Runbook              | Doc                                                                  |
| :------------------- | :------------------------------------------------------------------- |
| Deployment checklist | [runbooks/deployment-checklist.md](runbooks/deployment-checklist.md) |
| Incident response    | [runbooks/incident-response.md](runbooks/incident-response.md)       |
| Scaling              | [runbooks/scaling-guide.md](runbooks/scaling-guide.md)               |
| DB failover          | [runbooks/database-failover.md](runbooks/database-failover.md)       |
| Queue recovery       | [runbooks/queue-recovery.md](runbooks/queue-recovery.md)             |
| DLQ processing       | [runbooks/dlq-processing.md](runbooks/dlq-processing.md)             |

---

## Deploy & infra

- [deploy/README.md](../deploy/README.md) — Kubernetes, Terraform
- [deploy/terraform/README.md](../deploy/terraform/README.md)

---

## 📋 Changelog

- [**CHANGELOG.md**](changelog/CHANGELOG.md) — full history from git (regenerate: `node scripts/generate-changelog.mjs`)
- [MIGRATION_GUIDE.md](changelog/MIGRATION_GUIDE.md)

---

## Maintaining docs

| Task                                | Command                                    |
| :---------------------------------- | :----------------------------------------- |
| Regenerate service/worker/lib pages | `node scripts/generate-component-docs.mjs` |
| Regenerate changelog from commits   | `node scripts/generate-changelog.mjs`      |

---

## Archive (historical)

Implementation trackers, AI prompts, and one-off test reports: [archive/](archive/).
