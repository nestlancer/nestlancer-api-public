## 📖 Table of Contents

- [1. Project Context](#1-project-context)
- [2. Test Layout](#2-test-layout)
- [3. Environment Prerequisites](#3-environment-prerequisites)
- [4. Run the Smoke Suite](#4-run-the-smoke-suite)
- [5. Interpreting Failures](#5-interpreting-failures)
- [6. Files You May Need to Edit](#6-files-you-may-need-to-edit)
- [7. Adding a New Smoke Test](#7-adding-a-new-smoke-test)
- [8. Success Criteria](#8-success-criteria)

---

## 1. Project Context

Nestlancer is a **pnpm + Turborepo monorepo** whose runtime stack is:

| Layer                       | Port       | Description                                                               |
| :-------------------------- | :--------- | :------------------------------------------------------------------------ |
| API Gateway                 | 4000       | Single HTTP entry-point, global prefix `/api/v1`                          |
| WS Gateway                  | 4100       | Socket.IO real-time layer                                                 |
| 16 microservices            | (internal) | auth, users, payments, … health                                           |
| 8 workers                   | (internal) | analytics, audit, cdn, email, media, notification, outbox-poller, webhook |
| PostgreSQL, Redis, RabbitMQ | (internal) | shared infrastructure                                                     |

**Important gateway behaviour:** The gateway wraps every upstream response —
including 4xx/5xx — inside an HTTP **200** envelope:

```json
{ "status": "success", "data": { "status": "error", "error": { "code": "AUTH_001", … } } }
```

Smoke tests account for this by defaulting `status = 0` when axios throws. The
`resolveStatus(httpStatus, body)` utility in `tests/system/setup/http.ts`
unwraps the envelope when you need a real status code.

---

## 2. Test Layout

```
tests/system/
├── smoke/
│   ├── infra/      platform-wiring + gateway routing
│   ├── services/   one file per service  (*.smoke.spec.ts)
│   └── workers/    workers-wiring.smoke.spec.ts
├── e2e/            (separate — do NOT touch here)
└── setup/
    ├── auth.ts     mintSystemToken(), bearerToken()
    ├── env.ts      loads .env.e2e before tests
    └── http.ts     getApiBase(), getGatewayUrl(), resolveStatus()
```

Smoke tests verify **three things only**:

1. The service is reachable (HTTP connection succeeds, no ECONNREFUSED).
2. Auth-guarded endpoints reject unauthenticated requests (0 / 401 / 403 / 404 accepted).
3. At least one authenticated request passes the auth layer.

They do **not** assert business logic or exact payloads.

---

## 3. Environment Prerequisites

Before running, confirm:

```bash
# All containers must be Up and healthy
docker ps --format "table {{.Names}}\t{{.Status}}" | grep nl-e2e

# .env.e2e must exist at repo root
ls .env.e2e
```

Key env vars (from `.env.e2e`):

- `GATEWAY_URL` / `GATEWAY_PORT` — defaults to `localhost:4000`
- `WS_PORT` — defaults to `4100`
- `RABBITMQ_URL` — full amqp:// URL including vhost
- `JWT_ACCESS_SECRET`, `JWT_ISSUER` — used by `mintSystemToken()`

---

## 4. Run the Smoke Suite

```bash
pnpm test:system:smoke
```

Targeted subsets:

```bash
# Only infrastructure smoke tests
pnpm test:system -- --testPathPattern=smoke/infra

# Only a specific service
pnpm test:system -- --testPathPattern=smoke/services/auth

# Only workers wiring
pnpm test:system -- --testPathPattern=smoke/workers
```

---

## 5. Interpreting Failures

### 5a. "Cannot find module '../setup/http'"

**Cause:** Relative import path is wrong — file moved without updating imports.
**Fix:** Check the file's location in `smoke/`. All smoke service files live at
`smoke/services/`, two levels from `setup/`, so imports must be:

```typescript
import { getApiBase } from '../../setup/http';
import { bearerToken } from '../../setup/auth';
```

Infra files at `smoke/infra/` also use `'../../setup/...'`.

### 5b. "Test suite failed to run — ECONNREFUSED"

**Cause:** The target service container is not running.
**Fix:** Start the e2e stack:

```bash
pnpm docker:e2e:up
# or
docker compose -f docker-compose.e2e.yml up -d
```

Then wait for the gateway health check:

```bash
curl http://localhost:4000/api/v1/health/live
```

### 5c. Auth enforcement test fails — received 200 when expecting 401/403

**Cause:** The gateway wraps all responses as HTTP 200 (see §1).
Smoke tests use a catch-based pattern that defaults `status = 0` when axios
throws (which it does on real 4xx), so `0` is always in the accepted array.
If a smoke test fails on auth, the most likely cause is the URL being hit is
**wrong** (returning 200 legitimately — e.g., a public endpoint).
**Fix:** Verify the endpoint path against the service controller. Check
`gateway/src/` proxy config for path-rewriting rules. Common pattern:

- `/api/v1/users/…` → strips `/users`, forwards to users service as `/api/v1/…`

### 5d. Workers wiring test warns "Exchange 'events' not found"

**Cause:** The exchange name in `.env.e2e` is `events.e2e`, not `events`.
The smoke test tolerates this (warns, does not fail). If a hard failure occurs:

```bash
# Check the exchange name configured
grep RABBITMQ_EXCHANGE_EVENTS .env.e2e
# Should output: RABBITMQ_EXCHANGE_EVENTS=events.e2e
```

The workers e2e spec uses `process.env.RABBITMQ_EXCHANGE_EVENTS ?? 'events'`
for all exchange references.

### 5e. JWT-authenticated request returns 401 or 403 unexpectedly

**Cause:** `mintSystemToken()` in `setup/auth.ts` signs with `JWT_ACCESS_SECRET`
and `JWT_ISSUER` from env. If the service's JWT guard uses different config
the token is rejected.
**Fix:** Verify `.env.e2e` has matching values for both the gateway and all
individual services. `JWT_ACCESS_SECRET` and `JWT_ISSUER` must be identical
across all containers.

### 5f. WebSocket smoke test fails — connection refused / rejected

File: `smoke/infra/platform-wiring.smoke.spec.ts`
**Cause:** WS gateway container is not running, or the JWT is rejected.
**Fix:**

```bash
docker logs nl-e2e-ws-gateway --tail 50
curl -s http://localhost:4100/socket.io/?EIO=4&transport=polling | head -c 200
```

---

## 6. Files You May Need to Edit

| File                                                                | When to edit                                          |
| :------------------------------------------------------------------ | :---------------------------------------------------- |
| `tests/system/smoke/services/{name}.smoke.spec.ts`                  | Wrong URL, wrong expected status, missing test case   |
| `tests/system/smoke/infra/platform-wiring.smoke.spec.ts`            | Infra connectivity changes                            |
| `tests/system/smoke/infra/gateway-health-and-routing.smoke.spec.ts` | Gateway routing changes                               |
| `tests/system/smoke/workers/workers-wiring.smoke.spec.ts`           | New queues or exchange renames                        |
| `tests/system/setup/http.ts`                                        | New base URL helpers, `resolveStatus` mapping updates |
| `tests/system/setup/auth.ts`                                        | Token shape changes (new claims, algorithm change)    |
| `.env.e2e`                                                          | Config values for e2e environment                     |

**Do NOT edit** `jest.system.config.ts` unless the `testMatch` globs need
changing, or a new tsconfig alias is added.

---

## 7. Adding a New Smoke Test

When a new service is added to the monorepo:

1. Create `tests/system/smoke/services/{name}.smoke.spec.ts`
   following the pattern of any existing file in that directory.
2. The file must:
   - Import from `'../../setup/http'` and `'../../setup/auth'`
   - Have a `beforeAll` reachability guard
   - Test at least: one public endpoint (if any), auth rejection, and one
     authenticated GET that is not 401
3. No changes to `jest.system.config.ts` needed — the glob catches all
   `*.smoke.spec.ts` files automatically.

---

## 8. Success Criteria

All smoke tests pass when:

```
Test Suites: 19 passed, 19 total
Tests:       127 passed, 127 total
```

(counts will change if new services are added)

If any suite fails, fix **that suite's file** first. Do not add `.skip()` or
lower assertions — find the real root cause.
