## 📖 Table of Contents

- [What is covered](#what-is-covered)
- [What is NOT covered](#what-is-not-covered)
- [Remote infra, local Jest (typical dev setup)](#remote-infra-local-jest-typical-dev-setup)
- [Prerequisites](#prerequisites)
- [Running the suite](#running-the-suite)
- [Environment variables](#environment-variables)
- [CI ordering](#ci-ordering)
- [Error messages guide](#error-messages-guide)
- [Next iterations](#next-iterations)

---

## What is covered

| Check                                                        | Spec file                                  | Requires                          |
| :----------------------------------------------------------- | :----------------------------------------- | :-------------------------------- |
| Gateway is up and serving (`/health`, `/health/live`)        | `gateway-health-and-routing.smoke.spec.ts` | `gateway` process                 |
| Unknown routes return 404 with structured error body         | same                                       | `gateway` process                 |
| JWT auth guard rejects unauthenticated calls (401)           | same                                       | `gateway` process                 |
| JWT auth guard allows authenticated calls through            | same                                       | `gateway` process                 |
| Postgres primary reachable (`SELECT 1`)                      | `platform-wiring.smoke.spec.ts`            | Postgres at `DATABASE_URL`        |
| Redis cache reachable (`PING`)                               | same                                       | Redis at `REDIS_CACHE_URL`        |
| RabbitMQ broker reachable (connect + channel)                | same                                       | RabbitMQ at `RABBITMQ_URL`        |
| WS gateway: authenticated Socket.io handshake on `/messages` | same                                       | `ws-gateway` process at `WS_PORT` |
| WS gateway: unauthenticated connection rejected              | same                                       | `ws-gateway` process at `WS_PORT` |

---

## What is NOT covered

- Full proxy routing through gateway to all 16 upstream services (covered in `gateway/e2e`).
- Business logic flows — signup, project creation, payments, etc. (covered in per-service E2E).
- Rate limiting (covered in `gateway/e2e/rate-limiting.e2e-spec.ts`).
- Worker message processing end-to-end (covered in per-worker E2E suites).
- Read-replica lag behavior (covered in integration tests for services that use `DATABASE_READ_URL`).

---

## Remote infra, local Jest (typical dev setup)

If **Postgres, Redis, and RabbitMQ** are on another machine and their URLs are already in `.env.e2e`, you do **not** need `docker compose up postgres redis rabbitmq` on the laptop running tests.

You still need the **gateway** and **ws-gateway** processes reachable from that laptop. Point the suite at them with either full URLs or host + port:

```bash
# In .env.e2e (or export in the shell before pnpm test:system)
GATEWAY_URL=http://<tailscale-or-lan-ip>:4000
WS_GATEWAY_URL=http://<tailscale-or-lan-ip>:4100
```

If those processes are **not** running anywhere, the HTTP and WebSocket smoke tests will fail with a clear “not reachable” message — that is expected until you start the gateways on the target host.

---

## Prerequisites

### 1. Infrastructure

All infra must be running and reachable at the addresses in `.env.e2e`:

```
Postgres   DATABASE_URL          (primary, port 5434 in default .env.e2e)
Redis      REDIS_CACHE_URL       (port 6381, db 13)
RabbitMQ   RABBITMQ_URL          (port 5673, vhost /nestlancer)
```

Using Docker Compose (recommended):

```bash
# Bring up only the infra services (no app containers required for infra tests)
docker compose -f docker-compose.dev.yml up -d postgres redis rabbitmq
```

### 2. Migrations & seeds

```bash
pnpm db:bootstrap          # generate, deploy migrations, then seed/seed.sh (core + content)
```

### 3. Application processes

The gateway smoke tests (`gateway-health-and-routing.smoke.spec.ts`) require the **gateway** to be running:

```bash
# In a separate terminal
pnpm --filter gateway dev   # or docker compose up gateway
```

The WS connectivity smoke test requires **ws-gateway**:

```bash
pnpm --filter ws-gateway dev   # or docker compose up ws-gateway
```

> **Tip:** The infra checks (Postgres, Redis, RabbitMQ) in `platform-wiring.smoke.spec.ts` do NOT need any application process to be up — they connect to infra directly.

---

## Running the suite

```bash
# From the repo root, after all prerequisites above are met
pnpm test:system
```

Internally this runs:

```
jest --config tests/system/jest.system.config.ts --runInBand
```

`--runInBand` is intentional: the smoke tests share infra state (Redis DB, Postgres primary) and have no benefit from parallelism.

---

## Environment variables

The suite loads `.env.e2e` from the repo root via `tests/system/setup/env.ts` (registered as a Jest `setupFiles` entry). Variables already set in the shell take precedence (useful for CI secrets).

### Required (test will fail fast with a clear message if absent)

| Variable            | Description                                       |
| :------------------ | :------------------------------------------------ |
| `DATABASE_URL`      | Postgres primary connection string                |
| `REDIS_CACHE_URL`   | Redis cache URL                                   |
| `RABBITMQ_URL`      | RabbitMQ AMQP URL                                 |
| `JWT_ACCESS_SECRET` | Secret for signing / verifying JWTs in auth smoke |

### Optional overrides (with defaults)

| Variable         | Default     | Effect                                                                                                                                                                                                                                                                |
| :--------------- | :---------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GATEWAY_URL`    | _(unset)_   | Full HTTP base for the API gateway, e.g. `http://100.x.x.x:4000`. When set, overrides `GATEWAY_HOST` / `GATEWAY_PORT`. Use when Postgres/Redis/RabbitMQ run remotely **and** the gateway runs on that same (or another) host — not on the machine where you run Jest. |
| `GATEWAY_PORT`   | `4000`      | Port where the HTTP gateway listens                                                                                                                                                                                                                                   |
| `GATEWAY_HOST`   | `localhost` | Host for the HTTP gateway                                                                                                                                                                                                                                             |
| `WS_GATEWAY_URL` | _(unset)_   | Full Socket.io base URL, e.g. `http://100.x.x.x:4100`. When set, overrides `WS_HOST` / `WS_PORT`.                                                                                                                                                                     |
| `WS_PORT`        | `4100`      | Port where the WS gateway listens                                                                                                                                                                                                                                     |
| `WS_HOST`        | `localhost` | Host for the WS gateway                                                                                                                                                                                                                                               |

**Never commit secrets.** `.env.e2e` is git-ignored. The docs above list only variable _names_.

---

## CI ordering

The system smoke suite should run **after** per-package E2E (`pnpm test:e2e`) because:

1. Migrations (`pnpm db:bootstrap`) must complete before Postgres can serve queries.
2. The gateway and ws-gateway must be built (`pnpm build`) before they can start.

Suggested CI sequence:

```yaml
- run: pnpm db:bootstrap
- run: pnpm test:e2e # per-package E2E (concurrency=1)
- run: pnpm test:system # system smoke (requires gateway + ws-gateway running)
```

If the infra supports running both suites simultaneously (separate DB schemas), they can run in parallel — but the gateway and ws-gateway must be up before `test:system` starts.

---

## Error messages guide

| Error                                                  | Meaning                            | Fix                                               |
| :----------------------------------------------------- | :--------------------------------- | :------------------------------------------------ |
| `Missing required environment variables: DATABASE_URL` | `.env.e2e` not found or incomplete | Check `.env.e2e` exists at repo root              |
| `Gateway is not reachable at http://localhost:4000`    | Gateway process not running        | Start gateway (`pnpm --filter gateway dev`)       |
| `Cannot connect to Postgres at DATABASE_URL`           | DB unreachable                     | Start Postgres, check `DATABASE_URL`              |
| `Cannot connect to Redis at REDIS_CACHE_URL`           | Redis unreachable                  | Start Redis, check `REDIS_CACHE_URL`              |
| `Cannot connect to RabbitMQ at RABBITMQ_URL`           | Broker unreachable                 | Start RabbitMQ, check `RABBITMQ_URL`              |
| `WebSocket connection … timed out`                     | WS gateway not running             | Start ws-gateway (`pnpm --filter ws-gateway dev`) |

---

## Next iterations

- **Deeper routing smoke**: once all 16 services are containerised, add one authenticated round-trip per service via the gateway (requires full docker-compose stack).
- **Worker consume proof**: publish a test event and assert the audit-worker's `createMany` is called — possible with in-process bootstrap of the audit-worker module (mirrors its existing per-package E2E, with a real AMQP channel).
- **Redis pub/sub**: verify the WS gateway's `RedisSubscriberService` receives a message published on the pub/sub URL (`REDIS_PUBSUB_URL`) — proves end-to-end notification routing.
- **Read-replica lag**: if `DATABASE_READ_URL` is configured and differs from `DATABASE_URL`, assert that a write followed by a read-with-write-client returns the new value.
