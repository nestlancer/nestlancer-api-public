## 📖 Table of Contents

- [Target Types](#target-types)
- [Your Task](#your-task)
- [Rules (Must Follow)](#rules-must-follow)
- [Reference](#reference)
- [Checklist Before Finishing](#checklist-before-finishing)

---

## Target Types

| Type           | Example                           | Path                           | What E2E tests                                                                     |
| :------------- | :-------------------------------- | :----------------------------- | :--------------------------------------------------------------------------------- |
| **Service**    | auth, users, requests             | `services/<service-name>/e2e/` | Real NestJS app (AppModule), HTTP endpoints, status + body                         |
| **Worker**     | email-worker, notification-worker | `workers/<worker-name>/e2e/`   | Real worker app (in-process), bootstrap, job/handler behavior or health if exposed |
| **Gateway**    | gateway                           | `gateway/e2e/`                 | Real gateway app, routing/proxy, auth middleware, rate limiting                    |
| **WS-Gateway** | ws-gateway                        | `ws-gateway/e2e/`              | Real WebSocket gateway, connection, presence, messaging (e.g. socket.io-client)    |

---

## Your Task

Create or update E2E test files for the **target** (service, worker, gateway, or ws-gateway) so that:

- Tests run against the **real app** (NestJS `AppModule` or worker bootstrap, in-process; for gateway/ws-gateway, no cross-service calls to real backends unless documented).
- Tests are **correct E2E**: they verify **expected status codes** and **response shape/behavior** (or, for workers/WS: bootstrap success, message handling, connection behavior), not just "any 2xx/4xx" or "no crash".
- **Smoke tests** (health, routing, auth rejection, worker startup) are explicit and minimal; **behavioral E2E tests** cover success paths, validation errors, and auth/authorization with **strict assertions**.

If the target already has e2e specs, **update** them to follow the rules below. If not, **create** `e2e/setup.ts`, `e2e/jest.e2e.config.ts`, and one or more `e2e/*.e2e-spec.ts` files.

---

## Rules (Must Follow)

### 1. Test Types: Smoke vs Proper E2E

- **Smoke test**: Confirms the service starts and an endpoint responds (e.g. health returns 200). Use **only** for health/readiness or "does the route exist?" checks. Keep smoke tests in a small, clearly named block (e.g. `describe('Health (smoke)', …)`).
- **Proper E2E**: Every other test must assert **exact expected outcome** for the scenario (success, validation error, not found, forbidden). Do **not** use loose assertions like "status is one of 200, 404, 422, 500" for a known scenario—use the **single** status code that the API contract guarantees for that case.

**Bad (dry/smoke-style):**

```ts
expect([200, 404, 422, 500]).toContain(res.status);
```

**Good (proper E2E):**

```ts
expect(res.status).toBe(201);
expect(res.body?.data?.id).toBeDefined();
expect(res.body?.data?.title).toBe(payload.title);
```

For **known error cases** (e.g. unauthenticated, invalid body), assert the **exact** status (401, 403, 400, 404, 422) and optionally error shape.

---

### 2. Assertions

- **Success paths**: Assert `res.status` is the exact success code (200, 201, 204) and that the response body matches the contract (e.g. created resource id, updated fields, list shape).
- **Error paths**: Assert the exact HTTP status (401, 403, 400, 404, 409, 422) and, if the API returns a structured error, at least one field (e.g. `message` or `error`).
- **No silent skips**: Do not write `if (res.status !== 201) return;` and then continue the suite—either fail the test or use a proper setup/seed so the success path is guaranteed for that test.

---

### 3. Structure and Layout

- **Location** (by target type):
  - **Service:** `services/<service-name>/e2e/`
  - **Worker:** `workers/<worker-name>/e2e/`
  - **Gateway:** `gateway/e2e/`
  - **WS-Gateway:** `ws-gateway/e2e/`
- **Files** (same pattern for all; workers/gateways may omit global prefix if not HTTP):
  - `setup.ts`: Bootstraps the app (load `.env.e2e`, `Test.createTestingModule`, `AppModule` or worker module, global prefix if HTTP, pipes, filters, interceptors), exports `setupApp`, `teardownApp`, `getApp`, `getAppUrl`, `getGlobalPrefix` (or equivalent for workers/WS).
  - `jest.e2e.config.ts`: Jest config for e2e (displayName, testRegex `e2e/.*\\.e2e-spec\\.ts$`, testTimeout, maxWorkers: 1).
  - `*.e2e-spec.ts`: Test files; use `beforeAll(setupApp)` and `afterAll(teardownApp)`.
- **Naming**: Use `describe('TargetName - Feature (E2E)', …)` and clear `it('…')` descriptions (e.g. "POST /resource returns 201 and body with id when payload is valid" for services; "consumes job and updates state" for workers; "GET /api/v1/health returns 200" for gateway; "client connects and receives presence update" for ws-gateway).

---

### 4. Libs vs Mocks

**Prefer lib dir (real code) when:**

- The dependency is **in-repo shared code** that does not talk to external infra: e.g. `@nestlancer/common` (filters, interceptors, DTOs), `libs/testing` (JWT helper, fixtures), `@nestlancer/auth-lib` for token validation.
- You want E2E to **exercise real behavior** so integration bugs (wrong status, wrong envelope, wrong auth) are caught.
- The code is fast and deterministic (e.g. JWT with a test secret, validation pipes).

**Use `e2e/__mocks__/` (and `moduleNameMapper` in `jest.e2e.config.ts`) only when:**

- The dependency talks to **external infra** not available in E2E: queues (e.g. `@nestlancer/queue`), Redis, S3, SMTP, tracing/OTLP. Mock so tests do not time out or require real services.
- You need **determinism** (e.g. mock `uuid` so generated IDs are stable for assertions).
- The real implementation is slow, flaky, or has side effects (e.g. sending real emails, opening real connections).

**Alternative to mocks:** For Nest-injected services (e.g. health checks that hit DB/cache/queue), prefer **`Test.createTestingModule().overrideProvider(SomeService).useValue({ ... })`** in `setup.ts` over module-level mocks, so the app still uses real libs and only the infra-facing provider is replaced.

---

### 5. Auth and Roles

- Use a **test JWT helper** (e.g. from `libs/testing` or a local helper) to build `Authorization: Bearer <token>` with the right `sub` and `role` (USER, ADMIN, etc.).
- **Unauthenticated**: For protected routes, always have a test that calls without a token and assert **401**.
- **Wrong role**: For admin-only routes, have a test with a non-admin token and assert **403**.
- **Authenticated success**: Use a dedicated test user id/role and assert **exact** success status and response body; avoid accepting both 200 and 404 in the same test.

---

### 6. Data and Environment

- Prefer **deterministic data**: Use fixed UUIDs or seeded data where the service supports it, so success-path tests can assert exact status and body.
- If the service requires DB state (e.g. "user must exist"), either:
  - Document that e2e expects a seeded DB (e.g. via `.env.e2e` and migrations/seed), and assert exact outcomes, or
  - Create the entity in the test (or in a `beforeAll`) and then assert on that entity—do not silently skip assertions when create fails.
- Load env from **`.env.e2e`** (e.g. in `setup.ts` with `dotenv` and `path.resolve(__dirname, '../../../.env.e2e')`). Set `NODE_ENV=e2e` for the test run.

---

### 7. HTTP Client and Prefix (Services / Gateway)

- **Services and Gateway:** Use **supertest** with `request(getApp().getHttpServer())` or `request(getAppUrl())` so requests hit the in-process app. Use the **global prefix** from setup (e.g. `api/v1`) in every URL: `get(\`${getGlobalPrefix()}/users/profile\`)` or equivalent. Do not hardcode prefixes that differ from the app.
- **Workers:** May have no HTTP server; tests typically bootstrap the worker and invoke handlers or assert on health endpoint if present. Use the same setup/teardown pattern.
- **WS-Gateway:** Use a WebSocket client (e.g. `socket.io-client`) to connect to the in-process server; assert connection, events, and message payloads. Use the base URL from setup (e.g. `getAppUrl()`).

---

### 8. Response Shape

- Respect the app’s **response envelope** (e.g. `{ status: 'success', data: { … } }` from `TransformResponseInterceptor`). When asserting success, read from `res.body?.data` or `res.body` consistently with how the service actually returns data.
- For lists, assert that the result is an array (or has `items`/`data` array) and, when relevant, assert length or at least one item’s shape.

---

### 9. What to Avoid

- **No loose status sets** for a specific scenario: e.g. do not use `expect([200, 404, 500]).toContain(res.status)` when the scenario has a single correct outcome.
- **No silent skips** in the middle of a flow: do not `if (res.status !== 201) return;` without failing; either fail the test or ensure preconditions so the test can assert the success path.
- **No smoke-only suites**: If the only checks are "returns some 2xx/4xx", add proper tests with exact status and body assertions for at least the main success and main error cases.
- **Scope per target:** **Service** E2E hits **one** service only (no gateway, no cross-service calls). **Worker** E2E hits **one** worker only (mock queues/external infra as in rule 4). **Gateway** E2E tests the gateway app in isolation (mock or stub downstream services if needed). **WS-Gateway** E2E tests the WebSocket server in isolation. Cross-service flows belong in system E2E (see reference-docs/601-e2e-test-plan.md).

---

## Reference

- **E2E strategy and structure**: `reference-docs/601-e2e-test-plan.md`
- **API contracts (endpoints, payloads, errors)**: `reference-docs/10x-*-endpoints.md` and `reference-docs/100-api-standards-endpoints.md`
- **Existing examples in repo:**
  - **Services:** `services/auth/e2e/`, `services/users/e2e/`, `services/requests/e2e/` — align structure with these; **tighten assertions** to match this prompt’s rules.
  - **Workers:** `workers/email-worker/e2e/`, `workers/audit-worker/e2e/`, `workers/notification-worker/e2e/` — same setup/spec pattern; mock queue/external infra.
  - **Gateway:** `gateway/e2e/` — proxy routing, auth middleware, rate limiting.
  - **WS-Gateway:** `ws-gateway/e2e/` — connection, presence, realtime messaging with socket.io-client.

---

## Checklist Before Finishing

- [ ] Smoke tests are limited to health/routing and clearly described.
- [ ] Success paths assert exact status (200/201/204) and response body (id, fields, list shape).
- [ ] Error paths assert exact status (401, 403, 400, 404, 422, etc.) and optionally error body.
- [ ] No use of "status in [200, 404, 500]" for a scenario with one correct outcome.
- [ ] Auth: unauthenticated → 401; wrong role → 403; authenticated success → exact status + body.
- [ ] Setup uses `.env.e2e` and global prefix; URLs use `getGlobalPrefix()`.
- [ ] No silent skips; tests either fail or have preconditions that allow strict assertions.
- [ ] Libs vs mocks: real libs for in-repo code (common, auth-lib, testing); mocks only for external infra (queue, email, etc.) or determinism (e.g. uuid); prefer `overrideProvider` in setup for Nest services over module mocks when possible.
