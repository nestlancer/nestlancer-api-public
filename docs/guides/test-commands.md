<div align="center">

# Professional testing commands — Nestlancer backend API

</div>

---

## 📖 Table of Contents

- [1. Turborepo (recommended)](#1-turborepo-recommended)
- [2. End-to-end (`test:e2e`)](#2-end-to-end-teste2e)
- [3. System / cross-cutting smoke tests](#3-system-cross-cutting-smoke-tests)
- [4. Jest directly (single files / debugging)](#4-jest-directly-single-files-debugging)
- [5. Coverage](#5-coverage)
- [6. Why this setup](#6-why-this-setup)
- [7. Troubleshooting](#7-troubleshooting)
- [8. Package script reference (quick)](#8-package-script-reference-quick)

---

## 1. Turborepo (recommended)

Turbo respects dependency graphs, caches where enabled, and runs each workspace’s tests in isolation.

### Run all tests

```bash
pnpm test                  # turbo `test` (per-package default)
pnpm test:unit             # all workspaces that define test:unit (Node heap 4096 MB)
pnpm test:integration      # all workspaces that define test:integration (Node heap 4096 MB)
pnpm test:e2e              # all workspaces that define test:e2e — see § 2 below
pnpm test:cov              # coverage (Node heap 4096 MB)
```

### Run one workspace

Use **`--filter`** with the npm package name from that workspace’s `package.json` (`"name": "@nestlancer/..."`).

```bash
pnpm test:unit --filter=@nestlancer/contact-service
pnpm test:integration --filter=@nestlancer/auth-service
pnpm test:e2e --filter=@nestlancer/payments-service
pnpm test --filter=@nestlancer/common
```

Do **not** rely on `npx jest <some-folder>` from the root for “whole package” runs; use Turbo filters so the correct Jest config and roots apply.

---

## 2. End-to-end (`test:e2e`)

Per-package E2E tests live under each app’s `e2e/` folder (`jest --config e2e/jest.e2e.config.ts --runInBand`). They usually load **`.env.e2e`** and talk to real **Postgres**, **Redis**, **RabbitMQ**, etc., when configured.

### Default (stable): sequential Turbo tasks

```bash
pnpm test:e2e
```

This runs `turbo test:e2e --concurrency=1` — **only one package’s E2E suite at a time**. That avoids **PostgreSQL deadlocks** when many suites seed or upsert against the **same database** in parallel.

Expect roughly **10–15 minutes** for the full monorepo on typical CI hardware.

### Faster (risky on one shared DB)

```bash
pnpm test:e2e:parallel     # turbo test:e2e — default Turbo parallelism
```

Use only if workers are isolated (separate DBs) or you accept intermittent **`deadlock detected`** / flaky seeds.

### Docker-driven E2E

```bash
pnpm test:e2e:docker       # bash scripts/test/run-e2e.sh
```

Use when the project documents spinning up dependencies via Compose or the script’s expectations.

---

## 3. System / cross-cutting smoke tests

Root-level specs under `tests/system/` validate wiring (e.g. gateway health and routing) **without** mixing in per-package `e2e/` directories.

```bash
pnpm test:system           # jest --config tests/system/jest.system.config.ts --runInBand
```

Requires the same **infra and env** those smoke specs expect (see `tests/system/setup/`).

---

## 4. Jest directly (single files / debugging)

Use when iterating on one spec file.

### One file

```bash
npx jest libs/common/tests/unit/utils/hash.util.spec.ts
```

### By test name

```bash
npx jest -t "should process a refund"
```

### Workers / services from package directory

```bash
cd services/contact && pnpm test:unit
```

---

## 5. Coverage

```bash
pnpm test:cov
pnpm test:cov --filter=@nestlancer/contact-service
```

---

## 6. Why this setup

- **Consistency**: Shared [`jest.config.base.ts`](../../jest.config.base.ts); root [`jest.config.ts`](../../jest.config.ts) uses **projects** where applicable.
- **Turborepo**: Scoped runs via `--filter`, caching for tasks that enable it (`test:e2e` has caching off in `turbo.json`).
- **Path mapping**: Workspace imports (`@nestlancer/*`) resolve via `tsconfig.base.json`.
- **Memory**: `test:unit`, `test:integration`, and `test:cov` set **`NODE_OPTIONS='--max-old-space-size=4096'`** in the root scripts to reduce OOM during large suites.

---

## 7. Troubleshooting

### Running a path runs the wrong tests or everything

From the repo root, bare `npx jest services/contact` often does not match how **projects** / roots are set up.

**Prefer:** `pnpm test:unit --filter=@nestlancer/contact-service` (or `cd` into the package and run its `pnpm test:unit`).

### E2E failures only when running “all packages”

If full `pnpm test:e2e:parallel` fails with **`deadlock detected`** or strange DB errors but **`pnpm test:e2e`** passes, the cause is usually **parallel seeds on one Postgres**. Keep the default **`pnpm test:e2e`** for CI and full verification.

### “Unknown option” / duplicate Jest options

Keep global-only options (e.g. some reporters) in the root Jest config; avoid duplicating them in every package.

### Out of memory

1. Use **`pnpm test:unit`** / **`pnpm test:integration`** (they raise the Node heap via root scripts).
2. Use **Turbo** so each workspace runs in its own process.
3. For a single file: `npx jest --maxWorkers=2 path/to/spec.ts`.

### ESLint / TS in tests

Smoke / system tests may use `tsconfig.test.json` with relaxed checks — see `tests/system/jest.system.config.ts`.

---

## 8. Package script reference (quick)

| Script             | Typical meaning                                    |
| :----------------- | :------------------------------------------------- |
| `test`             | Package default (often Jest with default patterns) |
| `test:unit`        | `jest --testPathPattern=tests/unit`                |
| `test:integration` | `jest --testPathPattern=tests/integration`         |
| `test:e2e`         | `jest --config e2e/jest.e2e.config.ts --runInBand` |

Libraries under `libs/*` usually expose **`test:unit`** and **`test:integration`** only; application E2E lives on **services**, **workers**, and **gateways**.

---

<div align="center">

**Professional testing commands — Nestlancer backend API** — Nestlancer guide

</div>
