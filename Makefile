# ──────────────────────────────────────────────────
# Nestlancer Backend – Developer Makefile
# ──────────────────────────────────────────────────

.PHONY: install dev build test test-unit test-e2e test-e2e-full test-integration lint format \
        db-migrate db-migrate-deploy db-migrate-status db-migrate-deploy-manual db-seed db-reset db-studio \
        docker-up docker-down docker-up-full docker-test docker-test-up docker-test-down docker-build docker-push \
        dev-docker-build dev-docker-up dev-docker-down dev-docker-logs dev-docker-restart \
        clean help

# ─── Dependencies ──────────────────────────────────

install: ## Install dependencies + generate Prisma client
	pnpm install
	pnpm db:generate

# ─── Development ───────────────────────────────────
#
# NOTE: Nestlancer does not run PostgreSQL/Redis/RabbitMQ/Mailpit/S3/MeiliSearch via local
# Docker Compose. Infra runs externally on a shared dev VPS over Tailscale (see the header
# comment in docker-compose.dev.yml and docs/development/local-workflow.md). There is no
# "docker-compose.yml" in this repo and no local infra-only bring-up target — connect to the
# shared infra via Infisical-provided environment variables instead.

dev: ## Start the Dockerized app stack (core) + run all apps in watch mode
	pnpm docker:up
	pnpm dev

dev-services: ## [RETIRED] Local infra-only bring-up is not supported
	@echo "dev-services is retired: infra (Postgres/Redis/RabbitMQ/Mailpit/S3/MeiliSearch) runs" ; \
	echo "externally on the shared dev VPS over Tailscale, not via local Docker Compose." ; \
	echo "See docs/development/local-workflow.md for how to point at the shared dev infra." ; \
	exit 1

dev-full: ## [RETIRED] Local infra-only bring-up is not supported
	@echo "dev-full is retired: infra (Postgres/Redis/RabbitMQ/Mailpit/S3/MeiliSearch) runs" ; \
	echo "externally on the shared dev VPS over Tailscale, not via local Docker Compose." ; \
	echo "See docs/development/local-workflow.md for how to point at the shared dev infra." ; \
	exit 1

# ─── Build ─────────────────────────────────────────

build: ## Build all packages (topological order via Turborepo)
	pnpm build

# ─── Testing ───────────────────────────────────────

test: ## Run full test suite
	pnpm test

test-unit: ## Run unit tests only
	pnpm test:unit

test-e2e: ## Run end-to-end tests (requires Docker services)
	pnpm test:e2e

test-e2e-full: ## [RETIRED] Full Docker E2E lifecycle script does not exist yet
	@echo "test-e2e-full is retired: scripts/test/run-e2e.sh does not exist, and the" ; \
	echo "docker-compose.e2e.yml stack it depended on was never added to this repo." ; \
	echo "Use 'pnpm test:e2e' against a stack you started yourself (pnpm docker:up or pnpm dev)." ; \
	echo "See docs/development/testing.md for the current, verified E2E workflow." ; \
	exit 1

test-integration: ## Run integration tests (requires Docker services)
	pnpm test:integration

test-cov: ## Run tests with coverage report
	pnpm test:cov

# ─── Code Quality ──────────────────────────────────

lint: ## Run ESLint across all packages
	pnpm lint

lint-fix: ## Run ESLint with auto-fix
	pnpm lint:fix

format: ## Format code with Prettier
	pnpm format

format-check: ## Check formatting (CI)
	pnpm format:check

# ─── Database ──────────────────────────────────────

db-migrate: ## Create/apply migration in dev (prisma migrate dev — local only)
	pnpm db:migrate

db-migrate-status: ## Show pending/applied migrations (no changes)
	pnpm db:migrate:status

db-migrate-deploy: ## Apply pending migrations (requires DATABASE_URL; not run in CD)
	pnpm db:migrate:deploy

db-migrate-deploy-manual: ## Interactive apply on VPS/Tailscale (scripts/db/migrate-deploy.sh)
	pnpm db:migrate:deploy:manual

db-seed: ## Seed the database
	pnpm db:seed

db-reset: ## Reset database (drop + recreate + migrate + seed)
	pnpm db:reset

db-generate: ## Generate Prisma client
	pnpm db:generate

db-studio: ## Open Prisma Studio
	pnpm db:studio

# ─── Docker Dev (watch-mode containers) ───────────

dev-docker-build: ## Build the shared nestlancer-dev image
	docker compose -f docker-compose.dev.yml build

dev-docker-up: ## Start gateway + ws-gateway + all 16 services in watch mode (18 containers; add COMPOSE_PROFILES=workers for the 10 workers too)
	docker compose -f docker-compose.dev.yml up -d

dev-docker-down: ## Stop and remove all dev containers
	docker compose -f docker-compose.dev.yml down

dev-docker-logs: ## Follow logs from all dev containers
	docker compose -f docker-compose.dev.yml logs -f --tail=100

dev-docker-restart: ## Restart a single service (usage: make dev-docker-restart SERVICE=svc-auth)
	docker compose -f docker-compose.dev.yml restart $(SERVICE)

# ─── Docker (core dev stack + production images) ───
#
# These targets are thin aliases onto the real pnpm docker:* / docker:prod:* scripts in
# package.json (the source of truth — see docs/reference/commands.md). They previously pointed
# at a "docker-compose.yml" / "docker-compose.test.yml" that do not exist in this repo; fixed to
# call the real scripts instead.

docker-up: ## Start the core Dockerized app stack (gateway + ws-gateway + 16 services)
	pnpm docker:up

docker-down: ## Stop the Dockerized app stack
	pnpm docker:down

docker-up-full: ## Start the full Dockerized app stack (core + all 10 workers)
	pnpm docker:up:full

docker-test: ## [RETIRED] No local test-infra Compose file exists
	@echo "docker-test is retired: there is no docker-compose.yml/docker-compose.test.yml in" ; \
	echo "this repo. Use 'pnpm docker:up' (core) or 'pnpm docker:up:full' (core + workers) and" ; \
	echo "run tests against that stack. See docs/development/testing.md." ; \
	exit 1

docker-test-up: ## [RETIRED] docker-compose.e2e.yml / docker-compose.test.yml do not exist
	@echo "docker-test-up is retired: docker-compose.test.yml does not exist, and the" ; \
	echo "docker-compose.e2e.yml referenced by 'pnpm docker:e2e:*' was also never added to this" ; \
	echo "repo. See docs/development/testing.md for the current, verified test workflow." ; \
	exit 1

docker-test-down: ## [RETIRED] docker-compose.e2e.yml / docker-compose.test.yml do not exist
	@echo "docker-test-down is retired for the same reason as docker-test-up." ; \
	echo "See docs/development/testing.md for the current, verified test workflow." ; \
	exit 1

docker-build: ## Build all production Docker images (GHCR-tagged, via scripts/docker)
	pnpm docker:prod:build

docker-push: ## Build AND push all production Docker images to GHCR
	NESTLANCER_BAKE_OUTPUT=push pnpm docker:prod:build

docker-clean: ## [RETIRED] No safe automated Docker-prune wrapper exists in this repo
	@echo "docker-clean is retired: scripts/docker/clean.sh never existed, and this repo has no" ; \
	echo "safe wrapper around destructive commands like 'docker system prune'. Run Docker's" ; \
	echo "own prune commands manually and review what will be removed before confirming." ; \
	exit 1

# ─── Logs ──────────────────────────────────────────

logs: ## Tail logs from all dev containers
	docker compose -f docker-compose.dev.yml logs -f --tail=100

logs-service: ## Tail logs for a specific service (usage: make logs-service SERVICE=svc-auth)
	docker compose -f docker-compose.dev.yml logs -f --tail=100 $(SERVICE)

# ─── Cleanup ───────────────────────────────────────

clean: ## Remove dist, coverage, node_modules, and Turborepo cache
	pnpm clean
	rm -rf node_modules
	rm -rf coverage
	rm -rf .turbo

# ─── Help ──────────────────────────────────────────

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
