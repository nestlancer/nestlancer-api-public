## 📖 Table of Contents

- [0. Product Model (Read First)](#0-product-model-read-first)
- [How to Read This Document](#how-to-read-this-document)
- [1. Executive Summary](#1-executive-summary)
- [2. Progress Dashboard](#2-progress-dashboard)
- [3. Backend — Project Setup & Configuration](#3-backend-project-setup-configuration)
- [4. Backend — CI/CD & DevOps](#4-backend-cicd-devops)
- [5. Backend — Documentation](#5-backend-documentation)
- [6. Backend — Scripts & Docker](#6-backend-scripts-docker)
- [7. Backend — Deployment (K8s/Terraform)](#7-backend-deployment-k8sterraform)
- [8. Backend — Database (Prisma)](#8-backend-database-prisma)
- [9. Backend — Shared Libraries (24)](#9-backend-shared-libraries-24)
- [10. Backend — Gateway & WS Gateway](#10-backend-gateway-ws-gateway)
- [11. Backend — Microservices (16)](#11-backend-microservices-16)
- [12. Backend — Workers (8)](#12-backend-workers-8)
- [13. Backend — API & OpenAPI](#13-backend-api-openapi)
- [14. Backend — Testing](#14-backend-testing)
- [15. Frontend — Monorepo & Tooling](#15-frontend-monorepo-tooling)
- [16. Frontend — Shared Packages (14)](#16-frontend-shared-packages-14)
- [17. Frontend — Web App (port 9000)](#17-frontend-web-app-port-9000)
- [18. Frontend — Admin App (port 9010)](#18-frontend-admin-app-port-9010)
- [19. Frontend — Landing App (port 9020)](#19-frontend-landing-app-port-9020)
- [20. Cross-Repo Integration Matrix](#20-cross-repo-integration-matrix)
- [21. Priority Roadmap & Sprint Backlog](#21-priority-roadmap-sprint-backlog)
- [22. Appendix](#22-appendix)
- [23. Product Model Alignment — Copy & UX Audit](#23-product-model-alignment-copy-ux-audit)

---

## 0. Product Model (Read First)

**Nestlancer is NOT a multi-freelancer marketplace.** It is a **single-freelancer studio platform**:

| Actor                         | Role                   | App                 | Purpose                                                                                     |
| :---------------------------- | :--------------------- | :------------------ | :------------------------------------------------------------------------------------------ |
| **The freelancer / operator** | `ADMIN` (one account)  | `apps/admin` (9010) | Runs the business: review requests, send quotes, manage projects, milestones, payments, CMS |
| **Clients**                   | `USER` (many accounts) | `apps/web` (9000)   | Register, submit requests, accept quotes, pay, collaborate on projects                      |
| **Public visitors**           | unauthenticated        | web + landing       | View portfolio/blog, contact, then register as **client only**                              |

**Backend evidence:** `UserRole` enum is only `USER` | `ADMIN` — `libs/common/src/enums/user-role.enum.ts`. No `FREELANCER` role exists in the API.

**Correct client journey:** Discover studio → register as client → post request → receive quote from admin → accept → project → pay → collaborate.

**Wrong product assumptions still in the repo (must fix):** Marketplace copy ("elite freelancers", directory, talent cards), `/freelancers` routes, register subtitle "client or freelancer", fake marketplace stats (1% acceptance, 30k clients), legacy `freelancer` in frontend types/wireframes.

---

## How to Read This Document

| Symbol | Meaning                                                                    |
| :----- | :------------------------------------------------------------------------- |
| ✅     | **Implemented** — verified in code, tests, or running config               |
| ⚠️     | **Partial** — exists but incomplete, untested, stale docs, or UI/API drift |
| ❌     | **Missing** — specified or required but not present in codebase            |
| 🔮     | **Future** — planned enhancement, not required for current MVP             |

Every row includes **Evidence** (file path). Items marked NEEDS VERIFICATION require a manual run (e.g. coverage report, live gateway test).

---

## 📖 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Progress Dashboard](#2-progress-dashboard)
3. [Backend — Project Setup & Config](#3-backend--project-setup--configuration)
4. [Backend — CI/CD & DevOps](#4-backend--cicd--devops)
5. [Backend — Documentation](#5-backend--documentation)
6. [Backend — Scripts & Docker](#6-backend--scripts--docker)
7. [Backend — Deployment (K8s/Terraform)](#7-backend--deployment-k8sterraform)
8. [Backend — Database (Prisma)](#8-backend--database-prisma)
9. [Backend — Shared Libraries (24)](#9-backend--shared-libraries-24)
10. [Backend — Gateway & WS Gateway](#10-backend--gateway--ws-gateway)
11. [Backend — Microservices (16)](#11-backend--microservices-16)
12. [Backend — Workers (8)](#12-backend--workers-8)
13. [Backend — API & OpenAPI](#13-backend--api--openapi)
14. [Backend — Testing](#14-backend--testing)
15. [Frontend — Monorepo & Tooling](#15-frontend--monorepo--tooling)
16. [Frontend — Shared Packages (14)](#16-frontend--shared-packages-14)
17. [Frontend — Web App (port 9000)](#17-frontend--web-app-port-9000)
18. [Frontend — Admin App (port 9010)](#18-frontend--admin-app-port-9010)
19. [Frontend — Landing App (port 9020)](#19-frontend--landing-app-port-9020)
20. [Cross-Repo Integration Matrix](#20-cross-repo-integration-matrix)
21. [Priority Roadmap & Sprint Backlog](#21-priority-roadmap--sprint-backlog)
22. [Appendix](#22-appendix)
23. [Product Model Alignment — Copy & UX Audit](#23-product-model-alignment--copy--ux-audit)

---

## 1. Executive Summary

**Product model:** One freelancer (ADMIN) serves many clients (USER). Client registers on web → submits request → admin reviews in operator console → quote → client accepts → project → milestones/deliverables → Razorpay payments → realtime messaging/notifications.

| Dimension                     | Estimate                                | Evidence                                                                  |
| :---------------------------- | :-------------------------------------- | :------------------------------------------------------------------------ |
| **Backend runtime code**      | ~**88%**                                | 16/16 services with controllers + tests; 438 OpenAPI paths                |
| **Backend infra/deploy docs** | ~**45%**                                | `deploy/` absent; K8s/Terraform/monitoring manifests not in repo          |
| **Frontend UI**               | ~**90%** UI built / **⚠️ product copy** | 81 App Router pages; `/freelancers*` removed; studio copy applied (§23)   |
| **Frontend quality gates**    | ~**55%**                                | 9 Playwright specs; 0 Vitest unit files; `.github/workflows/ci.yml` added |
| **Cross-repo E2E**            | ~**60%**                                | Backend system e2e ✅; frontend payment flow e2e ❌                       |

### Critical Blockers (P0)

1. ⚠️ `deploy/` **K3s + Terraform** scaffold added — expand manifests for all services/workers (see `deploy/README.md`, `docs/SPRINT-PLAN.md`)
2. ✅ Frontend GitHub Actions CI — `.github/workflows/ci.yml` (lint, type-check, build, contract, unit + mocked E2E)
3. ✅ Backend CI `pnpm swagger:validate` — alias added in `package.json`
4. ✅ Frontend payment checkout Playwright E2E — `apps/web/tests/e2e/payment-checkout.mocked.spec.ts` (+ CI job)
5. ✅ CD runs `migrate-deploy-ci.sh` before compose up; smoke health + rollback on failure
6. ✅ User GDPR export — `POST /admin/users/:id/export` queues `USER_DATA_EXPORT_REQUESTED` outbox job
7. ✅ **Product copy realigned** — web + landing studio messaging; `/freelancers` routes removed (§23)

---

## 2. Progress Dashboard

### 2.1 Backend Package Matrix

| Package           | Port | Controllers | Unit/Spec Tests | E2E | README                           | Status |
| :---------------- | :--- | :---------- | :-------------- | :-- | :------------------------------- | :----- |
| **auth**          | 3001 | 1           | 13              | ✅  | ✅                               | ✅     |
| **users**         | 3002 | 3           | 11              | ✅  | ✅                               | ✅     |
| **payments**      | 3003 | 7           | 20              | ✅  | ✅                               | ✅     |
| **webhooks**      | 3004 | 2           | 10              | ✅  | ⚠️ missing README                | ✅     |
| **admin**         | 3005 | 7           | 29              | ✅  | ✅                               | ✅     |
| **requests**      | 3006 | 2           | 9               | ✅  | ✅                               | ✅     |
| **quotes**        | 3007 | 2           | 9               | ✅  | ✅                               | ✅     |
| **projects**      | 3008 | 3           | 12              | ✅  | ✅                               | ✅     |
| **progress**      | 3009 | 6           | 15              | ✅  | ⚠️ stale copy of projects README | ✅     |
| **messaging**     | 3010 | 5           | 14              | ✅  | ⚠️ stale copy of projects README | ✅     |
| **notifications** | 3011 | 0           | 17              | ✅  | ⚠️ stale copy of projects README | ⚠️     |
| **media**         | 3012 | 0           | 11              | ✅  | ⚠️ stale copy of projects README | ⚠️     |
| **portfolio**     | 3013 | 3           | 15              | ✅  | ⚠️ missing README                | ✅     |
| **blog**          | 3014 | 9           | 23              | ✅  | ⚠️ missing README                | ✅     |
| **contact**       | 3015 | 2           | 9               | ✅  | ⚠️ missing README                | ✅     |
| **health**        | 3016 | 2           | 16              | ✅  | ✅                               | ✅     |
| **gateway**       | 3000 | 18 modules  | 9               | ✅  | ✅                               | ✅     |
| **ws-gateway**    | 3100 | WS handlers | 7               | ✅  | ✅                               | ✅     |

### 2.2 Frontend App Matrix

| App         | Port | Pages | Feature Files | Playwright | CI  | Status |
| :---------- | :--- | :---- | :------------ | :--------- | :-- | :----- |
| **web**     | 9000 | 45    | 130           | 3 specs    | ✅  | ⚠️     |
| **admin**   | 9010 | 30    | 48            | 6 specs    | ✅  | ⚠️     |
| **landing** | 9020 | 6     | minimal       | 0          | ✅  | ⚠️     |

### 2.3 Counts

| Metric                   | Backend | Frontend              |
| :----------------------- | :------ | :-------------------- |
| `*.spec.ts` / test files | 561     | 9 (Playwright only)   |
| Markdown docs            | 91      | 85                    |
| Wireframes               | —       | 71                    |
| OpenAPI paths            | 438     | 438 (synced contract) |
| Prisma models            | 50      | —                     |
| Shared packages          | 24 libs | 14 packages           |

---

## 3. Backend — Project Setup & Configuration

### 3.1 Root Configuration Files

| #   | File                         | Status | Evidence                     | Notes                            |
| :-- | :--------------------------- | :----- | :--------------------------- | :------------------------------- |
| 1   | `package.json`               | ✅     | `package.json`               |                                  |
| 2   | `pnpm-workspace.yaml`        | ✅     | `pnpm-workspace.yaml`        |                                  |
| 3   | `turbo.json`                 | ✅     | `turbo.json`                 |                                  |
| 4   | `tsconfig.base.json`         | ✅     | `tsconfig.base.json`         |                                  |
| 5   | `.gitignore`                 | ✅     | `.gitignore`                 |                                  |
| 6   | `.gitattributes`             | ✅     | `.gitattributes`             |                                  |
| 7   | `.nvmrc`                     | ✅     | `.nvmrc`                     |                                  |
| 8   | `.editorconfig`              | ✅     | `.editorconfig`              |                                  |
| 9   | `.eslintrc.js`               | ✅     | `.eslintrc.js`               |                                  |
| 10  | `.prettierrc`                | ✅     | `.prettierrc`                |                                  |
| 11  | `.prettierignore`            | ✅     | `.prettierignore`            |                                  |
| 12  | `.lintstagedrc`              | ✅     | `.lintstagedrc`              |                                  |
| 13  | `.husky/pre-commit`          | ✅     | `.husky/pre-commit`          |                                  |
| 14  | `.husky/commit-msg`          | ✅     | `.husky/commit-msg`          |                                  |
| 15  | `commitlint.config.js`       | ✅     | `commitlint.config.js`       |                                  |
| 16  | `jest.config.ts`             | ✅     | `jest.config.ts`             | NEEDS VERIFICATION per-package % |
| 17  | `jest.integration.config.ts` | ✅     | `jest.integration.config.ts` |                                  |
| 18  | `prisma.config.ts`           | ✅     | `prisma.config.ts`           |                                  |
| 19  | `.infisical.json`            | ✅     | `.infisical.json`            |                                  |
| 20  | `.spectral.yaml`             | ✅     | `.spectral.yaml`             |                                  |
| 21  | `docker-compose.yml`         | ❌     | `docker-compose.yml`         | Only dev + e2e compose exist     |
| 22  | `docker-compose.dev.yml`     | ✅     | `docker-compose.dev.yml`     |                                  |
| 23  | `docker-compose.e2e.yml`     | ✅     | `docker-compose.e2e.yml`     |                                  |
| 24  | `docker-compose.test.yml`    | ❌     | `docker-compose.test.yml`    | Referenced in docs/scripts       |
| 25  | `docker-compose.prod.yml`    | ❌     | `docker-compose.prod.yml`    | Referenced in docs               |
| 26  | `Makefile`                   | ✅     | `Makefile`                   |                                  |
| 27  | `LICENSE`                    | ✅     | `LICENSE`                    |                                  |
| 28  | `README.md`                  | ✅     | `README.md`                  | Prisma 7.x documented            |

**Sub-todos — Project Setup:**

- [ ] Add `docker-compose.yml` base infra OR remove references from docs/Makefile
- [ ] Add `docker-compose.test.yml` and `docker-compose.prod.yml` OR mark 🔮 in docs
- [x] Update README Prisma version to 7.x
- [x] Add `swagger:validate` npm script alias → `openapi:lint`
- [ ] Run `pnpm test:cov` and record per-package coverage in §22

---

## 4. Backend — CI/CD & DevOps

### 4.1 GitHub Workflows

| Workflow                | Doc Status      | Actual Path                      | Status | Evidence                             |
| :---------------------- | :-------------- | :------------------------------- | :----- | :----------------------------------- |
| `ci.yml`                | 401 tracker [x] | `.github/workflows/ci.yml`       | ✅     | OpenAPI step uses `swagger:validate` |
| `cd.yml`                | 401 tracker [x] | `approx.github/workflows/cd.yml` | ✅     | SSH VPS deploy after CI on main      |
| `cd-staging.yml`        | 401 tracker [x] | `—`                              | ❌     | Not in repo                          |
| `cd-production.yml`     | 401 tracker [x] | `—`                              | ❌     | Not in repo                          |
| `codeql-analysis.yml`   | 401 tracker [x] | `—`                              | ❌     | Not in repo                          |
| `dependency-review.yml` | 401 tracker [x] | `—`                              | ❌     | Not in repo                          |
| `release.yml`           | 401 tracker [x] | `—`                              | ❌     | Not in repo                          |

### 4.2 GitHub Templates & Community

| Item                                        | Status | Evidence                                |
| :------------------------------------------ | :----- | :-------------------------------------- |
| `.github/ISSUE_TEMPLATE/bug_report.md`      | ❌     | Not found — aspirational in 401 tracker |
| `.github/ISSUE_TEMPLATE/feature_request.md` | ❌     | Not found — aspirational in 401 tracker |
| `.github/PULL_REQUEST_TEMPLATE.md`          | ❌     | Not found — aspirational in 401 tracker |
| `.github/CODEOWNERS`                        | ❌     | Not found — aspirational in 401 tracker |
| `.github/dependabot.yml`                    | ❌     | Not found — aspirational in 401 tracker |

### 4.3 Secrets & Environments

| Item                                | Status | Evidence                                        |
| :---------------------------------- | :----- | :---------------------------------------------- |
| Infisical Cloud (`.infisical.json`) | ✅     | `.infisical.json`, `.env.infisical`             |
| Env: dev / e2e / production         | ✅     | `.env.infisical`, `.env.e2e`, `.env.production` |
| Manual migrations on VPS CD         | ⚠️     | `cd.yml` + `prisma/README.md` runbook           |
| Nginx reverse proxy docs            | ✅     | `Nginx.md`                                      |

**Sub-todos — CI/CD:**

- [ ] Move workflows from `approx.github/workflows/` → `.github/workflows/` OR document why alternate path
- [x] Fix CI OpenAPI validation script name
- [ ] Implement staging CD workflow with migrate deploy + smoke tests
- [ ] Implement production CD with manual approval gate
- [ ] Add CodeQL + dependency-review workflows
- [ ] Automate `prisma migrate deploy` in CD with rollback on health failure
- [ ] Add GitHub issue/PR templates and CODEOWNERS

---

## 5. Backend — Documentation

### 5.1 Architecture & ADRs

| Document                    | Status | Path                                      |
| :-------------------------- | :----- | :---------------------------------------- |
| overview.md                 | ✅     | `docs/architecture/overview.md`           |
| data-flow.md                | ✅     | `docs/architecture/data-flow.md`          |
| database-schema.md          | ✅     | `docs/architecture/database-schema.md`    |
| event-catalog.md            | ✅     | `docs/architecture/event-catalog.md`      |
| queue-topology.md           | ✅     | `docs/architecture/queue-topology.md`     |
| websocket-protocol.md       | ✅     | `docs/architecture/websocket-protocol.md` |
| 001-monorepo-structure.md   | ✅     | `docs/adr/001-monorepo-structure.md`      |
| 002-database-choice.md      | ✅     | `docs/adr/002-database-choice.md`         |
| 003-auth-strategy.md        | ✅     | `docs/adr/003-auth-strategy.md`           |
| 004-outbox-pattern.md       | ✅     | `docs/adr/004-outbox-pattern.md`          |
| 005-read-write-split.md     | ✅     | `docs/adr/005-read-write-split.md`        |
| 006-queue-topology.md       | ✅     | `docs/adr/006-queue-topology.md`          |
| 007-idempotency-strategy.md | ✅     | `docs/adr/007-idempotency-strategy.md`    |
| 008-caching-strategy.md     | ✅     | `docs/adr/008-caching-strategy.md`        |
| 001-milestone-lifecycle.md  | ✅     | `docs/adr/001-milestone-lifecycle.md`     |

### 5.2 Runbooks

- ✅ `docs/runbooks/incident-response.md`
- ✅ `docs/runbooks/database-failover.md`
- ✅ `docs/runbooks/queue-recovery.md`
- ✅ `docs/runbooks/dlq-processing.md`
- ✅ `docs/runbooks/scaling-guide.md`
- ✅ `docs/runbooks/deployment-checklist.md`

### 5.3 Developer Guides

- ✅ `docs/guides/getting-started.md`
- ✅ `docs/guides/local-development.md`
- ✅ `docs/guides/testing-strategy.md`
- ✅ `docs/guides/coding-standards.md`
- ✅ `docs/guides/adding-new-service.md`
- ✅ `docs/guides/adding-new-worker.md`
- ✅ `docs/guides/environment-variables.md`
- ✅ `docs/guides/infisical.md`
- ✅ `docs/guides/s3-storage-setup.md`

### 5.4 API Documentation

| File                                               | Status | Notes                       |
| :------------------------------------------------- | :----- | :-------------------------- |
| `docs/api/openapi-merged.json`                     | ✅     | 438 paths — source of truth |
| `docs/api/endpoints-reference.md`                  | ✅     | Human-readable reference    |
| `docs/api/postman-collection.json`                 | ✅     | Postman collection          |
| `docs/api/README.md`                               | ✅     | OpenAPI workflow            |
| `reference-docs/100-api-standards-endpoints.md`    | ✅     | API standards               |
| `reference-docs/101-health-endpoints.md`           | ✅     | Health endpoints spec       |
| `reference-docs/102-auth-endpoints.md`             | ✅     | Endpoint reference spec     |
| `reference-docs/103-users-endpoints.md`            | ✅     | Endpoint reference spec     |
| `reference-docs/104-requests-endpoints.md`         | ✅     | Endpoint reference spec     |
| `reference-docs/105-quotes-endpoints.md`           | ✅     | Endpoint reference spec     |
| `reference-docs/106-projects-endpoints.md`         | ✅     | Endpoint reference spec     |
| `reference-docs/107-progress-endpoints.md`         | ✅     | Endpoint reference spec     |
| `reference-docs/108-payments-endpoints.md`         | ✅     | Endpoint reference spec     |
| `reference-docs/109-messaging-endpoints.md`        | ✅     | Endpoint reference spec     |
| `reference-docs/110-notifications-endpoints.md`    | ✅     | Endpoint reference spec     |
| `reference-docs/111-media-endpoints.md`            | ✅     | Endpoint reference spec     |
| `reference-docs/112-portfolio-endpoints.md`        | ✅     | Endpoint reference spec     |
| `reference-docs/113-blog-endpoints.md`             | ✅     | Endpoint reference spec     |
| `reference-docs/114-contact-endpoints.md`          | ✅     | Endpoint reference spec     |
| `reference-docs/115-admin-endpoints.md`            | ✅     | Endpoint reference spec     |
| `reference-docs/116-webhooks-endpoints.md`         | ✅     | Endpoint reference spec     |
| `reference-docs/117-error-codes-endpoints.md`      | ✅     | Endpoint reference spec     |
| `reference-docs/118-changelog-endpoints.md`        | ✅     | Endpoint reference spec     |
| `reference-docs/119-sdk-reference-endpoints.md`    | ✅     | Endpoint reference spec     |
| `reference-docs/120-webhooks-inbound-endpoints.md` | ✅     | Endpoint reference spec     |

### 5.5 Documentation Drift Register

| Doc Says                                       | Reality                          | Action                   |
| :--------------------------------------------- | :------------------------------- | :----------------------- |
| Prisma 5.x in README                           | Prisma 7.4.1 in package.json     | Update README            |
| `.github/workflows/`                           | `approx.github/workflows/`       | Relocate or document     |
| `docker-compose.yml` exists                    | Missing — only dev/e2e           | Create or remove refs    |
| `deploy/kubernetes/` exists                    | Directory absent                 | Implement or mark future |
| 428+ endpoints                                 | 438 paths in openapi-merged.json | Update changelog         |
| Auth port 3011 in overview.md                  | 3001 in docker-compose.dev.yml   | Fix port table           |
| progress/messaging/notifications/media READMEs | Stale copies of projects README  | Rewrite per service      |
| blog/contact/portfolio/webhooks READMEs        | Missing                          | Create READMEs           |

---

## 6. Backend — Scripts & Docker

### 6.1 Scripts Inventory

**`scripts/openapi/`** — ✅ (7 files): README.md, apply-api-standard-responses.mjs, apply-gateway-api-params.mjs, apply-gateway-standard-responses.mjs, export-merged-openapi.mjs, normalize-openapi-document.mjs, openapi-diff.mjs
**`scripts/db/`** — ✅ (2 files): apply-pending-migrations.js, migrate-deploy.sh
**`scripts/docker/`** — ✅ (1 files): compose-dev.sh
**`scripts/test/`** — ❌ (directory absent; listed in 401 tracker)
**`scripts/setup/`** — ❌ (directory absent; listed in 401 tracker)
**`scripts/deploy/`** — ❌ (directory absent; listed in 401 tracker)
**`scripts/dev/`** — ❌ (directory absent; listed in 401 tracker)

### 6.2 Docker Images

| Path                                  | Status | Notes                                           |
| :------------------------------------ | :----- | :---------------------------------------------- |
| `docker/dev.Dockerfile`               | ✅     | Shared dev image                                |
| `docker/gateway/Dockerfile`           | ✅     | Gateway prod image                              |
| `docker/ws-gateway/Dockerfile`        | ✅     | WS gateway prod image                           |
| `docker/service-base/Dockerfile.base` | ✅     | Service base image                              |
| `docker/worker-base/Dockerfile.base`  | ✅     | Worker base image                               |
| `docker/nginx/`                       | ⚠️     | NEEDS VERIFICATION — may be in Nginx.md only    |
| `docker/monitoring/`                  | ❌     | Prometheus/Grafana/Jaeger — aspirational in 401 |

**Sub-todos — Scripts/Docker:**

- [ ] Verify all scripts in 401 tracker §4 exist or mark cancelled
- [ ] Add `scripts/db/replay-dlq.sh` if referenced by runbooks
- [ ] Document monitoring stack as 🔮 or add `docker/monitoring/`

---

## 7. Backend — Deployment (K8s/Terraform)

**Overall status: ⚠️** — **K3s + Terraform** scaffold under `deploy/` (not EKS). Gateway base manifest + VPS module exist; full service/worker matrix still TODO.

See `deploy/README.md` and `docs/guides/production-vps-deploy.md`. Legacy 401 tracker K8s/EKS items are superseded by K3s paths.

### 7.1 Missing Components (from 401 tracker)

- ❌ `deploy/kubernetes/base/ (namespace, configmap, secrets, ingress, HPA, PDB, network-policy)`
- ❌ `deploy/kubernetes/services/* (18 deployments — gateway, ws-gateway, 16 services)`
- ❌ `deploy/kubernetes/workers/* (8 worker deployments + HPA)`
- ❌ `deploy/kubernetes/infrastructure/ (postgresql, redis-cache, redis-pubsub, rabbitmq, monitoring)`
- ❌ `deploy/kubernetes/overlays/ (development, staging, production)`
- ❌ `deploy/terraform/environments/ (staging, production)`
- ❌ `deploy/terraform/modules/ (vpc, rds, elasticache, s3, cloudfront, ses, eks, rabbitmq, secrets-manager)`
- ❌ `docker/monitoring/ (prometheus, grafana, jaeger, alertmanager)`

**Sub-todos — Deployment:**

- [ ] Decide: K8s+Terraform vs Docker Compose prod on VPS
- [ ] If K8s: scaffold `deploy/kubernetes/base` + one service overlay as template
- [ ] If VPS: document production compose + Nginx + Infisical prod env
- [ ] Update 401-era docs that claim deploy manifests exist

---

## 8. Backend — Database (Prisma)

### 8.1 Schema Files & Models

| Schema File           | Models | Status | Evidence                                                                     |
| :-------------------- | :----- | :----- | :--------------------------------------------------------------------------- |
| `admin.prisma`        | 5      | ✅     | SystemConfig, FeatureFlag, EmailTemplate, ImpersonationSession, ReportExport |
| `audit.prisma`        | 1      | ✅     | AuditLog                                                                     |
| `auth.prisma`         | 0      | ✅     | (comment-only — tokens in app layer)                                         |
| `blog.prisma`         | 7      | ✅     | BlogPost, BlogSeries, BlogCategory, BlogTag, BlogComment, PostLike…          |
| `chat-thread.prisma`  | 2      | ✅     | ChatThread, ChatThreadMember                                                 |
| `contact.prisma`      | 2      | ✅     | ContactMessage, ContactResponseLog                                           |
| `idempotency.prisma`  | 1      | ✅     | IdempotencyKey                                                               |
| `media.prisma`        | 2      | ✅     | Media, MediaShareLink                                                        |
| `message.prisma`      | 1      | ✅     | Message                                                                      |
| `notification.prisma` | 3      | ✅     | Notification, NotificationTemplate, UserPushSubscription                     |
| `outbox.prisma`       | 1      | ✅     | Outbox                                                                       |
| `payment.prisma`      | 4      | ✅     | Payment, Refund, SavedPaymentMethod, Dispute                                 |
| `portfolio.prisma`    | 3      | ✅     | PortfolioItem, PortfolioImage, PortfolioCategory                             |
| `progress.prisma`     | 3      | ✅     | Milestone, Deliverable, ProgressEntry                                        |
| `project.prisma`      | 1      | ✅     | Project                                                                      |
| `quote.prisma`        | 1      | ✅     | Quote                                                                        |
| `request.prisma`      | 4      | ✅     | ProjectRequest, RequestAttachment, RequestStatusHistory, AdminNote           |
| `schema.prisma`       | 0      | ⚠️     |                                                                              |
| `user.prisma`         | 6      | ✅     | User, AuthConfig, UserPreference, Session, VerificationToken, AuthSession    |
| `webhook.prisma`      | 3      | ✅     | Webhook, WebhookDelivery, WebhookLog                                         |

**Total models: 50** across multi-file schema (Prisma 7.4.1)

### 8.2 Migrations & Seeds

- ✅ Migrations: `6` migration folders in `prisma/migrations/`
- ✅ Seeds: `prisma/seeds/index.ts` — prod baseline + dev extras (`dev/11-test-projects`, `14-dev-admin-user-rich`, etc.). Superseded: seeding now runs from `seed/seed.sh`.
- ✅ Read/write split: `@nestlancer/database` — `PrismaWriteService` + `PrismaReadService` (ADR 005)
- ✅ README: `prisma/README.md` — migration runbook, VPS deploy, E2E troubleshooting

### 8.3 Prisma Sub-todos (401 tracker §7 gaps)

| 401 Spec Item                                       | Code Reality                                   | Status                              |
| :-------------------------------------------------- | :--------------------------------------------- | :---------------------------------- |
| Individual migration files 00001–00019 named in 401 | Actual migrations use Prisma auto-names        | ⚠️ Naming differs — functionally OK |
| QuoteLineItem, QuoteTemplate models in 401 spec     | Check if merged into Quote model               | NEEDS VERIFICATION                  |
| PaymentIntent as separate model                     | Payment model may embed intent fields          | NEEDS VERIFICATION                  |
| Conversation vs ChatThread                          | Both message.prisma + chat-thread.prisma exist | ✅ Implemented                      |
| ChunkedUploadSession model                          | Check media.prisma                             | NEEDS VERIFICATION                  |

**Sub-todos — Database:**

- [ ] Audit 401 schema spec vs actual models — document intentional simplifications
- [ ] Verify seed idempotency on re-run (prod deploy checklist)
- [ ] Add migration rollback documentation to CD pipeline

---

## 9. Backend — Shared Libraries (24)

| Library                       | index.ts | Tests | Key Exports                                               | Status |
| :---------------------------- | :------- | :---- | :-------------------------------------------------------- | :----- |
| `@nestlancer/alerts`          | ✅       | 6     | Alerting utilities                                        | ✅     |
| `@nestlancer/audit`           | ✅       | 5     | Audit log helpers                                         | ✅     |
| `@nestlancer/auth-lib`        | ✅       | 11    | JWT guards, RBAC, Passport, decorators                    | ✅     |
| `@nestlancer/cache`           | ✅       | 7     | Redis cache-aside, tag invalidation                       | ✅     |
| `@nestlancer/circuit-breaker` | ✅       | 3     | Resilience patterns                                       | ✅     |
| `@nestlancer/common`          | ✅       | 41    | constants, enums, DTOs, exceptions, interceptors, filters | ✅     |
| `@nestlancer/config`          | ✅       | 14    | Zod env schemas, NestlancerConfigModule                   | ✅     |
| `@nestlancer/crypto`          | ✅       | 5     | Hashing, encryption, HMAC, TOTP                           | ✅     |
| `@nestlancer/database`        | ✅       | 10    | Prisma R/W, repositories, pagination, soft-delete         | ✅     |
| `@nestlancer/health-lib`      | ✅       | 8     | Health check indicators                                   | ✅     |
| `@nestlancer/idempotency`     | ✅       | 7     | Redis + PG idempotency keys                               | ✅     |
| `@nestlancer/logger`          | ✅       | 7     | Structured logging                                        | ✅     |
| `@nestlancer/mail`            | ✅       | 4     | SMTP email + Handlebars templates                         | ✅     |
| `@nestlancer/metrics`         | ✅       | 8     | Prometheus prom-client                                    | ✅     |
| `@nestlancer/middleware`      | ✅       | 9     | CORS, Helmet, rate-limit                                  | ✅     |
| `@nestlancer/outbox`          | ✅       | 6     | Transactional outbox + poller integration                 | ✅     |
| `@nestlancer/pdf`             | ✅       | 5     | PDF generation (quotes/receipts)                          | ✅     |
| `@nestlancer/queue`           | ✅       | 6     | RabbitMQ publisher/consumer, DLQ, routing keys            | ✅     |
| `@nestlancer/search`          | ✅       | 3     | Meilisearch integration                                   | ✅     |
| `@nestlancer/storage`         | ✅       | 5     | S3-compatible object storage                              | ✅     |
| `@nestlancer/testing`         | ✅       | 14    | Test factories, mocks, JWT helpers                        | ✅     |
| `@nestlancer/tracing`         | ✅       | 4     | Correlation ID middleware                                 | ✅     |
| `@nestlancer/turnstile`       | ✅       | 4     | Cloudflare Turnstile verification                         | ✅     |
| `@nestlancer/websocket`       | ✅       | 8     | WebSocket utilities                                       | ✅     |

- ✅ `libs/tests/` — shared test factories and mocks

**Sub-todos — Libraries:**

- [ ] Verify Meilisearch indexing used in blog/portfolio search (lib exists)
- [ ] Increase test count for `mail` (4), `search` (3), `circuit-breaker` (3) if critical path

---

## 10. Backend — Gateway & WS Gateway

### 10.1 HTTP Gateway (`gateway/` — port 3000)

**Gateway modules:** admin, auth, blog, contact, health, media, messages, notifications, payments, portfolio, progress, projects, quotes, requests, users, webhooks

| Module          | Base Path                 | Status | Frontend Consumer          |
| :-------------- | :------------------------ | :----- | :------------------------- |
| `auth`          | `/api/v1/auth/*`          | ✅     | web, admin BFF             |
| `users`         | `/api/v1/users/*`         | ✅     | web profile/settings       |
| `requests`      | `/api/v1/requests/*`      | ✅     | web + admin requests       |
| `quotes`        | `/api/v1/quotes/*`        | ✅     | web + admin quotes         |
| `projects`      | `/api/v1/projects/*`      | ✅     | web + admin projects       |
| `progress`      | `/api/v1/progress/*`      | ✅     | web project hub            |
| `payments`      | `/api/v1/payments/*`      | ✅     | web + admin payments       |
| `messages`      | `/api/v1/messages/*`      | ✅     | web + admin messaging      |
| `notifications` | `/api/v1/notifications/*` | ✅     | web notifications          |
| `media`         | `/api/v1/media/*`         | ✅     | web media library          |
| `portfolio`     | `/api/v1/portfolio/*`     | ✅     | web + admin portfolio      |
| `blog`          | `/api/v1/blog/*`          | ✅     | web + admin + landing blog |
| `contact`       | `/api/v1/contact/*`       | ✅     | web + admin contact        |
| `admin`         | `/api/v1/admin/*`         | ⚠️     | admin app                  |
| `webhooks`      | `/api/v1/webhooks/*`      | ✅     | admin integrations + BFF   |
| `health`        | `/api/v1/health/*`        | ✅     | ops / admin health         |

### 10.2 Gateway Feature Checklist

| Feature                      | Status | Evidence                                  |
| :--------------------------- | :----- | :---------------------------------------- |
| JWT validation + RBAC        | ✅     | gateway middleware + @nestlancer/auth-lib |
| Rate limiting                | ✅     | @nestlancer/middleware                    |
| CSRF double-submit cookie    | ✅     | ADR 003                                   |
| OpenAPI / Swagger export     | ✅     | docs-specs.controller.ts                  |
| Proxy to 16 microservices    | ✅     | docker-compose.dev.yml service URLs       |
| Admin monolith controller    | ⚠️     | admin.controller.ts ~1200 lines           |
| Share gateway (public media) | ✅     | share.gateway.controller.ts               |
| Push gateway passthrough     | ✅     | push-gateway.controller.ts                |

### 10.3 WS Gateway (`ws-gateway/` — port 3100)

| Feature                         | Status | Evidence                                |
| :------------------------------ | :----- | :-------------------------------------- |
| Socket.IO server                | ✅     | ws-gateway/src/                         |
| Redis pub/sub adapter           | ✅     | multi-instance scaling                  |
| JWT auth on connect             | ✅     | docs/architecture/websocket-protocol.md |
| Message rooms (project, thread) | ✅     | frontend useMessagingRoom               |
| Typing + presence events        | ✅     | MessageThreadClient.tsx                 |
| Notification push via WS        | ✅     | useNotificationsRealtime                |
| Progress realtime events        | ✅     | useProjectProgressRealtime              |
| E2E tests                       | ✅     | ws-gateway/e2e/ (4 files)               |

**Sub-todos — Gateway:**

- [ ] Split admin.controller.ts into domain controllers
- [ ] Fix architecture doc port table drift
- [ ] Add gateway-level cross-repo E2E with frontend BFF

---

## 11. Backend — Microservices (16)

Detailed feature matrix per service. Each row verified against controllers in `services/<name>/src/controllers/`.

### 11.1 `auth` Service (port 3001)

| Feature                       | Status | Backend Evidence                                          | Frontend Consumer                   |
| :---------------------------- | :----- | :-------------------------------------------------------- | :---------------------------------- |
| Register + email verification | ✅     | `services/auth/src/controllers/auth.public.controller.ts` | web `RegisterForm`, `/verify-email` |
| Login + logout                | ✅     | JWT RS256 + Session model                                 | BFF `api/auth/login`, `logout`      |
| Refresh token rotation        | ✅     | 15m access / 7d refresh                                   | BFF `api/auth/refresh`              |
| Forgot / reset password       | ✅     | verification tokens                                       | web forgot/reset-password           |
| 2FA TOTP setup + verify       | ✅     | `otplib`                                                  | `TwoFactorChallengeForm.tsx`        |
| Turnstile on register         | ✅     | `@nestlancer/turnstile`                                   | `RegisterForm.tsx`                  |
| Account lockout (5 failures)  | ✅     | `services/auth/README.md`                                 | —                                   |
| Check email availability      | ✅     | `check-email` endpoint                                    | register form                       |
| OAuth Google/GitHub           | ❌     | No OAuth controllers                                      | `SocialLogin.tsx` disabled          |

**Sub-todos — auth:**

- [ ] ❌ Implement OAuth providers OR remove disabled social login buttons
- [ ] ⚠️ Add OAuth ADR if implementing third-party auth

### 11.2 `users` Service (port 3002)

| Feature                             | Status | Backend Evidence                                                  | Frontend Consumer                        |
| :---------------------------------- | :----- | :---------------------------------------------------------------- | :--------------------------------------- |
| Profile CRUD                        | ✅     | `users.controller.ts`                                             | `ProfileViewClient`, `ProfileEditClient` |
| Avatar upload                       | ✅     | users controller + storage                                        | `ProfileEditClient.tsx`                  |
| Preferences (notifications/privacy) | ✅     | `UserPreference` model                                            | `SettingsNotificationsClient`            |
| 2FA enable/disable                  | ✅     | users controller                                                  | `SettingsSecurityClient`                 |
| Sessions list + revoke              | ✅     | sessions endpoints                                                | `SettingsSecurityClient`                 |
| Change password                     | ✅     | change-password endpoint                                          | `SettingsSecurityClient`                 |
| Delete account (soft delete)        | ✅     | delete-account endpoint                                           | `SettingsAccountClient`                  |
| **Data export (GDPR)**              | ✅     | `users.admin.controller.ts` → `ActivityService.requestDataExport` | `UserDetailClient` export button         |
| Admin user management               | ✅     | `users.admin.controller.ts`                                       | `UsersListClient`, `UserDetailClient`    |
| Activity log                        | ✅     | activity endpoint                                                 | admin `UserDetailClient`                 |
| Data export (self-service)          | ⚠️     | user-facing export endpoint                                       | NEEDS VERIFICATION                       |

**Sub-todos — users:**

- [x] ✅ Implement async GDPR export job + admin trigger (outbox `USER_DATA_EXPORT_REQUESTED`)
- [x] ✅ Wire admin export UI to real endpoint (`UserDetailClient`)

### 11.3 `payments` Service (port 3003)

| Feature                      | Status | Backend Evidence                                       | Frontend Consumer           |
| :--------------------------- | :----- | :----------------------------------------------------- | :-------------------------- |
| Create payment intent        | ✅     | `payments/src/controllers/user/payments.controller.ts` | `PaymentDetailClient`       |
| Razorpay order creation      | ✅     | `razorpay.service.ts`                                  | `usePaymentCheckout.ts`     |
| Client checkout + confirm    | ✅     | confirm endpoint                                       | `PaymentCheckoutPanel.tsx`  |
| Razorpay webhook + signature | ✅     | `razorpay-webhook.controller.ts`                       | BFF `api/webhooks/razorpay` |
| Refunds (admin)              | ✅     | admin payments controller                              | `PaymentsClient.tsx`        |
| Saved payment methods        | ✅     | `payment-methods.controller.ts`                        | `PaymentMethodsClient.tsx`  |
| Invoices / receipts PDF      | ✅     | `invoices.controller.ts` + `@nestlancer/pdf`           | `PaymentInvoiceClient.tsx`  |
| Disputes                     | ✅     | `payment-disputes.admin.controller.ts`                 | admin payments              |
| Payment milestones           | ✅     | `payment-milestones.admin.controller.ts`               | admin payments              |
| Idempotency keys             | ✅     | `@nestlancer/idempotency`                              | ADR 007                     |

**Sub-todos — payments:**

- [x] ✅ Add frontend Playwright E2E for Razorpay checkout (mocked)
- [ ] ⚠️ Document test card flow in CI environment

### 11.4 `webhooks` Service (port 3004)

| Feature                      | Status | Backend Evidence                 | Frontend Consumer        |
| :--------------------------- | :----- | :------------------------------- | :----------------------- |
| Inbound Razorpay webhook     | ✅     | `webhook-receiver.controller.ts` | BFF route                |
| Inbound GitHub / Stripe      | ✅     | webhook receiver                 | —                        |
| Outbound webhook CRUD        | ✅     | webhooks service + gateway       | `IntegrationsClient.tsx` |
| Delivery logs + manual retry | ✅     | `WebhookDelivery` model          | admin integrations       |
| HMAC signature verification  | ✅     | webhook-auth pattern             | —                        |

### 11.5 `admin` Service (port 3005)

| Feature                    | Status | Backend Evidence                              | Frontend Consumer              |
| :------------------------- | :----- | :-------------------------------------------- | :----------------------------- |
| Dashboard overview metrics | ✅     | `dashboard.admin.controller.ts`               | `DashboardClient.tsx`          |
| System config key-value    | ✅     | `system.admin.controller.ts`                  | `SystemClient.tsx`             |
| Feature flags + rollout %  | ✅     | `FeatureFlag` model                           | `SystemClient.tsx`             |
| Email templates CRUD       | ✅     | `email-templates.admin.controller.ts`         | admin system                   |
| Impersonation sessions     | ✅     | `impersonation.admin.controller.ts`           | admin users (wireframe exists) |
| Audit log query API        | ✅     | `audit.admin.controller.ts`                   | `AuditClient.tsx`              |
| Gateway admin aggregation  | ⚠️     | `gateway/.../admin.controller.ts` ~1200 lines | all admin modules              |

**Sub-todos — admin:**

- [ ] ⚠️ Refactor gateway admin.controller into domain modules
- [ ] ⚠️ Verify impersonation end-to-end in admin UI

### 11.6 `requests` Service (port 3006)

| Feature                                    | Status | Backend Evidence               | Frontend Consumer           |
| :----------------------------------------- | :----- | :----------------------------- | :-------------------------- |
| CRUD + pagination                          | ✅     | `requests.controller.ts`       | `RequestsListClient`        |
| State machine (draft→submit→review→quoted) | ✅     | `RequestStatusHistory`         | `RequestDetailClient`       |
| File attachments                           | ✅     | `RequestAttachment` + media    | `RequestDetailClient`       |
| Admin review + internal notes              | ✅     | `requests.admin.controller.ts` | admin `RequestDetailClient` |
| Request stats                              | ✅     | stats endpoint                 | admin dashboard             |

### 11.7 `quotes` Service (port 3007)

| Feature                            | Status | Backend Evidence             | Frontend Consumer         |
| :--------------------------------- | :----- | :--------------------------- | :------------------------ |
| Admin quote CRUD                   | ✅     | `quotes.admin.controller.ts` | admin `QuotesClient`      |
| Send quote to client               | ✅     | send endpoint + email worker | admin `QuoteDetailClient` |
| Accept / decline / request changes | ✅     | `quotes.controller.ts`       | `QuoteDetailClient`       |
| PDF download                       | ✅     | `@nestlancer/pdf`            | quote detail              |
| Auto-expire after validUntil       | ✅     | Quote model                  | —                         |

### 11.8 `projects` Service (port 3008)

| Feature                                | Status | Backend Evidence                | Frontend Consumer          |
| :------------------------------------- | :----- | :------------------------------ | :------------------------- |
| Project lifecycle CRUD                 | ✅     | `projects.controller.ts`        | `ProjectDetailClient`      |
| Public read-only view                  | ✅     | `projects.public.controller.ts` | share links                |
| Timeline + client feedback             | ✅     | projects controller             | `ProjectHubOverviewTab`    |
| Revision requests                      | ✅     | revision endpoint               | milestones tab             |
| Admin ops (archive, duplicate, export) | ✅     | `projects.admin.controller.ts`  | `AdminProjectDetailClient` |

### 11.9 `progress` Service (port 3009)

| Feature                           | Status | Backend Evidence                    | Frontend Consumer           |
| :-------------------------------- | :----- | :---------------------------------- | :-------------------------- |
| Milestones ordered per project    | ✅     | milestones controllers              | `ProjectHubMilestonesTab`   |
| Deliverables + file attach        | ✅     | deliverables controllers            | `ProjectHubDeliverablesTab` |
| Client approve / request revision | ✅     | `milestone-approvals.controller.ts` | milestones tab              |
| Progress timeline entries         | ✅     | `progress.controller.ts`            | `ProgressTimelineClient`    |
| Admin milestone management        | ✅     | `progress.admin.controller.ts`      | admin pipeline/projects     |
| README documentation              | ⚠️     | Stale copy of projects README       | —                           |

**Sub-todos — progress:**

- [ ] ⚠️ Rewrite `services/progress/README.md`

### 11.10 `messaging` Service (port 3010)

| Feature                       | Status | Backend Evidence               | Frontend Consumer         |
| :---------------------------- | :----- | :----------------------------- | :------------------------ |
| Conversation list             | ✅     | `conversations.controller.ts`  | `ConversationsListPanel`  |
| Project-scoped chat           | ✅     | `messages.controller.ts`       | `MessageThreadClient`     |
| Direct + group chat threads   | ✅     | `chat-threads.controller.ts`   | `MessageChatThreadClient` |
| Message reactions             | ✅     | messages controller            | thread clients            |
| Message search                | ✅     | search endpoint                | —                         |
| Unread badge counts           | ✅     | unread endpoint                | `MessagesLayoutShell`     |
| Realtime publish → ws-gateway | ✅     | Redis pub/sub publisher        | `useMessagingRoom`        |
| Admin flagged messages        | ✅     | `messages.admin.controller.ts` | admin messages            |
| README documentation          | ⚠️     | Stale copy                     | —                         |

**Sub-todos — messaging:**

- [ ] ⚠️ Rewrite `services/messaging/README.md`

### 11.11 `notifications` Service (port 3011)

| Feature                        | Status | Backend Evidence              | Frontend Consumer                |
| :----------------------------- | :----- | :---------------------------- | :------------------------------- |
| In-app notification feed       | ✅     | `notifications.controller.ts` | `NotificationsClient`, bell      |
| Mark read / mark all read      | ✅     | notifications controller      | `NotificationBell`               |
| Per-category preferences       | ✅     | `preferences.controller.ts`   | `SettingsNotificationsClient`    |
| Web Push (VAPID) subscriptions | ✅     | `push.controller.ts`          | NEEDS VERIFICATION — web push UI |
| Admin notification templates   | ✅     | templates admin controller    | admin system                     |
| README documentation           | ⚠️     | Stale copy                    | —                                |

**Sub-todos — notifications:**

- [ ] ⚠️ Verify browser push registration UI uses `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`
- [ ] ⚠️ Rewrite `services/notifications/README.md`

### 11.12 `media` Service (port 3012)

| Feature                   | Status | Backend Evidence              | Frontend Consumer            |
| :------------------------ | :----- | :---------------------------- | :--------------------------- |
| Presigned upload URLs     | ✅     | media user controllers        | `useMediaUpload.ts`          |
| Chunked multipart upload  | ✅     | chunked controller            | `FileUpload.tsx`             |
| Direct server upload      | ✅     | direct upload endpoint        | `FileUpload.tsx`             |
| Download + metadata       | ✅     | media controller              | `MediaLibraryClient`         |
| Public share by token     | ✅     | `share.gateway.controller.ts` | `/share/[token]`             |
| Quarantine infected files | ✅     | media-admin gateway           | `AdminMediaQuarantineClient` |
| Storage analytics         | ✅     | stats endpoints               | `AdminMediaAnalyticsClient`  |
| README documentation      | ⚠️     | Stale copy                    | —                            |

**Sub-todos — media:**

- [ ] ⚠️ Rewrite `services/media/README.md`

### 11.13 `portfolio` Service (port 3013)

| Feature                         | Status | Backend Evidence                 | Frontend Consumer              |
| :------------------------------ | :----- | :------------------------------- | :----------------------------- |
| Public listing + filters        | ✅     | `portfolio.public.controller.ts` | `/portfolio`                   |
| Detail page + SEO               | ✅     | portfolio public controller      | `/portfolio/[id]`              |
| Categories + search             | ✅     | portfolio service                | `PortfolioSearch.tsx`          |
| Like button (anonymous/session) | ✅     | like endpoint                    | `PortfolioLikeButton`          |
| Featured carousel data          | ✅     | featured endpoint                | homepage (partial placeholder) |
| Admin CRUD + publish            | ✅     | `portfolio.admin.controller.ts`  | `AdminPortfolioClient`         |
| Service README                  | ❌     | Missing                          | —                              |

**Sub-todos — portfolio:**

- [ ] ❌ Create `services/portfolio/README.md`

### 11.14 `blog` Service (port 3014)

| Feature                                 | Status | Backend Evidence                     | Frontend Consumer            |
| :-------------------------------------- | :----- | :----------------------------------- | :--------------------------- |
| Public posts + RSS feed                 | ✅     | `posts.public.controller.ts`         | web + landing blog           |
| Comments + threading                    | ✅     | `comments.controller.ts`             | `BlogPostInteractionsClient` |
| Likes + bookmarks                       | ✅     | `post-interactions.controller.ts`    | bookmarks page               |
| Taxonomy (categories/tags/authors)      | ✅     | taxonomy controllers                 | admin Content + blog nav     |
| Admin CMS (CRUD, publish, feature, pin) | ✅     | blog admin controllers               | `AdminBlogPostEditorClient`  |
| Comment moderation queue                | ✅     | admin comments                       | `ModerationClient`           |
| Blog analytics dashboard                | ✅     | `blog-analytics.admin.controller.ts` | `AnalyticsClient`            |
| Service README                          | ❌     | Missing                              | —                            |

**Sub-todos — blog:**

- [ ] ❌ Create `services/blog/README.md`

### 11.15 `contact` Service (port 3015)

| Feature                         | Status | Backend Evidence          | Frontend Consumer   |
| :------------------------------ | :----- | :------------------------ | :------------------ |
| Public inquiry form             | ✅     | contact public controller | `ContactFormClient` |
| Cloudflare Turnstile            | ✅     | turnstile on submit       | contact forms       |
| Admin inbox + respond           | ✅     | contact admin paths       | `ContactClient`     |
| Status workflow (NEW→RESPONDED) | ✅     | `ContactMessage` model    | admin contact       |
| Service README                  | ❌     | Missing                   | —                   |

**Sub-todos — contact:**

- [ ] ❌ Create `services/contact/README.md`

### 11.16 `health` Service (port 3016)

| Feature                             | Status | Backend Evidence        | Frontend Consumer   |
| :---------------------------------- | :----- | :---------------------- | :------------------ |
| `/health/live` + `/health/ready`    | ✅     | `health.controller.ts`  | K8s probes (future) |
| DB / Redis / Queue / Storage checks | ✅     | dependency endpoints    | ops                 |
| All microservices probe             | ✅     | `/health/microservices` | system smoke        |
| All workers probe                   | ✅     | `/health/workers`       | system smoke        |
| Admin debug endpoints               | ✅     | health admin debug      | admin wireframe     |

---

## 12. Backend — Workers (8)

| #   | Worker                | Queue / Source       | Purpose                                         | Spec Tests | E2E | Status |
| :-- | :-------------------- | :------------------- | :---------------------------------------------- | :--------- | :-- | :----- |
| 1   | `email-worker`        | `email.queue`        | SMTP transactional email via `@nestlancer/mail` | 6          | ✅  | ✅     |
| 2   | `notification-worker` | `notification.queue` | In-app + push notification dispatch             | 7          | ✅  | ✅     |
| 3   | `audit-worker`        | `audit.queue`        | Batch audit log persistence                     | 6          | ✅  | ✅     |
| 4   | `media-worker`        | `media.queue`        | Metadata extraction, processing, quarantine     | 11         | ✅  | ✅     |
| 5   | `analytics-worker`    | `analytics.queue`    | Event aggregation (`aggregation.service.ts`)    | 12         | ✅  | ✅     |
| 6   | `webhook-worker`      | `webhook.queue`      | Outbound webhook delivery + retries             | 18         | ✅  | ✅     |
| 7   | `cdn-worker`          | `cdn.queue`          | Cloudflare CDN cache invalidation               | 8          | ✅  | ✅     |
| 8   | `outbox-poller`       | `Outbox` DB table    | Transactional outbox → RabbitMQ (ADR 004)       | 8          | ✅  | ✅     |

**Sub-todos — Workers:**

- [ ] Verify `scripts/db/replay-dlq.sh` exists (referenced in `docs/runbooks/dlq-processing.md`)
- [ ] Add Grafana dashboard for queue depth (requires §7 monitoring stack)
- [ ] Load test worker horizontal scaling

---

## 13. Backend — API & OpenAPI

| Item                     | Status | Evidence                                                |
| :----------------------- | :----- | :------------------------------------------------------ |
| Merged OpenAPI spec      | ✅     | `docs/api/openapi-merged.json` — **438 paths**          |
| Live gateway export      | ✅     | `GET /api/v1/docs-specs`                                |
| Spectral lint rules      | ✅     | `.spectral.yaml`                                        |
| Contract validation      | ✅     | `pnpm contract:check` (= `openapi:lint`)                |
| Postman collection       | ✅     | `docs/api/postman-collection.json`                      |
| Human endpoint reference | ✅     | `docs/api/endpoints-reference.md`                       |
| Reference docs 100–120   | ✅     | `reference-docs/10*.md` – `120*.md`                     |
| Frontend synced contract | ✅     | `nestlancer-frontend/swagger-docs/openapi-gateway.json` |
| CI validates on PR       | ⚠️     | `ci.yml` runs missing `swagger:validate` script         |
| Pre-push hook (frontend) | ✅     | Husky → `pnpm contract:check`                           |

**Sub-todos — API:**

- [x] Add `"swagger:validate": "pnpm openapi:lint"` to backend package.json
- [ ] Automate OpenAPI diff on PR (breaking change detection)
- [ ] Keep endpoint count in CHANGELOG synced (438 not 428)

---

## 14. Backend — Testing

### 14.1 Test Commands

| Layer                     | Command                  | Status | Notes                                 |
| :------------------------ | :----------------------- | :----- | :------------------------------------ |
| Unit (all packages)       | `pnpm test:unit`         | ✅     | 561 `*.spec.ts` files                 |
| Integration               | `pnpm test:integration`  | ✅     | Real DB/Redis when Docker up          |
| Per-service E2E           | `pnpm test:e2e`          | ✅     | `--concurrency=1` avoids DB deadlocks |
| E2E parallel (fast/risky) | `pnpm test:e2e:parallel` | ✅     | Documented in testing-report.md       |
| Docker orchestrated E2E   | `pnpm test:e2e:docker`   | ✅     | `scripts/test/run-e2e.sh`             |
| System smoke              | `pnpm test:system:smoke` | ✅     | Gateway + infra + all services        |
| System E2E                | `pnpm test:system:e2e`   | ✅     | Per-domain cross-service flows        |
| Coverage report           | `pnpm test:cov`          | ⚠️     | 80% threshold — NEEDS VERIFICATION    |

### 14.2 Per-Package Test Coverage (unit spec count)

| Package                | Spec Files | Unit | Integration | E2E |
| :--------------------- | :--------- | :--- | :---------- | :-- |
| libs/common            | 41         | ✅   | —           | —   |
| services/admin         | 29         | ✅   | ✅          | ✅  |
| services/blog          | 23         | ✅   | ✅          | ✅  |
| services/payments      | 20         | ✅   | ✅          | ✅  |
| workers/webhook-worker | 18         | ✅   | ✅          | ✅  |
| services/notifications | 17         | ✅   | ✅          | ✅  |
| services/health        | 16         | ✅   | ✅          | ✅  |
| services/progress      | 15         | ✅   | ✅          | ✅  |
| services/portfolio     | 15         | ✅   | ✅          | ✅  |
| services/messaging     | 14         | ✅   | ✅          | ✅  |
| services/auth          | 13         | ✅   | ✅          | ✅  |
| _(all 16 services)_    | ≥9 each    | ✅   | ✅          | ✅  |
| gateway                | 9          | ✅   | ✅          | ✅  |
| ws-gateway             | 7          | ✅   | ✅          | ✅  |
| _(all 8 workers)_      | ≥6 each    | ✅   | ✅          | ✅  |

### 14.3 System Test Suite (`tests/system/`)

**Smoke (22 files):**

- `smoke/infra/gateway-health-and-routing.smoke.spec.ts`
- `smoke/infra/platform-wiring.smoke.spec.ts`
- `smoke/services/*.smoke.spec.ts` — auth, users, requests, quotes, projects, progress, payments, messaging, notifications, media, portfolio, blog, contact, admin, webhooks, health
- `smoke/workers/workers-wiring.smoke.spec.ts`

**Cross-service E2E (16 files):**

- `e2e/services/*.e2e.spec.ts` — one per microservice
- `e2e/workers/workers.e2e.spec.ts`

**Sub-todos — Testing:**

- [ ] Run `pnpm test:cov` — append results to §22.3
- [ ] Add payment flow to system E2E (Razorpay test mode)
- [ ] Frontend Playwright against staging gateway
- [ ] Track flaky tests in `docs/testing-report.md`

---

## 15. Frontend — Monorepo & Tooling

### 15.1 Root Configuration

| #   | File / Tool              | Status | Evidence                                            | Notes                              |
| :-- | :----------------------- | :----- | :-------------------------------------------------- | :--------------------------------- |
| 1   | pnpm + Turborepo         | ✅     | `package.json`, `turbo.json`, `pnpm-workspace.yaml` | Node ≥20, pnpm 9                   |
| 2   | Husky hooks              | ✅     | `.husky/pre-commit`, `commit-msg`, `pre-push`       | pre-push runs contract:check       |
| 3   | commitlint               | ✅     | `commitlint.config.js`                              | Conventional commits               |
| 4   | ESLint + Prettier        | ✅     | Root + per-app configs                              | lint-staged on commit              |
| 5   | Orval API codegen        | ✅     | `orval.config.ts`                                   | 2672 generated files               |
| 6   | OpenAPI contract         | ✅     | `swagger-docs/openapi-gateway.json`                 | 438 paths synced                   |
| 7   | Docker dev compose       | ✅     | `docker-compose.dev.yml`                            | web:9000, admin:9010, landing:9020 |
| 8   | Docker prod compose      | ✅     | `docker-compose.prod.yml`                           | Multi-stage prod build             |
| 9   | **GitHub Actions CI**    | ❌     | No `.github/workflows/`                             | Documented in ARCHITECTURE.md only |
| 10  | Vitest (web)             | ⚠️     | `apps/web/vitest.config.ts`                         | **0 unit test files**              |
| 11  | Playwright (web + admin) | ⚠️     | 9 specs total                                       | Critical flows under-tested        |
| 12  | Env templates            | ✅     | `apps/*/.env.example`, root `.env.development`      | Per-app symlinks                   |

**Sub-todos — Frontend tooling:**

- [x] ✅ Add `.github/workflows/ci.yml` (lint, type-check, build, openapi:lint)
- [ ] ❌ Add Vitest tests for auth, payments, api-client hooks
- [ ] ⚠️ Add landing app Playwright smoke spec
- [ ] ⚠️ Add e2e to CI (mocked Playwright against build)

---

## 16. Frontend — Shared Packages (14)

### 16.1 `@nestlancer/api-client`

| Item                                      | Status | Evidence                                       |
| :---------------------------------------- | :----- | :--------------------------------------------- |
| Orval Axios client (all tags)             | ✅     | `generated/endpoints.ts`                       |
| React Query hooks (14 tags)               | ✅     | `orval.config.ts` REACT_QUERY_TAGS             |
| Hand-written service facade (17 services) | ⚠️     | `services/*.service.ts` — apps still use these |
| Envelope interceptor                      | ✅     | Unwraps `{ status, data }`                     |
| Auth + retry + error interceptors         | ✅     | `interceptors/`                                |
| Drift check                               | ✅     | `pnpm api:drift-check:all`                     |
| Orval mutator (strip /api/v1 dup)         | ✅     | `orval-mutator.ts`                             |

**Sub-todos — api-client:**

- [ ] Migrate feature modules from hand-written services → generated React Query hooks
- [ ] Deprecate duplicate methods in `services/*.service.ts` after migration
- [ ] Add CI step: `pnpm codegen:check`

### 16.2 `@nestlancer/auth`

| Item                               | Status | Evidence                           |
| :--------------------------------- | :----- | :--------------------------------- |
| BFF cookie helpers                 | ✅     | `packages/auth/src/bff.ts`         |
| Token manager (sessionStorage)     | ✅     | `tokenManager.ts`                  |
| Edge middleware factory            | ✅     | web + admin `middleware.ts`        |
| AuthProvider + useAuth             | ✅     | `packages/auth/src/`               |
| Session bootstrap + silent refresh | ✅     | `SessionBootstrap` pattern in apps |
| Admin blocked from web portal      | ✅     | `useLogin.ts` redirect logic       |

### 16.3 `@nestlancer/ui`

| Item                        | Status | Evidence                      |
| :-------------------------- | :----- | :---------------------------- |
| Tailwind component library  | ✅     | `packages/ui/src/components/` |
| Command palette             | ✅     | `CommandPalette.tsx`          |
| Theme / dark mode provider  | ✅     | theme integration             |
| Admin Gentelella primitives | ✅     | `admin/primitives.tsx`        |
| Form inputs, modals, tables | ✅     | used across web + admin       |

### 16.4 `@nestlancer/websocket`

| Item                           | Status | Evidence                            |
| :----------------------------- | :----- | :---------------------------------- |
| WebSocketProvider              | ✅     | web + admin AppProviders            |
| useMessagingRoom + typing      | ✅     | MessageThreadClient, admin messages |
| useNotificationsRealtime       | ✅     | RequestsQuotesRealtimeSync          |
| useProjectProgressRealtime     | ✅     | ProgressTimelineClient              |
| usePresence                    | ✅     | MessageThreadClient                 |
| Socket.IO path `/ws/socket.io` | ✅     | `packages/websocket/src/client.ts`  |

### 16.5 Other packages

| Package                  | Status | Purpose                                 |
| :----------------------- | :----- | :-------------------------------------- |
| `@nestlancer/types`      | ✅     | Shared TS types (`AuthUser`, etc.)      |
| `@nestlancer/constants`  | ✅     | Routes, feature flags, telemetry events |
| `@nestlancer/validators` | ✅     | Zod schemas shared with forms           |
| `@nestlancer/config`     | ✅     | Env validation, CSP (`csp.mjs`)         |
| `@nestlancer/utils`      | ✅     | date-fns utilities                      |
| `@nestlancer/hooks`      | ✅     | Shared React hooks                      |
| `@nestlancer/field-help` | ✅     | Form field help tooltips                |
| `@nestlancer/theme`      | ✅     | CSS tokens (`tokens.css`, `motion.css`) |
| `@nestlancer/marketing`  | ✅     | Marketing section components            |
| `@nestlancer/motion`     | ✅     | Animation utilities                     |
| `@nestlancer/tokens`     | ✅     | Design token exports                    |

---

## 17. Frontend — Web App (port 9000)

**App path:** `nestlancer-frontend/apps/web/`  
**Feature modules:** 130 files in `src/features/`  
**UI migration:** TailAdmin-style — ✅ completed (`docs/web-ui-migration-plan.md`)

### 17.1 Public Routes

| Route                     | Wireframe                               | Page File                                  | API Integrated    | E2E    | Status | Notes                                                                           |
| :------------------------ | :-------------------------------------- | :----------------------------------------- | :---------------- | :----- | :----- | :------------------------------------------------------------------------------ |
| `/`                       | `public/homepage.md`                    | `(public)/page.tsx`                        | ✅ blog/portfolio | visual | ❌     | **Marketplace copy** + featured placeholder — reframe for single studio (§23)   |
| `/blog`                   | `public/blog/post-listing.md`           | `(public)/blog/page.tsx`                   | ✅                | visual | ✅     |                                                                                 |
| `/blog/[slug]`            | `public/blog/post-detail.md`            | `(public)/blog/[slug]/page.tsx`            | ✅                | —      | ✅     |                                                                                 |
| `/blog/bookmarks`         | `user/blog/my-bookmarks.md`             | `(public)/blog/bookmarks/page.tsx`         | ✅                | —      | ✅     | auth-protected                                                                  |
| `/portfolio`              | `public/portfolio/portfolio-listing.md` | `(public)/portfolio/page.tsx`              | ✅                | visual | ✅     |                                                                                 |
| `/portfolio/[id]`         | `public/portfolio/portfolio-detail.md`  | `(public)/portfolio/[id]/page.tsx`         | ✅                | —      | ✅     |                                                                                 |
| `/contact`                | `public/contact.md`                     | `(public)/contact/page.tsx`                | ✅                | —      | ✅     |                                                                                 |
| `/work`                   | —                                       | `(public)/work/page.tsx`                   | ✅                | —      | ✅     | unified work hub                                                                |
| `/freelancers`            | —                                       | `(public)/freelancers/page.tsx`            | —                 | —      | ❌     | **Wrong product — remove** (marketplace directory; not single-freelancer model) |
| `/freelancers/[username]` | —                                       | `(public)/freelancers/[username]/page.tsx` | —                 | —      | ❌     | **Wrong product — remove**                                                      |
| `/privacy`                | `public/legal-static-pages.md`          | `(public)/privacy/page.tsx`                | —                 | —      | ✅     | static                                                                          |
| `/terms`                  | `public/legal-static-pages.md`          | `(public)/terms/page.tsx`                  | —                 | —      | ✅     | static                                                                          |
| `/share/[token]`          | —                                       | `share/[token]/page.tsx`                   | ✅                | —      | ✅     | public media share                                                              |

### 17.2 Auth Routes

| Route              | Wireframe                                 | Page / Client                | Status | Notes                                                      |
| :----------------- | :---------------------------------------- | :--------------------------- | :----- | :--------------------------------------------------------- |
| `/login`           | `public/authentication-pages/login.md`    | `LoginForm.tsx` + BFF        | ✅     |                                                            |
| `/register`        | `public/authentication-pages/register.md` | `RegisterForm.tsx`           | ⚠️     | Turnstile OK; subtitle wrongly says "client or freelancer" |
| `/forgot-password` | `forgot-password.md`                      | `PasswordResetForm.tsx`      | ✅     |                                                            |
| `/reset-password`  | `reset-password.md`                       | `ResetPasswordClient.tsx`    | ✅     |                                                            |
| `/verify-email`    | `email-verification.md`                   | `VerifyEmailClient.tsx`      | ✅     |                                                            |
| 2FA challenge      | `2fa-verification.md`                     | `TwoFactorChallengeForm.tsx` | ✅     |                                                            |
| Social OAuth       | —                                         | `SocialLogin.tsx`            | ❌     | Google/GitHub disabled                                     |

### 17.3 Dashboard Routes (middleware-protected)

| Route                        | Wireframe                | Client Component                 | Realtime    | E2E    | Status    |
| :--------------------------- | :----------------------- | :------------------------------- | :---------- | :----- | :-------- |
| `/dashboard`                 | `user-dashboard-home.md` | `DashboardOverview.tsx`          | —           | —      | ✅        |
| `/requests`                  | `my-requests-list.md`    | `RequestsListClient.tsx`         | notify sync | mocked | ✅        |
| `/requests/new`              | `create-new-request.md`  | `NewRequestClient.tsx`           | —           | —      | ✅        |
| `/requests/[id]`             | `request-detail.md`      | `RequestDetailClient.tsx`        | —           | —      | ✅        |
| `/quotes`                    | `my-quotes-list.md`      | `QuotesListClient.tsx`           | notify sync | —      | ✅        |
| `/quotes/[id]`               | `quote-detail.md`        | `QuoteDetailClient.tsx`          | —           | —      | ✅        |
| `/projects`                  | `my-projects-list.md`    | `ProjectsListClient.tsx`         | —           | —      | ✅        |
| `/projects/new`              | —                        | `ProjectsNewClient.tsx`          | —           | —      | ✅        |
| `/projects/[id]`             | project-detail/\* tabs   | `ProjectDetailClient` + hub tabs | WS progress | —      | ✅        |
| `/messages`                  | `conversation-list.md`   | messaging clients                | WS          | —      | ✅        |
| `/messages/thread/[id]`      | `conversation-view.md`   | `MessageChatThreadClient`        | WS typing   | —      | ✅        |
| `/messages/[conversationId]` | `conversation-view.md`   | `MessageThreadClient`            | WS          | —      | ✅        |
| `/messages/new/direct`       | —                        | `MessageNewDirectClient`         | —           | —      | ✅        |
| `/notifications`             | `notification-list.md`   | `NotificationsClient`            | WS sync     | —      | ✅        |
| `/payments`                  | `payment-history.md`     | `PaymentsListClient`             | —           | —      | ✅        |
| `/payments/[id]`             | `payment-detail.md`      | `PaymentDetailClient`            | —           | ❌     | ⚠️ no e2e |
| `/payments/methods`          | `payment-methods.md`     | `PaymentMethodsClient`           | —           | —      | ✅        |
| `/payments/invoice/[id]`     | —                        | `PaymentInvoiceClient`           | —           | —      | ✅        |
| `/profile`                   | `profile-tab.md`         | `ProfileViewClient`              | —           | —      | ✅        |
| `/profile/edit`              | `profile-tab.md`         | `ProfileEditClient`              | —           | —      | ✅        |
| `/settings/account`          | `profile-tab.md`         | `SettingsAccountClient`          | —           | —      | ✅        |
| `/settings/security`         | `security-tab.md`        | `SettingsSecurityClient`         | —           | —      | ✅        |
| `/settings/notifications`    | `preferences-tab.md`     | `SettingsNotificationsClient`    | —           | —      | ✅        |
| `/settings/files`            | `media-library.md`       | `MediaLibraryClient`             | —           | —      | ✅        |

### 17.4 Web Feature Modules (`apps/web/src/features/`)

| Module          | Files               | API         | WS          | Loading/Error UI | Mobile | Status                                              |
| :-------------- | :------------------ | :---------- | :---------- | :--------------- | :----- | :-------------------------------------------------- |
| `auth`          | 8+ hooks/components | ✅ BFF      | —           | ✅               | ✅     | ⚠️ OAuth missing                                    |
| `marketing`     | homepage, CTA       | ✅          | —           | ✅               | ✅     | ❌ marketplace copy, fake stats, talent cards — §23 |
| `blog`          | 15+ components      | ✅          | —           | ✅               | ✅     | ⚠️ freelancer/marketplace CTAs — §23                |
| `portfolio`     | 6 components        | ✅          | —           | ✅               | ✅     | ✅                                                  |
| `contact`       | ContactFormClient   | ✅          | —           | ✅               | ✅     | ✅                                                  |
| `work`          | hub tabs + filter   | ✅          | —           | ✅               | ✅     | ✅                                                  |
| `requests`      | list, detail, new   | ✅          | notify      | ✅               | ✅     | ✅                                                  |
| `quotes`        | list, detail        | ✅          | notify      | ✅               | ✅     | ✅                                                  |
| `projects`      | hub 6 tabs          | ✅          | progress WS | ✅               | ✅     | ✅                                                  |
| `messaging`     | 10+ components      | ✅          | ✅ full     | ✅               | ✅     | ✅                                                  |
| `notifications` | list + bell         | ✅          | ✅          | ✅               | ✅     | ✅                                                  |
| `payments`      | checkout, methods   | ✅ Razorpay | —           | ✅               | ✅     | ⚠️ no e2e                                           |
| `profile`       | view + edit         | ✅          | —           | ✅               | ✅     | ✅                                                  |
| `settings`      | 4 section clients   | ✅          | —           | ✅               | ✅     | ✅                                                  |
| `media`         | upload, share       | ✅          | —           | ✅               | ✅     | ✅                                                  |
| `progress`      | timeline            | ✅          | ✅          | ✅               | ✅     | ✅                                                  |

### 17.5 Web BFF & API Routes

| Route                         | Status | Evidence                                   |
| :---------------------------- | :----- | :----------------------------------------- |
| `POST /api/auth/login`        | ✅     | `apps/web/src/app/api/auth/login/route.ts` |
| `POST /api/auth/logout`       | ✅     | `api/auth/logout/route.ts`                 |
| `POST /api/auth/refresh`      | ✅     | `api/auth/refresh/route.ts`                |
| `POST /api/auth/verify-2fa`   | ✅     | `api/auth/verify-2fa/route.ts`             |
| `GET /api/auth/callback`      | ✅     | `api/auth/callback/route.ts`               |
| `POST /api/webhooks/razorpay` | ✅     | `api/webhooks/razorpay/route.ts`           |

### 17.6 Web E2E Tests (`apps/web/tests/e2e/`)

| Spec                           | Status | Coverage                       |
| :----------------------------- | :----- | :----------------------------- |
| `smoke.spec.ts`                | ✅     | App boots, auth redirect       |
| `requests-list.mocked.spec.ts` | ✅     | Requests list (mocked API)     |
| `public-pages.visual.spec.ts`  | ✅     | Visual regression public pages |
| Payment checkout               | ✅     | Mocked Razorpay checkout       |
| Login + 2FA flow               | ❌     | **Missing**                    |
| Project hub tabs               | ❌     | **Missing**                    |

**Sub-todos — Web app:**

- [x] ✅ **Remove** `/freelancers` routes, nav links, and `routes.freelancers` CTAs
- [x] ✅ Add `payment-checkout.mocked.spec.ts`
- [x] ✅ Rewrite homepage for single-freelancer studio (hero, process steps, remove TALENT_CARDS)
- [ ] ⚠️ Wire homepage featured projects to portfolio API
- [x] ✅ Fix register/login/auth-portal copy — **clients only** on web
- [x] ✅ Update landing app hero/metadata (§23.3)
- [x] ✅ Repoint BlogHireCta to `/contact` or `/register`, not `/freelancers`
- [ ] ⚠️ Enable or remove OAuth buttons in `SocialLogin.tsx`
- [ ] ⚠️ Add Vitest tests for `useLogin`, `usePaymentCheckout`
- [ ] ⚠️ Complete Orval hook migration per feature module

---

## 18. Frontend — Admin App (port 9010)

**App path:** `nestlancer-frontend/apps/admin/`  
**UI system:** Gentelella v4 — ✅ completed  
**Feature modules:** 48 files in `src/features/`

### 18.1 Admin Routes

| Route                      | Wireframe                       | Client                        | API   | E2E    | Status | Notes              |
| :------------------------- | :------------------------------ | :---------------------------- | :---- | :----- | :----- | :----------------- |
| `/`                        | —                               | redirect                      | —     | —      | ✅     | → login            |
| `/login`                   | —                               | `AdminLoginForm`              | BFF   | smoke  | ✅     |                    |
| `/dashboard`               | `dashboard-overview.md`         | `DashboardClient`             | ✅    | live   | ✅     |                    |
| `/pipeline`                | —                               | `PipelineHubClient`           | ✅    | live   | ✅     |                    |
| `/pipeline/users`          | —                               | `PipelineUserPickerClient`    | ✅    | live   | ✅     |                    |
| `/pipeline/users/[id]`     | —                               | `UserPipelineHubClient`       | ✅    | live   | ✅     |                    |
| `/pipeline/projects`       | —                               | `PipelineProjectPickerClient` | ✅    | live   | ✅     |                    |
| `/pipeline/projects/[id]`  | —                               | `ProjectPipelineHubClient`    | ✅    | live   | ✅     |                    |
| `/users`                   | `users-list.md`                 | `UsersListClient`             | ✅    | live   | ✅     |                    |
| `/users/[id]`              | `user-detail.md`                | `UserDetailClient`            | ✅    | mocked | ⚠️     | export coming soon |
| `/requests`                | `requests-admin.md`             | `RequestsClient`              | ✅    | —      | ✅     |                    |
| `/requests/[id]`           | `requests-admin.md`             | `RequestDetailClient`         | ✅    | —      | ✅     |                    |
| `/quotes`                  | `quotes-admin.md`               | `QuotesClient`                | ✅    | —      | ✅     |                    |
| `/quotes/[id]`             | `quotes-admin.md`               | `QuoteDetailClient`           | ✅    | —      | ✅     |                    |
| `/projects`                | `projects-admin.md`             | `ProjectsClient`              | ✅    | —      | ✅     |                    |
| `/projects/[id]`           | `projects-admin.md`             | `AdminProjectDetailClient`    | ✅    | —      | ✅     |                    |
| `/payments`                | `payments-admin.md`             | `PaymentsClient`              | ✅    | —      | ✅     |                    |
| `/messages`                | `messages-admin.md`             | `AdminMessagesInboxClient`    | ✅ WS | —      | ✅     |                    |
| `/messages/thread/[id]`    | `messages-admin.md`             | `AdminChatThreadClient`       | ✅ WS | —      | ✅     |                    |
| `/messages/project/[id]`   | `messages-admin.md`             | `AdminProjectThreadClient`    | ✅ WS | —      | ✅     |                    |
| `/messages/new-group`      | —                               | `AdminNewGroupChatClient`     | ✅    | —      | ✅     |                    |
| `/moderation`              | `comments-moderation.md`        | `ModerationClient`            | ✅    | —      | ✅     |                    |
| `/contact`                 | `contact-inquiries.md`          | `ContactClient`               | ✅    | —      | ✅     |                    |
| `/analytics`               | `revenue-analytics-sub-page.md` | `AnalyticsClient`             | ✅    | —      | ✅     |                    |
| `/content`                 | `posts-list.md`                 | `ContentClient`               | ✅    | —      | ✅     |                    |
| `/content/posts/new`       | `post-editor.md`                | `AdminBlogPostEditorClient`   | ✅    | —      | ✅     |                    |
| `/content/posts/[id]/edit` | `post-editor.md`                | editor client                 | ✅    | —      | ✅     |                    |
| `/portfolio`               | `portfolio-admin.md`            | `AdminPortfolioClient`        | ✅    | —      | ✅     |                    |
| `/portfolio/new`           | `portfolio-admin.md`            | editor                        | ✅    | —      | ✅     |                    |
| `/portfolio/[id]/edit`     | `portfolio-admin.md`            | `AdminPortfolioEditorClient`  | ✅    | —      | ✅     |                    |
| `/media`                   | `media-admin.md`                | media clients (3 tabs)        | ✅    | —      | ✅     |                    |
| `/system`                  | `system-configuration.md`       | `SystemClient`                | ✅    | —      | ✅     |                    |
| `/integrations`            | `webhooks-management.md`        | `IntegrationsClient`          | ✅    | —      | ✅     |                    |
| `/audit`                   | `audit-logs.md`                 | `AuditClient`                 | ✅    | —      | ✅     |                    |

### 18.2 Admin API Contract Scripts

| Script                    | Status | Evidence                           |
| :------------------------ | :----- | :--------------------------------- |
| `verify-admin-api.mjs`    | ✅     | ~30+ GET endpoints vs live gateway |
| `verify-pipeline-api.mjs` | ✅     | Pipeline-specific routes           |
| `pnpm test:api:all`       | ✅     | npm script in admin package.json   |
| POST/PUT mutation verify  | ❌     | Only GET-focused today             |

### 18.3 Admin E2E Tests

| Spec                             | Type         | Status |
| :------------------------------- | :----------- | :----- |
| `smoke.spec.ts`                  | mocked       | ✅     |
| `admin-users.mocked.spec.ts`     | mocked       | ✅     |
| `command-palette.mocked.spec.ts` | mocked       | ✅     |
| `admin-pages.live.spec.ts`       | live gateway | ✅     |
| `admin-users.live.spec.ts`       | live gateway | ✅     |
| `pipeline.live.spec.ts`          | live gateway | ✅     |

**Sub-todos — Admin app:**

- [x] ✅ Remove legacy `FREELANCER` from `AdminTableViews.tsx` role badge checks
- [x] ✅ Wire user export UI to backend when GDPR export implemented
- [ ] Add API verify scripts for POST/PUT admin mutations
- [ ] Add admin payment refund E2E (mocked)

---

## 19. Frontend — Landing App (port 9020)

| Route          | Wireframe | Status | API        | E2E | Notes                                                    |
| :------------- | :-------- | :----- | :--------- | :-- | :------------------------------------------------------- |
| `/`            | —         | ✅     | links only | ❌  | Hero sections; `NEXT_PUBLIC_FEATURE_LANDING_HERO_REVAMP` |
| `/about`       | —         | ✅     | static     | ❌  | no wireframe                                             |
| `/pricing`     | —         | ✅     | static     | ❌  | no wireframe                                             |
| `/contact`     | —         | ⚠️     | minimal    | ❌  | static form                                              |
| `/blog`        | —         | ⚠️     | partial    | ❌  | lightweight; defers to web app                           |
| `/blog/[slug]` | —         | ⚠️     | partial    | ❌  | lightweight                                              |

**Sub-todos — Landing:**

- [x] ✅ Fix marketplace copy (§23.3)
- [ ] ❌ Add Playwright smoke spec
- [ ] 🔮 Create landing wireframes in docs
- [ ] ⚠️ Decide: full blog integration vs redirect to web app

---

## 20. Cross-Repo Integration Matrix

| #   | Business Flow                    | Backend           | Web UI                                 | Admin UI         | Backend E2E | Frontend E2E | Overall |
| :-- | :------------------------------- | :---------------- | :------------------------------------- | :--------------- | :---------- | :----------- | :------ |
| 1   | User registration (clients only) | ✅ auth           | ⚠️ register copy wrong                 | —                | ✅          | smoke        | ⚠️      |
| 2   | Email verification               | ✅ auth           | ✅ verify-email                        | —                | ✅          | —            | ✅      |
| 3   | Login + 2FA                      | ✅ auth           | ✅ login/2FA                           | ✅ admin login   | ✅          | smoke        | ✅      |
| 4   | Submit project request           | ✅ requests       | ✅ requests/new                        | —                | ✅          | mocked list  | ✅      |
| 5   | Admin review request             | ✅ admin+requests | —                                      | ✅ requests/[id] | ✅          | live         | ✅      |
| 6   | Admin create/send quote          | ✅ quotes         | —                                      | ✅ quotes        | ✅          | —            | ✅      |
| 7   | Client accept quote              | ✅ quotes         | ✅ quotes/[id]                         | —                | ✅          | —            | ✅      |
| 8   | Project created + hub            | ✅ projects       | ✅ projects/[id]                       | ✅ projects/[id] | ✅          | —            | ✅      |
| 9   | Milestone approval               | ✅ progress       | ✅ milestones tab                      | ✅ pipeline      | ✅          | —            | ✅      |
| 10  | Deliverable approval             | ✅ progress       | ✅ deliverables tab                    | ✅ admin         | ✅          | —            | ✅      |
| 11  | Razorpay payment                 | ✅ payments       | ✅ payments/[id]                       | ✅ payments      | ✅          | ❌           | ⚠️      |
| 12  | Realtime messaging               | ✅ msg+ws         | ✅ messages                            | ✅ messages      | ✅          | —            | ✅      |
| 13  | In-app notifications             | ✅ notifications  | ✅ bell+page                           | —                | ✅          | —            | ✅      |
| 14  | Push notifications               | ✅ push worker    | ⚠️ UI TBD                              | —                | ✅          | —            | ⚠️      |
| 15  | Blog CMS                         | ✅ blog           | ✅ blog pages                          | ✅ content       | ✅          | visual       | ✅      |
| 16  | Portfolio showcase               | ✅ portfolio      | ✅ portfolio                           | ✅ portfolio     | ✅          | visual       | ✅      |
| 17  | Contact inquiry                  | ✅ contact        | ✅ contact                             | ✅ contact       | ✅          | —            | ✅      |
| 18  | Admin impersonation              | ✅ admin          | —                                      | ✅ users/[id]    | ✅          | —            | ✅      |
| 19  | Webhook management               | ✅ webhooks       | —                                      | ✅ integrations  | ✅          | —            | ✅      |
| 20  | Media upload/share               | ✅ media          | ✅ media library                       | ✅ media         | ✅          | —            | ✅      |
| 21  | GDPR user export                 | ✅ outbox queue   | —                                      | ✅ export button | —           | mocked test  | ✅      |
| 22  | OAuth login                      | ❌                | ❌ disabled                            | —                | —           | —            | ❌      |
| 23  | Marketplace UI removed           | —                 | ✅ studio copy; `/freelancers` deleted | —                | —           | —            | ✅      |

---

## 21. Priority Roadmap & Sprint Backlog

### 21.1 P0 — Production Blockers

| #    | Task                         | Repo          | Owner Hint | Acceptance Criteria                                               |
| :--- | :--------------------------- | :------------ | :--------- | :---------------------------------------------------------------- |
| P0-1 | Fix CI OpenAPI script        | Backend       | Platform   | ✅ `pnpm swagger:validate` passes                                 |
| P0-2 | Frontend GitHub Actions      | Frontend      | Platform   | ✅ `.github/workflows/ci.yml` on PR                               |
| P0-3 | Production deploy path       | Backend       | DevOps     | K8s manifests OR documented VPS prod compose + rollback           |
| P0-4 | Payment checkout E2E         | Frontend      | QA         | Playwright spec with mocked Razorpay                              |
| P0-5 | Automate DB migrations in CD | Backend       | DevOps     | CD runs migrate deploy; rolls back on health fail                 |
| P0-6 | GDPR user export             | Backend+Admin | Backend    | ✅ Admin `POST …/export` queues outbox job; UI wired              |
| P0-7 | Marketplace copy removal     | Frontend      | Product    | ✅ §23.2/23.3 copy; `/freelancers` removed; clients-only register |

### 21.2 P1 — Core MVP Gaps

| #    | Task                                                                   | Repo     |
| :--- | :--------------------------------------------------------------------- | :------- |
| P1-1 | Staging environment + CD workflow                                      | Backend  |
| P1-2 | Vitest unit tests (auth, payments, api-client)                         | Frontend |
| P1-3 | Complete Orval React Query migration                                   | Frontend |
| P1-4 | Web push registration UI                                               | Frontend |
| P1-5 | **Remove marketplace UX** — copy audit §23 (web + landing + blog CTAs) | Frontend |
| P1-6 | Rewrite 4 stale service READMEs                                        | Backend  |
| P1-7 | Create 4 missing service READMEs                                       | Backend  |

### 21.3 P2 — Quality & Reliability

| #    | Task                                                |
| :--- | :-------------------------------------------------- |
| P2-1 | Split gateway admin.controller.ts                   |
| P2-2 | Run coverage report; fix packages <80%              |
| P2-3 | Admin POST/PUT API verify scripts                   |
| P2-4 | Landing app E2E smoke                               |
| P2-5 | MSW component test setup                            |
| P2-6 | CodeQL + dependency-review workflows                |
| P2-7 | Wireframe accessibility audit (ARCHITECTURE.md §20) |
| P2-8 | OpenAPI breaking-change diff on PR                  |

### 21.4 P3 — Future Enhancements

| #    | Task                                                                         |
| :--- | :--------------------------------------------------------------------------- |
| P3-1 | OAuth (Google/GitHub)                                                        |
| P3-2 | ~~Freelancer public profiles directory~~ **CANCELLED** — wrong product model |
| P3-3 | Full K8s + Terraform (§7)                                                    |
| P3-4 | Prometheus/Grafana/Jaeger stack                                              |
| P3-5 | Meilisearch-powered search UI                                                |
| P3-6 | Mobile-web fourth app                                                        |
| P3-7 | RSC optimization pass                                                        |
| P3-8 | Canary deployments                                                           |
| P3-9 | Remote Turbo cache for CI                                                    |

### 21.5 Sprint-Ready User Stories (Next 2 Weeks)

**Story 1 — Fix Backend CI Pipeline**  
As a developer, CI must pass OpenAPI validation so PRs are not blocked.  
Acceptance: Add `"swagger:validate": "pnpm openapi:lint"` to backend `package.json`; CI green on `main`.

**Story 2 — Frontend CI Workflow**  
As a developer, I want automated frontend checks on every PR.  
Acceptance: `.github/workflows/ci.yml` runs lint, type-check, build, contract:check.

**Story 3 — Payment Checkout E2E**  
As QA, I want a Playwright test for Razorpay checkout to catch regressions.  
Acceptance: `apps/web/tests/e2e/payment-checkout.mocked.spec.ts` passes in CI.

**Story 4 — GDPR User Export**  
As an admin, I need to export user data for compliance requests.  
Acceptance: `POST /admin/users/:id/export` queues job; email worker sends link; admin UI triggers export successfully.

**Story 5 — Vitest Foundation**  
As a developer, I want unit tests on critical hooks so refactors are safe.  
Acceptance: ≥10 Vitest tests in auth + payments features; `pnpm test` passes in web app.

**Story 6 — Single-Freelancer Copy Realignment**  
As a client visiting the site, I should understand Nestlancer is one studio serving clients — not a freelancer marketplace.  
Acceptance: §23.1 checklist complete; `/freelancers` routes removed; homepage hero/process/stats updated; register says clients only.

---

## 22. Appendix

### 22.1 File Inventory

| Category                   | Backend             | Frontend     |
| :------------------------- | :------------------ | :----------- |
| Microservices / apps       | 16 + 2 gateways     | 3 apps       |
| Workers / packages         | 8 workers + 24 libs | 14 packages  |
| Unit/integration specs     | 561                 | 0            |
| Playwright E2E specs       | —                   | 9            |
| App Router pages           | —                   | 83           |
| Web feature source files   | —                   | 130          |
| Admin feature source files | —                   | 48           |
| Markdown documentation     | 91                  | 85           |
| UI wireframes              | —                   | 71           |
| OpenAPI paths              | 438                 | 438 (synced) |
| Prisma models              | 50                  | —            |
| Generated api-client files | —                   | 2,672        |

### 22.2 Doc/Code Drift Register

| #   | Doc Says                                             | Code Reality                     | Action                               |
| :-- | :--------------------------------------------------- | :------------------------------- | :----------------------------------- |
| 1   | Prisma 5.x (README)                                  | Prisma 7.4.1                     | ✅ README updated                    |
| 2   | `.github/workflows/`                                 | `approx.github/workflows/`       | Relocate or document                 |
| 3   | `docker-compose.yml` exists                          | Missing                          | Create or remove refs                |
| 4   | `deploy/kubernetes/` exists                          | Directory absent                 | Implement §7 or mark 🔮              |
| 5   | 401 tracker items `[x]` for K8s                      | None exist                       | This tracker corrects status         |
| 6   | 428+ endpoints                                       | 438 paths                        | Update CHANGELOG                     |
| 7   | Auth port 3011 (overview.md)                         | 3001 in compose                  | Fix port table                       |
| 8   | Orval blog-only pilot (ARCHITECTURE.md)              | 14 React Query tags              | Update ARCHITECTURE.md               |
| 9   | Frontend CI in ARCHITECTURE.md                       | Husky only                       | Implement or update doc              |
| 10  | progress/messaging/notifications/media README        | Stale copies                     | Rewrite                              |
| 11  | Wireframes describe "marketplace" / FREELANCER users | Single ADMIN + many USER clients | Update wireframes + ARCHITECTURE.md  |
| 12  | Frontend types include `freelancer` role             | Backend only USER + ADMIN        | Align `@nestlancer/types`            |
| 13  | Register: "client or freelancer"                     | Clients only on web portal       | ✅ register + auth-portal-copy fixed |

### 22.3 Open Questions / NEEDS VERIFICATION

1. Run `pnpm test:cov` — which packages fall below 80% threshold?
2. Is web push UI wired to `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`?
3. Does blog/portfolio search use Meilisearch or DB-only?
4. Is current VPS CD targeting production or dev-only?
5. Do `ChunkedUploadSession` and `QuoteLineItem` models exist or were merged?
6. Does admin impersonation UI work end-to-end against live gateway?
7. Run `pnpm contract:check` in both repos against live gateway — any drift?
8. Should `packages/types` and OpenAPI DTO copy drop legacy `freelancer` / `FREELANCER` wording?

### 22.4 Wireframe Index (71 files)

All under `nestlancer-frontend/docs/architecture/diagrams/wireframes/`:

**Public (12):** homepage, blog/_, portfolio/_, contact, legal-static-pages, authentication-pages/\* (7)

**User dashboard (25+):** dashboard-home, project-requests/_, quotes/_, projects/_ (6 tabs), payments/_, messaging/_, notifications/_, account-settings/\* (4 tabs), media-library, blog/bookmarks

**Admin (25+):** dashboard/_, user-management/_, requests-admin, quotes-admin, projects-admin, payments-admin, messages-admin, portfolio-admin, blog-management/_, contact-inquiries, audit-logs, webhooks-management, system-configuration/_, impersonation, media-admin, notifications-admin/\*, progress-and-milestones-admin

---

## 23. Product Model Alignment — Copy & UX Audit

**Problem:** Much of the frontend was scaffolded as a **freelancer marketplace** (many freelancers, client picks talent). The actual product is **one ADMIN operator (the freelancer) + many USER clients**. The tracker previously listed "build freelancer directory" — that was **incorrect** and is **cancelled**.

### 23.1 Correct vs Incorrect Assumptions

| Area                  | Correct (single studio)                        | Incorrect (still in repo)                                  |
| :-------------------- | :--------------------------------------------- | :--------------------------------------------------------- |
| Roles                 | `ADMIN` = the freelancer; `USER` = client      | `freelancer` in types, wireframes, admin table role checks |
| Web registration      | Clients only                                   | Register subtitle: "client or freelancer"                  |
| Public marketing      | Hire **this studio**, browse **our** portfolio | "Connect with elite freelancers", talent cards, directory  |
| Quotes                | Admin sends quote to client                    | "Freelancers respond with quotes" (homepage step 2)        |
| Portfolio             | Admin's case studies                           | OK — keep, reframe copy as studio work                     |
| `/freelancers` routes | **Remove**                                     | Placeholder "directory" + "Join as a freelancer"           |
| Admin app             | Operator console for the one freelancer        | OK — "operator" naming is fine                             |
| Blog CTAs             | Contact / post a request                       | Links to `/freelancers`                                    |

### 23.2 Copy Audit Checklist (Web App — `apps/web`)

| #   | File                                                          | Current problem                                                                   | Action                                                                 | Status   |
| :-- | :------------------------------------------------------------ | :-------------------------------------------------------------------------------- | :--------------------------------------------------------------------- | :------- | ----------------------------- | --- |
| 1   | `apps/web/src/app/(public)/page.tsx`                          | Hero: "elite freelancers"; TALENT_CARDS grid; marketplace stats                   | Rewrite hero for studio; remove talent cards; fix PROCESS_STEPS step 2 | ❌       |
| 2   | `apps/web/src/features/marketing/homepage-static.ts`          | Fake marketplace stats (1% acceptance, 30k clients); step 2 "freelancers respond" | Replace with studio metrics; admin sends quote                         | ❌       |
| 3   | `apps/web/src/app/(auth)/register/page.tsx`                   | "Join as a client or freelancer"                                                  | "Create your client account"                                           | ❌       |
| 4   | `packages/constants/src/auth-portal-copy.ts`                  | Login: "clients and freelancers"                                                  | "Clients only — operators use admin console"                           | ❌       |
| 5   | `apps/web/src/app/layout.tsx`                                 | Meta: "Hire vetted freelancers"                                                   | Studio-focused description                                             | ❌       |
| 6   | `apps/web/src/app/(public)/blog/page.tsx`                     | "freelancer spotlights", "freelancer wisdom"                                      | Client + studio thought leadership                                     | ❌       |
| 7   | `apps/web/src/features/blog/components/BlogHireCta.tsx`       | Links to `routes.freelancers`                                                     | Link to `/contact` or `/register`                                      | ❌       |
| 8   | `apps/web/src/features/blog/components/BlogNewsletterCta.tsx` | "Ideas for freelancers and product teams"                                         | "Ideas for product teams" or studio newsletter                         | ❌       |
| 9   | `apps/web/src/app/(public)/freelancers/page.tsx`              | Entire directory page                                                             | **Delete route** + remove from nav                                     | ❌       |
| 10  | `apps/web/src/app/(public)/freelancers/[username]/page.tsx`   | Profile placeholder                                                               | **Delete route**                                                       | ❌       |
| 11  | `packages/constants/src/routes.ts`                            | `freelancers`, `freelancer()`                                                     | Remove or deprecate constants                                          | ❌       |
| 12  | `packages/auth/src/middleware.ts`                             | Public path `/freelancers`                                                        | Remove after route deletion                                            | ❌       |
| 13  | `apps/web/src/app/(public)/privacy/page.tsx`                  | "client and freelancer profiles"                                                  | "client and service provider"                                          | ❌       |
| 14  | `apps/web/src/app/(public)/terms/page.tsx`                    | Section "Freelancer and Client Obligations"                                       | "Client and Service Provider" (single provider)                        | ❌       |
| 15  | `packages/types/src/user-role.ts`                             | Maps `FREELANCER` role                                                            | Remove legacy mapping; USER + ADMIN only                               | ❌       |
| 16  | `packages/types/src/api/auth.ts`                              | `role: 'client'                                                                   | 'freelancer'                                                           | 'admin'` | Align with backend USER/ADMIN | ❌  |

| 17 | `apps/web/src/app/(public)/page.tsx` (hero h1) | "Hire vetted talent"; hero card "Top 1%" | Studio-focused headline; remove marketplace vetting stats | ❌ |
| 18 | `apps/web/src/app/(public)/page.tsx` (sections) | "Meet talent in our network"; "World-class talent across disciplines" | Reframe as studio capabilities / services | ❌ |
| 19 | `packages/constants/src/auth-portal-copy.ts` (admin) | "Client or freelancer?" footer on admin login | "Client account?" — clients use web portal | ❌ |
| 20 | `apps/admin/src/components/admin/AdminTableViews.tsx` | Checks for `FREELANCER` role badge | USER (client) + ADMIN only | ❌ |
| 21 | `packages/types/src/api/quotes.ts` | `freelancerId` field name | Rename to `providerId` or align with backend DTO (verify OpenAPI) | ⚠️ |
| 22 | `docs/architecture/dir-structure.md` | Lists `freelancers/` route folder | Remove after route deletion | ❌ |

### 23.3 Copy Audit Checklist (Landing — `apps/landing`)

| #   | File                                                    | Problem                         | Action                             | Status |
| :-- | :------------------------------------------------------ | :------------------------------ | :--------------------------------- | :----- |
| 1   | `apps/landing/src/components/marketing/HeroSection.tsx` | "curated freelancers"           | Single studio messaging            | ✅     |
| 2   | `apps/landing/src/app/layout.tsx`                       | Meta: "Hire elite freelancers"  | Studio meta description            | ✅     |
| 3   | `apps/landing/src/app/about/page.tsx`                   | "hire vetted freelancers"       | About the studio / operator        | ✅     |
| 4   | `apps/landing/src/app/pricing/page.tsx`                 | "freelancer commission" framing | Client pricing for studio services | ✅     |

### 23.4 Backend / API Copy (lower priority — OpenAPI strings)

| Location                 | Issue                         | Action                                            | Status |
| :----------------------- | :---------------------------- | :------------------------------------------------ | :----- |
| `progress` DTOs          | "feedback for the freelancer" | "feedback for the service provider" or "provider" | ⚠️     |
| `payment-disputes` admin | "freelancer or platform"      | "provider or platform"                            | ⚠️     |
| Analytics worker tests   | `FREELANCER` role in fixtures | Use USER/ADMIN only                               | ⚠️     |
| Notification segment DTO | `FREELANCER` role example     | Remove example                                    | ⚠️     |

### 23.5 Documentation & Wireframes to Update

| Doc                                                                         | Issue                                           | Action                             |
| :-------------------------------------------------------------------------- | :---------------------------------------------- | :--------------------------------- |
| `docs/architecture/ARCHITECTURE.md`                                         | Routes `/freelancers`, freelancer role in types | Rewrite for single-studio model    |
| `docs/architecture/diagrams/wireframes/theme.md`                            | "creative marketplace" vibe                     | "Client portal + operator console" |
| `docs/architecture/diagrams/wireframes/admin/user-management/users-list.md` | FREELANCER role column                          | USER (client) + ADMIN only         |
| `docs/web-ui-migration-inventory.md`                                        | Lists freelancers routes                        | Mark removed                       |

### 23.6 Sub-todos — Product Alignment (Priority)

- [x] ✅ **P0/P1:** Complete §23.2 items 1–22 (web copy + remove `/freelancers` + admin/types cleanup)
- [x] ✅ Complete §23.3 landing copy (items 1–3)
- [x] ✅ Update legal pages (privacy, terms) for single provider
- [x] ⚠️ Clean legacy `freelancer` from `@nestlancer/types` (auth role union; `freelancerId` in quotes.ts remains)
- [ ] ⚠️ Refresh wireframes/docs (§23.5) — do not implement marketplace features from old wireframes
- [ ] ✅ **Keep:** Portfolio (admin showcase), blog, client dashboard, admin operator console, request→quote→project flow

### 23.7 What We Missed in the First Tracker Draft

| Miss                                                   | Why it matters                                                      |
| :----------------------------------------------------- | :------------------------------------------------------------------ |
| No §0 product model                                    | Led to wrong todos (build freelancer directory)                     |
| Marketplace copy treated as minor                      | Actually **product-incorrect** across homepage, auth, blog, landing |
| `UserRole` USER/ADMIN not highlighted                  | Hidden that FREELANCER is legacy frontend-only                      |
| Register flow not flagged                              | Says "client or freelancer" but only clients should register on web |
| Homepage TALENT_CARDS / fake stats                     | Entire sections imply multi-freelancer marketplace                  |
| Landing app not in copy audit                          | Same marketplace messaging as web                                   |
| Backend OpenAPI "freelancer" strings                   | Minor but should align over time                                    |
| Admin login footer "Client or freelancer?"             | Implies freelancers register on web                                 |
| Homepage sections "Meet talent" / "World-class talent" | Multi-talent network, not single studio                             |
| `freelancerId` in quote types                          | Legacy marketplace naming                                           |
| AdminTableViews FREELANCER role                        | Frontend-only role not in backend                                   |

### 22.5 Superseded Documents

This tracker **replaces and supersedes**:

- `nestlancer-backend-api/reference-docs/401-project-tracker.md` (deleted)
- Any prior `MASTER-IMPLEMENTATION-TRACKER.md` drafts

**Maintenance:** Re-run audit after each sprint. Update statuses only when evidence changes.

---

_End of Nestlancer Master Project Implementation Tracker_
