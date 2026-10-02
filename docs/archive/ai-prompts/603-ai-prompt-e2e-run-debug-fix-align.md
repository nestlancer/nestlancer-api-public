## 📖 Table of Contents

- [Specify the target (required)](#specify-the-target-required)
- [Your Task](#your-task)
- [Rules (Must Follow)](#rules-must-follow)
- [Quick Reference: Commands](#quick-reference-commands)
- [Checklist After Run–Debug–Fix](#checklist-after-rundebugfix)

---

## Specify the target (required)

**You must state which specific app(s) to test.** Only run, debug, and fix E2E for the target(s) below. Do not run or change E2E for other packages unless the user asks.

### Valid targets

| Type         | Target name         | Path                          | pnpm filter (example)               |
| :----------- | :------------------ | :---------------------------- | :---------------------------------- |
| **Services** | auth                | `services/auth`               | `@nestlancer/auth-service`          |
|              | users               | `services/users`              | `@nestlancer/users-service`         |
|              | requests            | `services/requests`           | `@nestlancer/requests-service`      |
|              | projects            | `services/projects`           | `@nestlancer/projects-service`      |
|              | quotes              | `services/quotes`             | `@nestlancer/quotes-service`        |
|              | payments            | `services/payments`           | `@nestlancer/payments-service`      |
|              | progress            | `services/progress`           | `@nestlancer/progress-service`      |
|              | messaging           | `services/messaging`          | `@nestlancer/messaging-service`     |
|              | notifications       | `services/notifications`      | `@nestlancer/notifications-service` |
|              | blog                | `services/blog`               | `@nestlancer/blog-service`          |
|              | portfolio           | `services/portfolio`          | `@nestlancer/portfolio-service`     |
|              | media               | `services/media`              | `@nestlancer/media-service`         |
|              | contact             | `services/contact`            | `@nestlancer/contact-service`       |
|              | admin               | `services/admin`              | `@nestlancer/admin-service`         |
|              | health              | `services/health`             | `@nestlancer/health-service`        |
|              | webhooks            | `services/webhooks`           | `@nestlancer/webhooks-service`      |
| **Workers**  | analytics-worker    | `workers/analytics-worker`    | `@nestlancer/analytics-worker`      |
|              | audit-worker        | `workers/audit-worker`        | `@nestlancer/audit-worker`          |
|              | cdn-worker          | `workers/cdn-worker`          | `@nestlancer/cdn-worker`            |
|              | email-worker        | `workers/email-worker`        | `@nestlancer/email-worker`          |
|              | media-worker        | `workers/media-worker`        | `@nestlancer/media-worker`          |
|              | notification-worker | `workers/notification-worker` | `@nestlancer/notification-worker`   |
|              | outbox-poller       | `workers/outbox-poller`       | `@nestlancer/outbox-poller`         |
|              | webhook-worker      | `workers/webhook-worker`      | `@nestlancer/webhook-worker`        |
| **Gateway**  | gateway             | `gateway`                     | (gateway package name)              |
|              | ws-gateway          | `ws-gateway`                  | (ws-gateway package name)           |

**How to use in the prompt:**  
Example: _“Target: **auth**, **requests**”_ or _“Run and fix E2E for **services/users** and **workers/email-worker**.”_

- **Single target:** Run and fix E2E only for that service, worker, gateway, or ws-gateway.
- **Multiple targets:** Run E2E for each listed target; debug and fix failures in those targets only.
- **System E2E (root):** If the target is “system” or “tests/e2e”, use `pnpm test:e2e:suite <pattern>` or `pnpm test:e2e:docker` and work only under `tests/e2e/`.

---

## Your Task

1. **Run** the E2E tests **for the specified target(s)** only.
2. **Inspect** the test output (stdout, stderr, exit code) and **identify** what failed and where (file, test name, line).
3. **Determine** the cause: test assertion, test setup, app code, env/DB, or dependency **within that target**.
4. **Debug** (reproduce, narrow down, verify assumptions) **for the target**.
5. **Fix** the root cause in the target (fix the test, the app, or the setup—do not paper over with loose assertions).
6. **Align** the target with the project: ensure the fix is consistent with `reference-docs/602-ai-prompt-e2e-service-tests.md` and `reference-docs/601-e2e-test-plan.md`; if the pattern applies to other services/workers, note it or align only when the user asks.

---

## Rules (Must Follow)

### 1. How to Run Tests

- **Scope:** Run E2E **only for the target(s)** the user specified. Do not run `pnpm test:e2e` (all packages) unless the user explicitly asked for the full suite.

- **Run by target:**
  - **Service (e.g. auth, users, requests):**  
    From repo root: `pnpm --filter @nestlancer/<service>-service test:e2e`  
    Or: `cd services/<name> && pnpm run test:e2e`  
    Example for auth: `pnpm --filter @nestlancer/auth-service test:e2e` or `cd services/auth && pnpm run test:e2e`.
  - **Worker (e.g. email-worker, notification-worker):**  
    From repo root: `pnpm --filter @nestlancer/<worker-pkg> test:e2e`  
    Or: `cd workers/<name> && pnpm run test:e2e`  
    Example: `cd workers/email-worker && pnpm run test:e2e`.
  - **Gateway:** `cd gateway && pnpm run test:e2e`.
  - **WS-Gateway:** `cd ws-gateway && pnpm run test:e2e`.
  - **Multiple targets:** Run the command above once per target (e.g. auth then requests).

- **Single spec file (within target):** From the target’s directory:  
  `pnpm exec jest --config e2e/jest.e2e.config.ts e2e/<file>.e2e-spec.ts --runInBand`.  
  Examples:
  - Service: `cd services/auth && pnpm exec jest --config e2e/jest.e2e.config.ts e2e/registration.e2e-spec.ts --runInBand`.
  - Worker: `cd workers/email-worker && pnpm exec jest --config e2e/jest.e2e.config.ts e2e/email-worker.e2e-spec.ts --runInBand`.
  - Gateway: `cd gateway && pnpm exec jest --config e2e/jest.e2e.config.ts e2e/proxy-routing.e2e-spec.ts --runInBand`.
  - WS-Gateway: `cd ws-gateway && pnpm exec jest --config e2e/jest.e2e.config.ts e2e/connection.e2e-spec.ts --runInBand`.

- **System E2E (only when target is “system” or “tests/e2e”):**  
  `pnpm test:e2e:suite <pattern>` or `pnpm test:e2e:docker` / `bash scripts/test/run-e2e.sh [filter]`.

- **Verbosity:** Use `--verbose` if the config doesn’t already. For Jest, `--no-cache` can help after changing setup or mocks.

- **Env:** For services/workers, E2E uses `.env.e2e` in the repo root (or as referenced in the target’s `e2e/setup.ts`). Ensure it exists and has correct `DATABASE_URL`, `JWT_ACCESS_SECRET`, etc., for the **target** you are testing.

---

### 2. How to Read Test Output and Find the Problem

- **Exit code:** Non-zero means at least one test failed or the run errored (e.g. timeout, crash). Use it in scripts/CI.

- **Jest failure block:** Look for:
  - **Test name:** `● Suite name › test name` — identifies the failing test.
  - **Expected / Received:** Tells you the assertion that failed (e.g. expected status 201, received 500).
  - **Stack trace:** Points to the **test file** and **line** (the `expect` that failed). Use it to open the right file and line.

- **Where the bug might be:**
  - **Assertion in test:** Expected value is wrong for the current API (e.g. test expects 201 but API returns 200). Fix the test to match the real contract, or fix the API and keep the test.
  - **Test setup:** Wrong URL, missing auth header, wrong body shape, or missing seed data. Fix `setup.ts` or the spec (e.g. create resource in `beforeAll`).
  - **App code:** Controller/service returns wrong status or body, or throws. Fix the app code; keep the test expectation.
  - **Env/DB:** Missing or wrong `DATABASE_URL`, migrations not run, or empty DB so “get by id” returns 404. Fix env or seed; do not relax the test to accept 404 when the scenario requires success.
  - **Dependency/mock:** External client (e.g. queue, email) not mocked in e2e and causes timeout or error. Follow **Libs vs mocks** (below): use real libs for in-repo code; add or fix mock in `e2e/__mocks__/` only for external infra or determinism; ensure `moduleNameMapper` in `jest.e2e.config.ts` points to the mock. For Nest-injected infra services, prefer `overrideProvider` in `setup.ts` over module mocks.

- **Flaky tests:** If a test passes sometimes and fails sometimes, look for: shared state, missing `maxWorkers: 1`, time-dependent logic, or reliance on unseeded DB. Prefer deterministic data and single-worker e2e; fix the cause rather than retrying.

---

### 3. Debugging Steps

- **Reproduce:** Run only the failing test or suite (single spec file or `it.only` / `describe.only` temporarily) to get a short, stable repro.

- **Inspect response:** In the test, log `res.status` and `res.body` (or add a temporary `console.log`) to see what the app actually returns. Compare with what the test expects and with the API contract in `reference-docs/10x-*-endpoints.md`.

- **Check setup:** Confirm `e2e/setup.ts` loads `.env.e2e`, uses the same global prefix as the app, and applies the same pipes/filters/interceptors as production. Compare with a working service (e.g. `services/auth/e2e/setup.ts`).

- **Check config:** Ensure `jest.e2e.config.ts` has `rootDir` so that paths and `moduleNameMapper` resolve correctly, and `testRegex` matches the spec files. Ensure `maxWorkers: 1` if tests share in-process state.

- **DB/seed:** If the test expects an entity to exist (e.g. user, project), verify that migrations and seed run for the E2E DB (or the test creates the entity). Use the same `DATABASE_URL` as in `.env.e2e`.

- **Libs vs mocks:** Prefer **lib dir (real code)** for in-repo dependencies (`@nestlancer/common`, `libs/testing`, `@nestlancer/auth-lib`) so E2E exercises real behavior. Use **`e2e/__mocks__/`** only for (a) external infra (queue, email, Redis, S3, tracing) so e2e doesn’t hit real services, or (b) determinism (e.g. mock `uuid` for stable IDs). For Nest-injected infra-facing services (e.g. health checks), prefer **`overrideProvider(...).useValue(...)`** in `setup.ts` over adding a module mock. Ensure `moduleNameMapper` in `jest.e2e.config.ts` points to any mocks you add.

- **Single change:** After a fix, run the failing test again, then the full e2e for that service, then (if applicable) related packages, to avoid regressions.

---

### 4. Fixing the Problem

- **Fix the right layer:**
  - **Wrong expectation:** If the API contract is correct and the test expected something else, update the test (exact status and body per 602).
  - **Wrong behavior:** If the app returns the wrong status or body, fix the controller/service; keep the test as the desired contract.
  - **Wrong setup:** Fix `setup.ts` or test data (auth helper, base URL, prefix, seed) so the test can assert the correct outcome.
  - **Wrong env:** Fix `.env.e2e` or document required env and seed steps.

- **Do not:**
  - Replace a strict assertion with a loose one (e.g. `expect([200, 404, 500]).toContain(res.status)`) to make the test pass. That violates 602; fix the cause instead.
  - Use `if (res.status !== 201) return;` and skip assertions; either fail the test or ensure preconditions so the success path is asserted.
  - Add arbitrary timeouts or retries to hide flakiness; fix shared state or dependencies.

- **After the fix:** Re-run the affected tests and confirm they pass. If you had to change a pattern (e.g. how auth is built), consider aligning other e2e specs in the same service or across services (see “Align” below).

---

### 5. Align the Project

- **Same target:** All specs in that target's `e2e/` folder should follow the same setup (same `getApp`, `getGlobalPrefix` where applicable, auth helper for HTTP). Same assertion style: exact status and body checks per 602 (or, for workers/WS, exact bootstrap/connection/message behavior).

- **Across services:** Use the same patterns where possible:
  - **setup.ts:** Load `.env.e2e`, set `NODE_ENV=e2e`, use `GLOBAL_PREFIX = 'api/v1'` for HTTP apps, apply `ValidationPipe`, `TransformResponseInterceptor`, `AllExceptionsFilter`, then `app.init()` and `app.listen(0)` (or worker bootstrap / WS server listen).
  - **Auth (services / gateway):** Use a shared test JWT helper (e.g. from `libs/testing`) and the same header shape `Authorization: Bearer <token>`.
  - **Jest e2e config:** Same `testRegex`, `testTimeout`, `maxWorkers: 1`, and similar `moduleNameMapper` only for dependencies that must be mocked (external infra or determinism); use real libs otherwise (see 602 “Libs vs Mocks”).

- **Docs and prompts:** After changing how e2e works (e.g. new env var, new mock), update `reference-docs/601-e2e-test-plan.md` or `reference-docs/602-ai-prompt-e2e-service-tests.md` if they’re affected, so future test creation stays aligned.

- **Workers and gateways:** Align with 602: workers use `workers/<name>/e2e/` (mock queue/external infra); gateway uses `gateway/e2e/` (routing, auth, rate limit); ws-gateway uses `ws-gateway/e2e/` (socket.io-client, connection/presence/messaging). Same setup/teardown and strict assertions; no loose status sets.

- **Package scripts:** Each **service**, **worker**, **gateway**, and **ws-gateway** that has e2e should have in its `package.json`: `"test:e2e": "jest --config e2e/jest.e2e.config.ts --runInBand"` (or equivalent). Root `package.json` should keep `test:e2e` (turbo) and `test:e2e:suite` for system e2e.

---

## Quick Reference: Commands

**Always use the target(s) the user specified.** Replace `<target>` with the folder name (e.g. `auth`, `users`, `email-worker`).

| Goal                                        | Command                                                                                                     |
| :------------------------------------------ | :---------------------------------------------------------------------------------------------------------- |
| **Service** E2E (by target)                 | `pnpm --filter @nestlancer/<target>-service test:e2e` or `cd services/<target> && pnpm run test:e2e`        |
| **Worker** E2E (by target)                  | `pnpm --filter @nestlancer/<target> test:e2e` or `cd workers/<target> && pnpm run test:e2e`                 |
| **Gateway** E2E                             | `cd gateway && pnpm run test:e2e`                                                                           |
| **WS-Gateway** E2E                          | `cd ws-gateway && pnpm run test:e2e`                                                                        |
| One spec file (service)                     | `cd services/<target> && pnpm exec jest --config e2e/jest.e2e.config.ts e2e/<file>.e2e-spec.ts --runInBand` |
| One spec file (worker)                      | `cd workers/<target> && pnpm exec jest --config e2e/jest.e2e.config.ts e2e/<file>.e2e-spec.ts --runInBand`  |
| One spec file (gateway / ws-gateway)        | `cd gateway && pnpm exec jest ...` or `cd ws-gateway && pnpm exec jest ...` (same pattern)                  |
| System E2E (target = system)                | `pnpm test:e2e:suite smoke` or `pnpm test:e2e:suite <pattern>`                                              |
| E2E with Docker (target = system or filter) | `pnpm test:e2e:docker` or `bash scripts/test/run-e2e.sh [auth\|users\|...]`                                 |
| All E2E (only if user asked “all”)          | `pnpm test:e2e`                                                                                             |
| Jest no cache                               | Add `--no-cache` to the jest command                                                                        |

---

## Checklist After Run–Debug–Fix

- [ ] **Target(s)** were clearly specified; only those service(s)/worker(s)/gateway/ws-gateway were run and modified.
- [ ] Failing test(s) identified from Jest output (test name, file, line, expected/received).
- [ ] Root cause classified: assertion, setup, app code, env/DB, or mock/dependency.
- [ ] Fix applied to the correct layer; no loosening of assertions per 602.
- [ ] Failing test and full e2e **for the target(s)** re-run and pass.
- [ ] Within the target(s), patterns aligned (setup, auth, assertions); cross-target alignment only if user asked.
- [ ] Reference docs (601, 602) or package scripts updated if behavior or structure changed.
- [ ] Libs vs mocks respected: real libs for in-repo code; mocks only for external infra or determinism; `overrideProvider` in setup preferred for Nest infra services.
