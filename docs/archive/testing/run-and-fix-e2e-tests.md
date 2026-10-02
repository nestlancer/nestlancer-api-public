## 📖 Table of Contents

- [1. Project Context](#1-project-context)
- [2. Test Layout](#2-test-layout)
- [3. Environment Prerequisites](#3-environment-prerequisites)
- [4. Run the E2E Suite](#4-run-the-e2e-suite)
- [5. Failure Taxonomy & Debug Playbook](#5-failure-taxonomy-debug-playbook)
- [6. Debugging a Single Failing Test in Isolation](#6-debugging-a-single-failing-test-in-isolation)
- [7. Files You May Need to Edit](#7-files-you-may-need-to-edit)
- [8. Adding a New E2E Test File](#8-adding-a-new-e2e-test-file)
- [9. Success Criteria](#9-success-criteria)

---

## 1. Project Context

Nestlancer is a **pnpm + Turborepo monorepo**. The e2e tests hit the live stack
running under Docker Compose (`docker-compose.e2e.yml`).

### Critical: Gateway Response Envelope

**Every response from the API gateway — success or error — is wrapped as HTTP
200** with the real outcome inside the body:

```json
// Auth failure (upstream returned 401):
{ "status": "success", "data": { "status": "error", "error": { "code": "AUTH_001", "message": "Invalid or missing authentication token" } } }

// Success (upstream returned 200 + payload):
{ "status": "success", "data": [ … ], "metadata": { … } }
```

The helper `resolveStatus(httpStatus, body)` in `tests/system/setup/http.ts`
unwraps this envelope. **All HTTP helper functions in every e2e service file
MUST pipe responses through `resolveStatus`**:

```typescript
import { getApiBase, resolveStatus } from '../../setup/http';

async function GET(url: string, token?: string): Promise<SafeResult> {
  return axios
    .get(url, { headers: token ? { Authorization: token } : {}, timeout: 12_000 })
    .then((r) => ({ status: resolveStatus(r.status, r.data), data: r.data }))
    .catch((e: AxiosError) => ({
      status: e.response?.status ?? 0,
      data: e.response?.data ?? null,
    }));
}
```

The `resolveStatus` mapping (extend in `setup/http.ts` as new codes appear):
| Inner `error.code` prefix | Resolved HTTP status |
| :--- | :--- |
| `AUTH_*` | 401 |
| `FORBIDDEN_*` / `PERMISSION_DENIED` | 403 |
| `HTTP_404` / `*_NOT_FOUND` | 404 |
| `VALIDATION_*` / `INVALID_*` / `BAD_REQUEST` | 400 |
| `CONFLICT_*` / `DUPLICATE_*` | 409 |

---

## 2. Test Layout

```
tests/system/
├── e2e/
│   ├── services/   one file per service  (*.e2e.spec.ts)
│   └── workers/    workers.e2e.spec.ts
└── setup/
    ├── auth.ts     mintSystemToken(userId, role), bearerToken(userId, role)
    ├── env.ts      loads .env.e2e
    └── http.ts     getApiBase(), resolveStatus()
```

---

## 3. Environment Prerequisites

```bash
# 1. All e2e containers must be Up
docker ps --format "table {{.Names}}\t{{.Status}}" | grep nl-e2e

# 2. Gateway must be healthy
curl -s http://localhost:4000/api/v1/health/live

# 3. .env.e2e must exist
ls .env.e2e
```

Key `.env.e2e` values used by tests:

- `JWT_ACCESS_SECRET`, `JWT_ISSUER` → `mintSystemToken()`
- `RABBITMQ_URL`, `RABBITMQ_EXCHANGE_EVENTS` → workers tests
- `DATABASE_URL` → outbox-poller tests in workers.e2e.spec.ts
- `TURNSTILE_BYPASS_TOKEN=e2e-bypass-turnstile` → auth registration/contact tests

---

## 4. Run the E2E Suite

```bash
# Run all e2e tests
pnpm test:system:e2e

# Run a single service
pnpm test:system -- --testPathPattern=e2e/services/auth

# Run all service e2e tests (no workers)
pnpm test:system -- --testPathPattern=e2e/services

# Run only workers e2e
pnpm test:system -- --testPathPattern=e2e/workers
```

---

## 5. Failure Taxonomy & Debug Playbook

Read the Jest output carefully. Every failure will fall into one of these
categories:

---

### CAT-1 — Auth enforcement test fails (status 200 instead of 401)

**Symptom:**

```
Expected value: 200
Received array: [0, 401, 403]
```

i.e. `expect([0, 401, 403]).toContain(status)` fails because `status = 200`.

**Root cause:** The e2e helper is NOT using `resolveStatus`. The gateway returns
HTTP 200 with `error.code = AUTH_001` inside the body, but the raw HTTP status
is passed directly to the assertion.

**Fix — in the test file:**

1. Ensure the import includes `resolveStatus`:
   ```typescript
   import { getApiBase, resolveStatus } from '../../setup/http';
   ```
2. Ensure every `.then` handler in GET/POST/PATCH/DELETE uses it:
   ```typescript
   .then((r) => ({ status: resolveStatus(r.status, r.data), data: r.data }))
   ```
3. If `resolveStatus` does not map the specific `error.code` coming back,
   add the mapping in `tests/system/setup/http.ts`.

---

### CAT-2 — Not-found test fails (status 200 instead of 404)

**Symptom:**

```
Expected value: 404
Received array: [200, 404, 403, …]
```

**Root cause:** Same as CAT-1 — gateway wraps the 404. After applying
`resolveStatus`, check that the inner `error.code` is being mapped:

```bash
# Manually hit the endpoint to see the actual error code
curl -s -H "Authorization: Bearer <token>" \
  "http://localhost:4000/api/v1/requests/00000000-0000-0000-0000-000000000001" \
  | python3 -m json.tool
```

Look at `data.error.code`. Add it to the `resolveStatus` mapping if missing.

---

### CAT-3 — Create/POST test returns 400/422 instead of 201

**Symptom:**

```
Expected value: 201
Received array: [400, 422]
```

**Debug steps:**

1. Hit the endpoint manually with the exact payload from the test file:
   ```bash
   curl -s -X POST "http://localhost:4000/api/v1/{path}" \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{…payload from test…}' | python3 -m json.tool
   ```
2. Check `data.error` in the response for the validation message.
3. Find the DTO in `services/{name}/src/**/*.dto.ts` and compare required fields.

**Common causes:**

- DTO has a required field the test payload is missing
- An enum value in the payload is wrong (e.g. `'webDevelopment'` vs `'web_development'`)
- A referenced foreign key (project ID, user ID) does not exist in the e2e database

**Fix in the test file** — update `VALID_CREATE_*` constant to match the DTO.
If the issue is a missing FK, use `beforeAll` to create the prerequisite
record first, then store its ID in a `let createdId: string`.

---

### CAT-4 — Workers test fails — "no exchange 'events' in vhost"

**Symptom:**

```
Unhandled error. Channel closed by server: 404 (NOT-FOUND)
"NOT_FOUND - no exchange 'events' in vhost 'nestlancer'"
```

**Root cause:** The test hardcodes the exchange name `'events'`, but in the e2e
environment `RABBITMQ_EXCHANGE_EVENTS=events.e2e`.

**Fix — in `tests/system/e2e/workers/workers.e2e.spec.ts`:**

1. Confirm the constant is defined at the top:
   ```typescript
   const EVENTS_EXCHANGE = process.env.RABBITMQ_EXCHANGE_EVENTS ?? 'events';
   ```
2. Every `publishToExchange('events', …)` and `checkExchangeExists('events')`
   call must use `EVENTS_EXCHANGE` instead of the string literal.
3. Verify the exchange name in RabbitMQ management UI or via:
   ```bash
   curl -s -u <user>:<pass> http://localhost:15672/api/exchanges/nestlancer \
     | python3 -m json.tool | grep '"name"'
   ```

---

### CAT-5 — Workers test fails — queue not found

**Symptom:**

```
Expected value: true
Received: false
```

in a `checkQueueExists(name)` assertion.

**Debug steps:**

```bash
# List all queues in the vhost
curl -s -u <user>:<pass> \
  "http://localhost:15672/api/queues/nestlancer" \
  | python3 -m json.tool | grep '"name"'
```

Compare the actual queue name against the `expectedQueues` array in
`workers.e2e.spec.ts`. Update the `names` array to include the real name.

---

### CAT-6 — Outbox-poller test fails — DB insert rejected

**Symptom:** Test inserts a row into `outbox_events` but gets a DB error.

**Debug steps:**

```bash
# Check the table schema
psql "$DATABASE_URL" -c "\d outbox_events"
```

Ensure the insert in the test matches the actual column names/types. The
current insert expects columns: `id`, `event_type`, `aggregate_id`,
`aggregate_type`, `payload`, `status`, `created_at`.

---

### CAT-7 — Suite fails to run entirely — "Cannot find module"

**Root cause:** Relative import path is wrong after a file move.

**Rule:** All files in `e2e/services/` import setup as:

```typescript
import { getApiBase, resolveStatus } from '../../setup/http';
import { bearerToken, mintSystemToken } from '../../setup/auth';
```

Files in `e2e/workers/` also use `../../setup/…`.

---

### CAT-8 — Timeout / ECONNREFUSED

**Root cause:** Service is not running or is unhealthy.

**Steps:**

```bash
# Check which container is down
docker ps --filter "status=exited" --format "{{.Names}}"

# Restart and watch logs
docker compose -f docker-compose.e2e.yml up -d
docker logs nl-e2e-svc-{name} --tail 100 -f
```

---

## 6. Debugging a Single Failing Test in Isolation

```bash
# Run just one describe block by name
pnpm test:system -- \
  --testPathPattern=e2e/services/requests \
  --testNamePattern="Auth enforcement"

# Run with verbose + no timeout override
pnpm test:system -- \
  --testPathPattern=e2e/services/requests \
  --verbose --testTimeout=60000
```

Inspect the raw HTTP response for a specific assertion:

```typescript
// Temporarily add this inside a failing test:
console.log('RAW RESPONSE:', JSON.stringify(data, null, 2));
```

---

## 7. Files You May Need to Edit

| File                                           | Why                                                           |
| :--------------------------------------------- | :------------------------------------------------------------ |
| `tests/system/e2e/services/{name}.e2e.spec.ts` | Wrong DTO payload, wrong URL path, missing `resolveStatus`    |
| `tests/system/e2e/workers/workers.e2e.spec.ts` | Wrong exchange/queue names, wrong message payload shape       |
| `tests/system/setup/http.ts`                   | Add new `error.code` → HTTP status mapping to `resolveStatus` |
| `tests/system/setup/auth.ts`                   | Token claim changes (new roles, audience, algorithm)          |
| `.env.e2e`                                     | Missing or wrong environment variable for a service feature   |
| `services/{name}/src/**/*.dto.ts`              | If the DTO was changed and test payload is now stale          |

**Do NOT** add `.skip()` to make tests "pass". Every skip is a hidden bug.

---

## 8. Adding a New E2E Test File

When a new service is added:

1. Create `tests/system/e2e/services/{name}.e2e.spec.ts`.
2. Copy the structure from an existing file (e.g. `requests.e2e.spec.ts`).
3. Required sections:
   - Imports with `resolveStatus`
   - `VALID_CREATE_*` constant matching the real DTO
   - `beforeAll` reachability guard hitting `/health` endpoint
   - Auth enforcement describe block
   - Validation enforcement describe block (empty body, missing fields)
   - CRUD describe blocks
4. No config changes needed — globs auto-discover `*.e2e.spec.ts`.

---

## 9. Success Criteria

The suite is healthy when:

```
Test Suites: 17 passed, 17 total
Tests:       ~523 passed, ~523 total
```

(counts grow as new services are added)

Priority order for fixing failures:

1. CAT-7 (suite won't even load) — blocks everything else
2. CAT-1 / CAT-2 (auth + not-found) — usually a single `resolveStatus` fix heals many tests at once
3. CAT-4 / CAT-5 (workers exchange/queue) — env-var fix heals the entire workers suite
4. CAT-3 (create fails) — requires reading the real DTO; fix one at a time
5. CAT-6 (outbox DB) — schema-level issue; verify with `psql`
6. CAT-8 (timeouts) — infrastructure issue; fix containers first
