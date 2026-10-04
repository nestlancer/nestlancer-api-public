<div align="center">

# Scripts catalog

### Every script under `scripts/`, grouped by responsibility, with a safety classification. Source of truth for `pnpm <verb>` and `make <target>` implementations — see [`docs/reference/commands.md`](../docs/reference/commands.md) for the command surface itself.

</div>

---

## 📖 Table of Contents

- [How to read this catalog](#how-to-read-this-catalog)
- [`ci/`](#ci)
- [`db/`](#db)
- [`deploy/`](#deploy)
- [`docker/`](#docker)
- [`docs/`](#docs)
- [`monitoring/`](#monitoring)
- [`openapi/`](#openapi)
- [Not under `scripts/` on purpose](#not-under-scripts-on-purpose)

---

## How to read this catalog

Each script is tagged with one status:

| Tag | Meaning |
| :-- | :-- |
| **active** | Called by a `pnpm` script, a `make` target, or CI, and verified working |
| **manual-only** | Not called by any automation on purpose — an operator runs it deliberately (deploy, rollback, repair) |
| **internal** | A private helper sourced by other scripts in the same directory (prefixed `_`), never run directly |
| **generator** | Produces committed output (docs, Compose, K3s manifests) from source-of-truth data; re-run after the inputs change, don't hand-edit the output |

Shell scripts resolve the repository root from their own location (`SCRIPT_DIR`/`ROOT_DIR`), use
`set -euo pipefail`, and read secrets from `.env.infisical` (gitignored) rather than accepting them
as arguments. Node generators resolve the repository root from `import.meta.url`, never from `cwd`.

---

## `ci/`

CI/CD and release helpers — not run by GitHub Actions itself, but used to reproduce or feed it.

| Script | Status | Purpose |
| :-- | :-- | :-- |
| `cd-local.sh` | manual-only | Simulates the backend CD pipeline (`cd.yml`) locally: install, Prisma generate, build. Does **not** run migrations or an SSH deploy. |
| `infisical-export-github-env.sh` | manual-only | Loads Infisical secrets into `GITHUB_ENV` for optional workflows. The main `cd.yml` does **not** use this (it builds without a DB; the VPS exports Infisical at deploy time). |

## `db/`

Prisma, migration, and database-status workflows. Called by the `pnpm db:*` namespace.

| Script | Status | Purpose |
| :-- | :-- | :-- |
| `_load-env.sh` | internal | Shared env loading, sourced by the other `db/*.sh` scripts. Do not run directly. |
| `_prisma-node.sh` | internal | Resolves a Node binary compatible with Prisma 7 (`>=20.19`). Sourced only. |
| `migrate-bootstrap.sh` | active (`pnpm db:migrate:bootstrap`) | First-time bootstrap: generate client, apply migrations. |
| `migrate-deploy-ci.sh` | active (`pnpm db:migrate:deploy`, CI) | Non-interactive `prisma migrate deploy` using the DDL-only migration DB user. |
| `migrate-deploy.sh` | manual-only (`pnpm db:migrate:deploy:manual`) | Interactive migration apply on a VPS/Tailscale host — intentionally not part of CD. |
| `migrate-status.sh` | active (`pnpm db:migrate:status`) | Read-only migration status check. |
| `prisma-generate.sh` | active (`pnpm db:generate`) | Generates the Prisma client with the correct Node binary. |
| `apply-pending-migrations.js` | manual-only (`pnpm db:migrate:deploy:sql`) | Applies Prisma SQL migrations directly, bypassing the Prisma CLI — a workaround path, not the default. |
| `append-prisma-sql.sh` | manual-only | Appends hand-written SQL (constraints/triggers) to a generated migration file after table DDL. |
| `repairs/*.sql` | manual-only | Historical one-off data-repair SQL (`historical-row-repairs.sql`, `remediate-audit-c1-c2-h3.sql`, `remediate-payment-client-id-drift.sql`). Operator-invoked against a specific incident; never run automatically. Keep even though nothing calls them automatically. |

## `deploy/`

K3s and VPS deployment, validation, rollback, and smoke checks. Called by `pnpm k3s:*` and
`pnpm docker:prod:smoke`, plus manual operator use.

| Script | Status | Purpose |
| :-- | :-- | :-- |
| `generate-k3s-manifests.mjs` | generator (`pnpm k3s:generate`) | Generates Deployment/Service/Ingress manifests from `scripts/docker/workloads.manifest.json` (the workload source of truth). Don't hand-edit `deploy/k3s/base/workloads/*.yaml`. |
| `k3s-validate.sh` | active (`pnpm k3s:validate`) | Validates all Kustomize overlays compile — no cluster required. |
| `k3s-local-test.sh` | active (`pnpm k3s:local:test`) | Local K3s smoke test; validates manifests and optionally spins up a `k3d` cluster. |
| `k3s-deploy.sh` | manual-only | Deploys to K3s via a Kustomize overlay (`dev`/`staging`/`production`/`local`). |
| `rollback.sh` | manual-only | Rolls a VPS deploy back to a previous Git commit and restarts Compose. Destructive — operator-invoked only. |
| `smoke-health.sh` | active (`pnpm docker:prod:smoke`) | Post-deploy smoke test: gateway liveness/readiness, dumps logs on failure. |

## `docker/`

Compose, image, proxy, certificate, and workload helpers for local dev and production.

| Script | Status | Purpose |
| :-- | :-- | :-- |
| `_build-common.sh`, `_progress.sh` | internal | Shared helpers sourced by the build scripts below. |
| `compose-dev.sh` | active (`pnpm docker:up`/`down`/`restart`/`ps`/`logs*`/`build*`) | Batched Compose bring-up/down against `docker-compose.dev.yml` + `docker-compose.local.yml`, using Infisical-sourced secrets. |
| `compose-prod.sh` | active (`pnpm docker:prod:*`) | Compose operations against `docker-compose.prod.yml`. |
| `build-all-prod-images.sh` | active (`pnpm docker:prod:build`) | Builds all 28 production images (set `NESTLANCER_BAKE_OUTPUT=push` to also push to GHCR). |
| `build-affected-prod-images.sh` | active (`pnpm docker:prod:build:affected`) | Builds only images affected by the current changeset (via `resolve-affected-targets.sh`). |
| `build-group-prod-images.sh` | active (internal to the above) | Builds one workload group (gateways/services/workers) at a time. |
| `build-prod-image.sh` | active (`pnpm docker:prod:build:one`) | Builds a single named image. |
| `resolve-affected-targets.sh` | internal | Computes the affected-image set for `build-affected-prod-images.sh`. |
| `generate-prod-compose.mjs` | generator (`pnpm docker:prod:generate`) | Generates `docker-compose.prod.yml` from `workloads.manifest.json`. |
| `run-nest-workload.sh` | internal | Entry point used inside app containers to start the correct Nest app. |
| `proxy-prod-up.sh` | active (`pnpm docker:prod:proxy:up`) | Brings up the production Caddy proxy (`docker-compose.prod.proxy.yml`). |
| `ensure-prod-origin-certs.sh` / `install-prod-origin-certs.sh` | manual-only | Provision/install Cloudflare Origin CA certs for the production proxy. |
| `reload-prod-secrets.sh` | manual-only | Re-pulls Infisical secrets into a running production stack. |
| `sanitize-infisical-env.sh` | manual-only | Strips sensitive values before sharing an exported env file. |
| `harden-host-ssh-safe.sh` | manual-only (`pnpm docker:harden:host`) | SSH-safe host hardening for a dev VPS — destructive-adjacent, operator-invoked. |
| `verify-dev-host.sh` | active (`pnpm docker:verify:dev-host`) | Verifies the dev proxy is routing correctly. |
| `service-health-endpoints.mjs` | manual-only | Prints each service's health-check URL for manual spot checks. |
| `workloads.manifest.json` | **source of truth** (not a script) | Canonical list of every gateway/service/worker, its port, Dockerfile, and per-environment config. `generate-prod-compose.mjs` and `generate-k3s-manifests.mjs` both read this file — edit it, not their output. |

## `docs/`

Documentation generators. **New directory** — these two scripts lived loose at `scripts/` root
before this pass; they are generators, not one-off tools, and had no home of their own.

| Script | Status | Purpose |
| :-- | :-- | :-- |
| `generate-component-docs.mjs` | generator (`pnpm docs:components`) | Regenerates `docs/components/{services,workers,libs}/*.md` plus the four category index pages (`docs/components/README.md`, `.../services/README.md`, `.../workers/README.md`, `.../libs/README.md`) from hand-curated metadata tables in this file **and** live source facts: real HTTP routes parsed from `services/*/src/controllers/**/*.controller.ts`, real `@nestlancer/*` and external dependencies read from each `package.json`, and — for libraries — a real `libs/<name>/src/` directory tree plus every exported symbol resolved by walking the actual `export * from '...'` graph starting at `index.ts`. **Edit the metadata tables in this script**, not the generated `.md` files, when a service/worker/lib's behavior or description changes; everything else regenerates straight from source and will be overwritten. Run `pnpm format` afterwards if you want Prettier's table-column alignment applied (the generator's raw output is valid Markdown but not Prettier-padded). |
| `generate-changelog.mjs` | generator (`pnpm docs:changelog`) | Rebuilds `CHANGELOG.md` and `docs/changelog/CHANGELOG.md` from `git log`, grouped by month. In this checkout specifically, Git history is shallow (2 commits from the sanitized export) — see `docs/README.md` for that caveat before re-running. |

## `monitoring/`

Metrics-target generation and verification. **New directory** — both scripts lived loose at
`scripts/` root before this pass.

| Script | Status | Purpose |
| :-- | :-- | :-- |
| `generate-app-metrics-targets.sh` | active (`pnpm monitoring:targets`) | Prints live Prometheus scrape targets for the app tier from the current environment. Used by `config/prometheus-scrape.example.yml` and `config/app-metrics-targets.example.env` as a worked example. |
| `verify-monitoring.sh` | active (`pnpm verify:monitoring`) | Checks that Prometheus/Grafana/Alertmanager endpoints implied by `.env.infisical` are reachable and sane. |

## `openapi/`

OpenAPI generation, normalization, diffing, and linting. See its own
[`scripts/openapi/README.md`](openapi/README.md) for the detailed workflow — summarized here only.

| Script | Status | Purpose |
| :-- | :-- | :-- |
| `export-merged-openapi.mjs` | generator (`pnpm openapi:export` / `contract:refresh`) | Pulls the live merged OpenAPI JSON from the gateway into `docs/api/openapi-merged.json`. |
| `normalize-openapi-document.mjs` | internal | Strips `/regex/` delimiters and invalid nested `required` booleans before linting. |
| `openapi-diff.mjs` | active (`pnpm openapi:diff`) | Compares the current export to `openapi-merged.json.baseline` for local breaking-change checks. |
| `apply-gateway-api-params.mjs` | manual-only (`pnpm openapi:gateway-params`) | Codemod that applies `@ApiParam` decorators to gateway proxy routes. |
| `apply-gateway-standard-responses.mjs` | manual-only (`pnpm openapi:gateway-responses`) | Codemod that applies standard response decorators to gateway routes. |
| `apply-api-standard-responses.mjs` | manual-only | Same, for non-gateway service controllers. |

## Not under `scripts/` on purpose

- `seed/` — Python/shell seeding and demo-data tooling. Kept separate from `scripts/` because it
  has its own lifecycle (phases, payload fixtures, a reset subsystem) and is invoked via
  `seed/seed.sh`, not `pnpm db:*`'s thin wrappers. See `seed/README.md`.
- `prod-data/` — a single `run-seed.sh` helper colocated with production seed/runtime data; not a
  general-purpose script.
