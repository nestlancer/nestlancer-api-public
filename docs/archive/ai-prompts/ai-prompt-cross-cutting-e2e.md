## 📖 Table of Contents

- [Prompt (copy from here)](#prompt-copy-from-here)
- [Prompt (copy ends here)](#prompt-copy-ends-here)
- [Notes for humans (not part of the AI prompt)](#notes-for-humans-not-part-of-the-ai-prompt)

---

## Prompt (copy from here)

You are working in a **pnpm + Turborepo NestJS monorepo** called **nestlancer-backend-api**. The repo already has **per-package** Jest E2E under each `services/*/e2e`, `gateway/e2e`, `ws-gateway/e2e`, and `workers/*/e2e`. Those tests validate individual apps in isolation.

### Goal

Design and implement a **minimal but representative cross-cutting E2E layer** that proves the **whole platform wiring** works together:

- HTTP traffic can enter through **`gateway`** (and optionally hit underlying services directly only if that matches production topology).
- **`ws-gateway`** can authenticate/connect at least one WebSocket path relevant to the product (smoke).
- At least one **worker** path is exercised in a way that reflects production (queue consumer registered + safe mocks or real RabbitMQ per `.env.e2e`).
- Shared infra is honored: **Postgres** (Prisma / migrations), **Redis**, **RabbitMQ**, **JWT**, and **`.env.e2e`**.

Do **not** duplicate every existing per-service E2E file. Add **1–2 orchestrated test entrypoints** plus **setup/config** that act as a **system smoke suite**.

### What you must do first (discovery)

1. Read **`package.json`** at repo root for scripts: `test:e2e`, `test:e2e:docker`, turbo filters.
2. Read **`turbo.json`** for task dependencies and env passthrough.
3. Read **`docs/testing-report.md`** if present for package inventory and conventions.
4. Inspect **`gateway`** routing/proxy config to see how requests map to `AUTH_SERVICE_URL`, `USERS_SERVICE_URL`, etc. (or equivalent env vars).
5. Inspect **`scripts/test/run-e2e.sh`** (if present) for how Docker or infra is started.
6. Read **`.env.e2e`** (or documented env template) for ports, URLs, and feature flags—**never commit secrets**; use placeholders in docs and real values only in local ignored files.

### Deliverables

1. **Config**
   - A root-level Jest config dedicated to cross-cutting tests (e.g. `tests/system/jest.system.config.ts` or reuse `tests/e2e/jest.e2e.config.ts` if it already exists—consolidate names so `pnpm test:system` is obvious).
   - TypeScript paths/tsconfig that compile tests from repo root without breaking package-local Jest.

2. **Setup helpers** (single place)
   - **`tests/system/setup/env.ts`**: load `.env.e2e`, validate required vars exist (fail fast with a clear message).
   - **`tests/system/setup/http.ts`**: build base URLs for gateway vs direct services from env (no hardcoded IPs except localhost defaults documented).
   - **`tests/system/setup/auth.ts`** (optional): fetch or mint tokens consistent with existing E2E fixtures (reuse helpers from `gateway/e2e` or `services/auth/e2e` if possible—**prefer importing shared helpers** over copy-paste).

3. **Exactly 1–2 test files** (essential smoke only)

   **File A — `tests/system/gateway-health-and-routing.smoke.spec.ts`**
   - Assert gateway **health** responds OK.
   - Assert **one downstream read** through the gateway (e.g. aggregated health, or a cheap public route documented in gateway) returns expected envelope/status codes.
   - If routing requires auth, use the same token strategy as existing E2E packages.

   **File B — `tests/system/platform-wiring.smoke.spec.ts`** (or split only if necessary)
   - **Postgres**: trivial query or call a minimal endpoint that touches DB (prefer via gateway if that is the real path).
   - **Redis**: ping or hit an endpoint known to use cache (only if stable in CI).
   - **RabbitMQ**: either verify queue publisher connects (non-destructive) or run **one worker package’s existing E2e bootstrap pattern** in-process—choose the approach that is **least flaky** and document why.
   - **`ws-gateway`**: open a WebSocket to the configured URL, complete handshake (and subscribe/ping if the protocol requires it), then close—**timeout bounded** (e.g. 10s).

   Keep tests **idempotent** and safe for shared dev databases (no mass deletes unless existing seeds already handle it).

4. **npm script**

   Add to root **`package.json`**:

   ```json
   "test:system": "jest --config tests/system/jest.system.config.ts --runInBand"
   ```

   Optionally wire **`pnpm turbo`** only if you introduce a workspace package; otherwise root Jest is fine.

5. **Documentation**

   Update **`docs/testing-report.md`** (or add **`docs/system-e2e.md`**) with:
   - prerequisites (Docker compose services, migrate, seed),
   - command to run `test:system`,
   - what is **not** covered (full business flows remain in per-service E2e).

### Constraints

- **Minimal diff**: do not refactor unrelated services; add root `tests/system/*` and small script/doc changes only unless a tiny export from an existing `e2e/setup.ts` is required.
- **No secrets in git**: document env var **names** only.
- **Flakiness**: avoid timing races; use retries only as a last resort and document them.
- **Replica lag**: if a test does POST then GET, ensure reads go to primary or wait appropriately—mirror fixes already applied elsewhere in the codebase (search for `prismaWrite`, read-after-write patterns).

### Acceptance criteria

- `pnpm test:system` runs locally when `.env.e2e` and infra match project docs.
- Tests fail with **actionable errors** (missing env var, connection refused) not obscure Jest stack traces only.
- CI can run this suite after `pnpm test:e2e` or in parallel **only if** infra supports it; document ordering if DB migrations must run first.

### Output format

When you implement, respond with:

1. Files added/changed (list).
2. How to run (`pnpm test:system`).
3. Known limitations and next iterations (deeper flows, more workers).

---

## Prompt (copy ends here)

---

## Notes for humans (not part of the AI prompt)

- This prompt intentionally asks for **smoke-level** coverage so one agent session can finish without rewriting the whole monorepo.
- If your gateway requires many upstream services up at once, narrow **File A** to **gateway health + one routed ping** only, and move deeper checks to per-package E2E (already present).
