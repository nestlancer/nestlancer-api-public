## 📖 Table of Contents

- [Test pyramid (overview)](#test-pyramid-overview)
- [Root commands](#root-commands)
- [Services (`services/*`)](#services-services)
- [Workers (`workers/*`)](#workers-workers)
- [🌐 Gateways](#gateways)
- [Shared libraries (`libs/*`)](#shared-libraries-libs)
- [Turbo task wiring](#turbo-task-wiring)
- [Environment expectations](#environment-expectations)
- [Recent hardening (reference)](#recent-hardening-reference)
- [System smoke suite (`tests/system/`)](#system-smoke-suite-testssystem)
- [Summary counts](#summary-counts)

---

## Test pyramid (overview)

| Layer           | Purpose                                             | Typical scope                                                                |
| :-------------- | :-------------------------------------------------- | :--------------------------------------------------------------------------- |
| **Unit**        | Fast, isolated logic                                | Controllers/services with mocks; pure libs                                   |
| **Integration** | Real Nest modules, DB/Redis/Rabbit where configured | `AppModule`, Prisma, caches, queues (often against `.env.e2e` / local infra) |
| **E2E**         | HTTP or worker bootstrap + realistic flows          | Supertest against live app; worker smoke + mocked/external collaborators     |

Tests live **inside each package** (`tests/unit`, `tests/integration`, `e2e/`). The root orchestrates everything via **Turborepo**.

---

## Root commands

From the repo root:

| Command                  | What it runs                                                                                                                                        |
| :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`              | Turbo `test` (package default test scripts)                                                                                                         |
| `pnpm test:unit`         | All packages that define `test:unit`                                                                                                                |
| `pnpm test:integration`  | All packages that define `test:integration`                                                                                                         |
| `pnpm test:e2e`          | All packages that define `test:e2e`, **`--concurrency=1`** (see below)                                                                              |
| `pnpm test:e2e:parallel` | Same as `test:e2e` but **parallel** Turbo tasks (faster, risky on one DB)                                                                           |
| `pnpm test:e2e:docker`   | Shell-driven E2E (`scripts/test/run-e2e.sh`)                                                                                                        |
| `pnpm test:system`       | Cross-cutting **system smoke suite** (`tests/system/`) — requires live gateway, ws-gateway, and infra (see [`docs/system-e2e.md`](./system-e2e.md)) |
| `pnpm test:cov`          | Coverage via Turbo `test:cov`                                                                                                                       |

**E2E concurrency:** Many services seed or upsert data in E2E setup against a **shared Postgres**. Running Turbo with default parallelism can cause **`deadlock detected`** during parallel seeds. The default `pnpm test:e2e` uses **`turbo test:e2e --concurrency=1`** so packages run one at a time (full suite ~10–12 minutes depending on hardware).

---

## Services (`services/*`)

Each application service uses the same npm script pattern:

- **`test:unit`** — `jest --testPathPattern=tests/unit`
- **`test:integration`** — `jest --testPathPattern=tests/integration`
- **`test:e2e`** — `jest --config e2e/jest.e2e.config.ts --runInBand`

| Package                             | Unit | Integration | E2E |
| ----------------------------------- | :--: | :---------: | :-: |
| `@nestlancer/admin-service`         |  ✓   |      ✓      |  ✓  |
| `@nestlancer/auth-service`          |  ✓   |      ✓      |  ✓  |
| `@nestlancer/blog-service`          |  ✓   |      ✓      |  ✓  |
| `@nestlancer/contact-service`       |  ✓   |      ✓      |  ✓  |
| `@nestlancer/health-service`        |  ✓   |      ✓      |  ✓  |
| `@nestlancer/media-service`         |  ✓   |      ✓      |  ✓  |
| `@nestlancer/messaging-service`     |  ✓   |      ✓      |  ✓  |
| `@nestlancer/notifications-service` |  ✓   |      ✓      |  ✓  |
| `@nestlancer/payments-service`      |  ✓   |      ✓      |  ✓  |
| `@nestlancer/portfolio-service`     |  ✓   |      ✓      |  ✓  |
| `@nestlancer/progress-service`      |  ✓   |      ✓      |  ✓  |
| `@nestlancer/projects-service`      |  ✓   |      ✓      |  ✓  |
| `@nestlancer/quotes-service`        |  ✓   |      ✓      |  ✓  |
| `@nestlancer/requests-service`      |  ✓   |      ✓      |  ✓  |
| `@nestlancer/users-service`         |  ✓   |      ✓      |  ✓  |
| `@nestlancer/webhooks-service`      |  ✓   |      ✓      |  ✓  |

**Count:** 16 services, all three layers present.

---

## Workers (`workers/*`)

Workers follow the same three-script pattern as services.

| Package                           | Unit | Integration | E2E |
| --------------------------------- | :--: | :---------: | :-: |
| `@nestlancer/analytics-worker`    |  ✓   |      ✓      |  ✓  |
| `@nestlancer/audit-worker`        |  ✓   |      ✓      |  ✓  |
| `@nestlancer/cdn-worker`          |  ✓   |      ✓      |  ✓  |
| `@nestlancer/email-worker`        |  ✓   |      ✓      |  ✓  |
| `@nestlancer/media-worker`        |  ✓   |      ✓      |  ✓  |
| `@nestlancer/notification-worker` |  ✓   |      ✓      |  ✓  |
| `@nestlancer/outbox-poller`       |  ✓   |      ✓      |  ✓  |
| `@nestlancer/webhook-worker`      |  ✓   |      ✓      |  ✓  |

**Count:** 8 workers, all three layers present.

---

## 🌐 Gateways

| Package                          | Unit | Integration | E2E |
| -------------------------------- | :--: | :---------: | :-: |
| `gateway` (HTTP API gateway)     |  ✓   |      ✓      |  ✓  |
| `ws-gateway` (WebSocket gateway) |  ✓   |      ✓      |  ✓  |

---

## Shared libraries (`libs/*`)

Libraries generally expose **`test:unit`** and **`test:integration`** only. There is **no per-library `test:e2e`** script; E2E coverage for domain behavior is exercised through **services and workers**.

| Library area      | Packages (examples)                                                                                                                                                                                            |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Infrastructure    | `@nestlancer/database`, `@nestlancer/cache`, `@nestlancer/queue`, `@nestlancer/logger`, `@nestlancer/metrics`, `@nestlancer/config`, `@nestlancer/tracing`                                                     |
| Domain / security | `@nestlancer/common`, `@nestlancer/auth-lib`, `@nestlancer/crypto`, `@nestlancer/middleware`, `@nestlancer/idempotency`, `@nestlancer/outbox`                                                                  |
| Product features  | `@nestlancer/mail`, `@nestlancer/pdf`, `@nestlancer/storage`, `@nestlancer/search`, `@nestlancer/websocket`, `@nestlancer/turnstile`, `@nestlancer/audit`, `@nestlancer/alerts`, `@nestlancer/circuit-breaker` |
| Test utilities    | `@nestlancer/testing` (shared mocks such as UUID helpers for Jest)                                                                                                                                             |
| Health            | `@nestlancer/health-lib`                                                                                                                                                                                       |

**Note:** `@nestlancer/common` lists unit + integration only (no E2E script), which matches the pattern above.

---

## Turbo task wiring

`turbo.json` declares `test:unit`, `test:integration`, and `test:e2e` with `dependsOn: ["build"]` so artifacts compile before tests. E2E tasks have caching disabled (`cache: false`) so runs reflect the current tree and environment.

---

## Environment expectations

- **Integration / E2E** often load **`.env.e2e`** (see package `e2e/setup.ts` or integration helpers) and expect **Postgres**, **Redis**, **RabbitMQ**, and sometimes **object storage** endpoints to match that configuration.
- Services using **read replicas** (`DATABASE_READ_URL` / `DATABASE_READ_REPLICA_URLS`) must be exercised so **write-then-read** flows hit the primary where the product requires read-your-writes semantics (otherwise E2E can show 404s or wrong business codes).

---

## Recent hardening (reference)

Work on this codebase has included:

- Aligning **critical reads after writes** with the **primary** Prisma client where replica lag broke E2E.
- Fixing **worker E2E harnesses** (mocks for mail, cache, AMQP channel, CDN providers, Jest `uuid` mapping, etc.).
- Setting **default E2E Turbo concurrency to 1** to avoid **database deadlocks** during parallel package seeds.

---

## System smoke suite (`tests/system/`)

A **cross-cutting layer** added on top of the per-package E2E suites. Targets the whole platform running together rather than individual services in isolation.

| Spec file                                  | Coverage                                                                                       |
| :----------------------------------------- | :--------------------------------------------------------------------------------------------- |
| `gateway-health-and-routing.smoke.spec.ts` | Gateway health endpoints · 404 routing · JWT auth guard wiring                                 |
| `platform-wiring.smoke.spec.ts`            | Postgres connectivity · Redis PING · RabbitMQ connect+channel · WS gateway Socket.io handshake |

Command: `pnpm test:system`

Full prerequisites and CI ordering: **[`docs/system-e2e.md`](./system-e2e.md)**

---

## Summary counts

| Area     | Packages with `test:unit` | With `test:integration` | With `test:e2e`      |
| :------- | :------------------------ | :---------------------- | :------------------- |
| Services | 16                        | 16                      | 16                   |
| Workers  | 8                         | 8                       | 8                    |
| Gateways | 2                         | 2                       | 2                    |
| Libs     | Many                      | Many                    | — (covered via apps) |

**Total application packages with full unit + integration + E2E:** 26 (16 + 8 + 2).

---

_Generated for the Nestlancer backend monorepo. Update this file when packages or scripts change._
