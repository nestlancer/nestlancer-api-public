<div align="center">

# Command reference

### Every `pnpm` script and `make` target, where it's implemented, and whether it currently works. Verified against `package.json` and `Makefile` on 2026-10-03.

</div>

---

## 📖 Table of Contents

- [How these two command surfaces relate](#how-these-two-command-surfaces-relate)
- [`pnpm` namespaces](#pnpm-namespaces)
- [`make` targets](#make-targets)
- [Known-broken / retired commands](#known-broken--retired-commands)

---

## How these two command surfaces relate

This repo exposes **two** command surfaces:

- **`pnpm <script>`** (defined in root `package.json`) — the primary, actively-maintained surface.
  Nearly everything below is implemented here first.
- **`make <target>`** (defined in root `Makefile`) — a thin convenience wrapper using more
  Unix-conventional names (`test-unit` instead of `test:unit`). As of the 2026-10 documentation
  reset, every working `make` target calls the equivalent `pnpm` script rather than duplicating
  logic — `Makefile` is not a second source of truth.

If a `pnpm` script and a `make` target appear to do the same thing, they do — `make` was fixed to
delegate rather than carry its own (previously broken) implementation. See
[Known-broken / retired commands](#known-broken--retired-commands) for what was fixed and what was
retired instead of fixed.

## `pnpm` namespaces

| Namespace | Scripts | Notes |
| :-- | :-- | :-- |
| Core | `dev`, `build`, `build:log`, `clean`, `clean:dist` | `dev`/`build` run via Turborepo across all workspaces |
| Lint/format | `lint`, `lint:fix`, `format`, `format:check` | |
| Tests | `test`, `test:unit`, `test:integration`, `test:e2e`, `test:e2e:parallel`, `test:e2e:suite`, `test:cov` | `test:e2e` requires a running stack (`pnpm docker:up` or `pnpm dev`) |
| System tests | `test:system`, `test:system:smoke`, `test:system:e2e`, `test:system:infra`, `test:system:workers`, `test:system:services` | Run `tests/system/**` via a dedicated Jest config |
| Database | `db:validate`, `db:migrate`, `db:migrate:status`, `db:migrate:deploy`, `db:migrate:bootstrap`, `db:migrate:deploy:sql`, `db:migrate:deploy:manual`, `db:seed`, `db:reset`, `db:generate`, `db:studio`, `db:bootstrap` | See [`scripts/README.md`](../../scripts/README.md#db) for which are manual-only |
| Docker (dev) | `docker:build[:nocache]`, `docker:up[:workers\|:full]`, `docker:down[:core\|:workers]`, `docker:logs*`, `docker:ps`, `docker:restart`, `docker:start`, `docker:harden:host`, `docker:verify:dev-host`, `docker:proxy:logs` | Operates on `docker-compose.dev.yml` + `docker-compose.local.yml` |
| Docker (prod) | `docker:prod:generate`, `docker:prod:build[:affected\|:one]`, `docker:prod:pull`, `docker:prod:up`, `docker:prod:down`, `docker:prod:ps`, `docker:prod:logs`, `docker:prod:migrate`, `docker:prod:run`, `docker:prod:start`, `docker:prod:proxy:up\|:down`, `docker:prod:reload-secrets`, `docker:prod:certs:ensure\|:install`, `docker:prod:smoke` | Operates on `docker-compose.prod*.yml` |
| Docker (e2e) | `docker:e2e:build\|:up\|:down\|:logs*\|:ps`, `test:system:docker` | **Blocked** — all depend on `docker-compose.e2e.yml`, which doesn't exist. `pnpm test:e2e:docker` itself was turned into a clear "retired" message (not a working command) rather than a silent failure — see [Known-broken](#known-broken--retired-commands) |
| K3s | `k3s:generate`, `k3s:validate`, `k3s:local:test` | |
| OpenAPI/contract | `openapi:gateway-params`, `openapi:gateway-responses`, `openapi:export`, `openapi:lint[:merged]`, `openapi:diff`, `swagger:validate` (alias of `openapi:lint`), `contract:check` (alias of `openapi:lint`), `contract:refresh` (alias of `openapi:export`) | |
| Docs | `docs:components`, `docs:changelog` | **Added in the 2026-10 reset** — wire to the relocated generators in `scripts/docs/` |
| Monitoring | `verify:monitoring`, `monitoring:targets` | **`monitoring:targets` added in the 2026-10 reset**; `verify:monitoring`'s path was fixed after the `scripts/monitoring/` move |

## `make` targets

Run `make help` for the live list (41 targets, grouped by section in the `Makefile`). Summary:

| Group | Targets | Status |
| :-- | :-- | :-- |
| Install/build/test/lint/format | `install`, `build`, `test*`, `lint*`, `format*` | Working — thin `pnpm` wrappers |
| Database | `db-migrate*`, `db-seed`, `db-reset`, `db-generate`, `db-studio` | Working — thin `pnpm db:*` wrappers |
| Dev stack | `dev`, `dev-docker-build\|up\|down\|logs\|restart` | Working — `dev-docker-up` starts gateway+ws-gateway+16 services (18 containers); add `COMPOSE_PROFILES=workers` for the 10 workers |
| Docker (core/prod) | `docker-up`, `docker-down`, `docker-up-full`, `docker-build`, `docker-push` | Fixed in the 2026-10 reset — now call `pnpm docker:up`/`docker:down`/`docker:up:full`/`docker:prod:build` (optionally with `NESTLANCER_BAKE_OUTPUT=push`) |
| Logs/clean | `logs`, `logs-service`, `clean` | Working |
| **Retired (no safe replacement exists)** | `dev-services`, `dev-full`, `docker-test`, `docker-test-up`, `docker-test-down`, `test-e2e-full`, `docker-clean` | Print a clear explanation and exit 1 — see below |

## Known-broken / retired commands

These were broken before the 2026-10 documentation/script reset. Each is now either fixed (calls a
real command) or deliberately retired (prints an explanation instead of silently failing or
pointing at a missing file).

| Command | Before | After |
| :-- | :-- | :-- |
| `pnpm test:e2e:docker` | `echo ... && exit 1`, pointed you at `pnpm test:system:docker` — which was *also* broken | Still exits 1, but the message explains **why** (`docker-compose.e2e.yml` doesn't exist) and gives a working alternative (`pnpm test:e2e` against a stack you start yourself) |
| `pnpm docker:e2e:*`, `pnpm test:system:docker` | Reference `docker-compose.e2e.yml`, which doesn't exist | **Still blocked** — not fixed in this pass. Kept as-is (not deleted) because ~30 live test files under `tests/system/**` print `Run: pnpm docker:e2e:up` in their error messages. Creating a real `docker-compose.e2e.yml` is future work — see [`CONTRIBUTING.md`](../../CONTRIBUTING.md#known-non-standard-areas) |
| `make dev`, `docker-up`, `docker-down`, `docker-up-full` | Referenced `docker-compose.yml`, which has never existed in this repo | **Fixed** — now call `pnpm docker:up` / `docker:down` / `docker:up:full` |
| `make dev-services`, `dev-full` | Claimed to start "infrastructure services (Mailpit, S3, Jaeger)" via `docker-compose.yml` | **Retired** — this repo doesn't run infra via local Compose at all; Postgres/Redis/RabbitMQ/Mailpit/S3/MeiliSearch run externally on a shared dev VPS over Tailscale (see `docker-compose.dev.yml`'s header comment and [local workflow](../development/local-workflow.md)) |
| `make docker-test`, `docker-test-up`, `docker-test-down` | Referenced `docker-compose.yml` and/or `docker-compose.test.yml`, neither exists | **Retired** with an explanatory message |
| `make test-e2e-full` | Called `scripts/test/run-e2e.sh`, which doesn't exist | **Retired** — use `pnpm test:e2e` against a stack you started with `pnpm docker:up` or `pnpm dev` |
| `make docker-build`, `docker-push` | Called `scripts/docker/build-all.sh` / `push-all.sh`, neither exists | **Fixed** — now call `pnpm docker:prod:build` (set `NESTLANCER_BAKE_OUTPUT=push` to also push) |
| `make docker-clean` | Called `scripts/docker/clean.sh`, which doesn't exist | **Retired** — no safe automated wrapper around destructive `docker system prune`-style commands exists in this repo; run Docker's own prune commands manually and review what will be removed |
| `make help`'s own target-listing regex | `[a-zA-Z_-]+` silently excluded any target name containing a digit — `test-e2e` and `test-e2e-full` never appeared in `make help` output | **Fixed** — regex now includes `0-9` |
