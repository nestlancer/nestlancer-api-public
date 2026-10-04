<div align="center">

# Nestlancer Backend API — Documentation

### Central documentation for the NestJS monorepo. Use this index when onboarding, or when changing a service, worker, library, or gateway.

</div>

---

## 📖 Table of Contents

- [🚀 Start here](#start-here)
- [🧩 Components (code you run)](#components-code-you-run)
- [Architecture & decisions](#architecture-decisions)
- [API](#api)
- [📘 Development](#development)
- [🛠 Operations](#operations)
- [Seeding](#seeding)
- [Deploy & infra](#deploy-infra)
- [📋 Changelog](#changelog)
- [Reference](#reference)
- [Maintaining these docs](#maintaining-these-docs)
- [About this public mirror](#about-this-public-mirror)

---

## 🚀 Start here

| Document | Description |
| :-- | :-- |
| [Setup](development/setup.md) | Day-1 full-stack setup (backend focus) |
| [Quickstart](development/quickstart.md) | Prerequisites, install, first run — condensed |
| [`STEP_BY_STEP_GUIDE.md`](../STEP_BY_STEP_GUIDE.md) | Beginner-first walkthrough covering local setup **through** GHCR image release, VPS deploy, and rollback — broader scope than `development/setup.md`, kept as its own root file rather than merged |
| [Modification playbook](development/modification-playbook.md) | How to add endpoints, services, migrations |
| [Local workflow](development/local-workflow.md) | Day-to-day dev loop, Docker, env files |
| [Architecture overview](architecture/overview.md) | System diagram, ports, data flow |
| [API standards](api/standards.md) | Envelope format, auth, versioning, errors |
| [OpenAPI / contracts](api/README.md) | Merged spec, endpoint references |
| [Repository structure](reference/repository-structure.md) | Full directory layout and verified counts |

---

## 🧩 Components (code you run)

### 🌐 Gateways

| Component | Doc |
| :-- | :-- |
| API Gateway | [components/gateway.md](components/gateway.md) |
| WebSocket Gateway | [components/ws-gateway.md](components/ws-gateway.md) |

### ⚙️ Microservices (16)

| Service | Doc | API spec |
| :-- | :-- | :-- |
| Health | [health](components/services/health.md) | [api/services/health.md](api/services/health.md) |
| Auth | [auth](components/services/auth.md) | [api/services/auth.md](api/services/auth.md) |
| Users | [users](components/services/users.md) | [api/services/users.md](api/services/users.md) |
| Requests | [requests](components/services/requests.md) | [api/services/requests.md](api/services/requests.md) |
| Quotes | [quotes](components/services/quotes.md) | [api/services/quotes.md](api/services/quotes.md) |
| Projects | [projects](components/services/projects.md) | [api/services/projects.md](api/services/projects.md) |
| Progress | [progress](components/services/progress.md) | [api/services/progress.md](api/services/progress.md) |
| Payments | [payments](components/services/payments.md) | [api/services/payments.md](api/services/payments.md) |
| Messaging | [messaging](components/services/messaging.md) | [api/services/messaging.md](api/services/messaging.md) |
| Notifications | [notifications](components/services/notifications.md) | [api/services/notifications.md](api/services/notifications.md) |
| Media | [media](components/services/media.md) | [api/services/media.md](api/services/media.md) |
| Portfolio | [portfolio](components/services/portfolio.md) | [api/services/portfolio.md](api/services/portfolio.md) |
| Blog | [blog](components/services/blog.md) | [api/services/blog.md](api/services/blog.md) |
| Contact | [contact](components/services/contact.md) | [api/services/contact.md](api/services/contact.md) |
| Admin | [admin](components/services/admin.md) | [api/services/admin.md](api/services/admin.md) |
| Webhooks | [webhooks](components/services/webhooks.md) | [api/services/webhooks.md](api/services/webhooks.md) |

### ⚙️ Workers (10)

| Worker | Doc |
| :-- | :-- |
| Email | [email-worker](components/workers/email-worker.md) |
| Notification | [notification-worker](components/workers/notification-worker.md) |
| Audit | [audit-worker](components/workers/audit-worker.md) |
| Media | [media-worker](components/workers/media-worker.md) |
| Analytics | [analytics-worker](components/workers/analytics-worker.md) |
| Webhook | [webhook-worker](components/workers/webhook-worker.md) |
| CDN | [cdn-worker](components/workers/cdn-worker.md) |
| Document | [document-worker](components/workers/document-worker.md) |
| Export | [export-worker](components/workers/export-worker.md) |
| Outbox poller | [outbox-poller](components/workers/outbox-poller.md) |

### 📚 Shared libraries (28)

See [components/libs/](components/libs/) — one doc per package (`common`, `database`, `queue`,
`auth-lib`, …). Note: `libs/tests` is a non-standard anomaly (no `package.json`, not a working
package) — see [components/libs/tests.md](components/libs/tests.md) and
[`CONTRIBUTING.md`](../CONTRIBUTING.md#known-non-standard-areas).

---

## Architecture & decisions

| Topic | Doc |
| :-- | :-- |
| Overview (ports, topology) | [architecture/overview.md](architecture/overview.md) |
| Data flow | [architecture/data-flow.md](architecture/data-flow.md) |
| Database schema | [architecture/database-schema.md](architecture/database-schema.md) |
| Events | [architecture/event-catalog.md](architecture/event-catalog.md) |
| Queues | [architecture/queue-topology.md](architecture/queue-topology.md) |
| WebSockets | [architecture/websocket-protocol.md](architecture/websocket-protocol.md) |
| Architecture decision records | [decisions/](decisions/README.md) — *why*, historically (formerly `docs/adr/`) |
| Database operations (migrations, read/write split) | [operations/database.md](operations/database.md) |

---

## API

| Topic | Doc |
| :-- | :-- |
| Index | [api/README.md](api/README.md) |
| API standards (envelope, auth, versioning, errors) | [api/standards.md](api/standards.md) |
| Error codes | [api/error-codes.md](api/error-codes.md) |
| SDK reference | [api/sdk-reference.md](api/sdk-reference.md) |
| Endpoints reference | [api/endpoints-reference.md](api/endpoints-reference.md) |
| Changelog endpoints | [api/changelog-endpoints.md](api/changelog-endpoints.md) |
| Per-service specs | [api/services/](api/services/) |
| Merged OpenAPI spec | [api/openapi-merged.json](api/openapi-merged.json) (regenerate: `pnpm openapi:export`) |

---

## 📘 Development

See [development/README.md](development/README.md) for the full index: setup, quickstart, local
workflow, testing, coding standards, adding a service/worker, modification playbook,
troubleshooting.

---

## 🛠 Operations

See [operations/README.md](operations/README.md) for the full index: dev/production/VPS/K3s
deployment, Nginx, TLS, S3, Zoho Mail, Infisical secrets, database operations, and
[operations/runbooks/](operations/runbooks/README.md) (incident response, failover, queue recovery,
DLQ processing, scaling).

---

## Seeding

[seeding/](seeding/README.md) — demo/seed data flow, admin-client flow walkthroughs. Seeding itself
is implemented in Python/shell under [`seed/`](../seed/) at the repo root (`seed/seed.sh`), not
under `scripts/`.

---

## Deploy & infra

- [deploy/README.md](../deploy/README.md) — Kubernetes (K3s), Terraform
- [deploy/terraform/README.md](../deploy/terraform/README.md)
- [docker/README.md](../docker/README.md) — image bases, gateway/proxy images, production monorepo build, generated Compose assets

---

## 📋 Changelog

See [changelog/README.md](changelog/README.md) — [CHANGELOG.md](changelog/CHANGELOG.md) (generated:
`pnpm docs:changelog`) and [MIGRATION_GUIDE.md](changelog/MIGRATION_GUIDE.md).

---

## Reference

See [reference/README.md](reference/README.md) for the full index: repository structure, the full
`pnpm`/`make` command surface, the scripts catalog, every environment variable, and the (stale,
clearly flagged) feature inventory.

---

## Maintaining these docs

| Task | Command |
| :-- | :-- |
| Regenerate service/worker/lib pages | `pnpm docs:components` (`scripts/docs/generate-component-docs.mjs`) |
| Regenerate changelog from commits | `pnpm docs:changelog` (`scripts/docs/generate-changelog.mjs`) |
| Refresh the merged OpenAPI spec | `pnpm openapi:export` |
| Lint the OpenAPI spec | `pnpm openapi:lint` (aliases: `swagger:validate`, `contract:check`) |

**Cross-repo links:** some backend docs link to the frontend repo (`nestlancer-frontend`) with
relative paths like `../../../nestlancer-frontend/docs/...`. This assumes both repos are cloned as
siblings under the same parent directory:

```text
workspace/
├── nestlancer-api-public/   (or your private checkout)
└── nestlancer-frontend/
```

If your layout differs, adjust the link or find the equivalent page in your org's frontend docs.

**Known, intentionally-not-fixed gaps** (don't silently "fix" these — see
[`CONTRIBUTING.md`](../CONTRIBUTING.md#known-non-standard-areas) for why):

- `libs/tests` has no `package.json` and isn't a working package.
- `docker-compose.e2e.yml` is referenced by several scripts and test error messages but doesn't
  exist in this repo.
- `docs/api/sdk-reference.md` contains an unfilled template support-email placeholder.
- `.gitattributes` references `docs/api/postman-collection.json`, which doesn't exist.

## About this public mirror

This repository (`nestlancer-api-public`) is a sanitized public export of the private
`nestlancer-backend-api` repository — content-identical in structure (same directories and files),
published with secrets and certain internal details removed. Two root files document that process
and are **out of scope for these docs** — left untouched, not folded into `docs/`:

- [`SANITIZATION_MANIFEST.md`](../SANITIZATION_MANIFEST.md) — what was removed/redacted and why.
- [`OVERALL_REPORT_REMOVED.md`](../OVERALL_REPORT_REMOVED.md) — additional removal detail.

Everything under `docs/` describes the mirrored codebase itself (architecture, components, APIs,
how to run and operate it) and deliberately does not hardcode either repository's name.
