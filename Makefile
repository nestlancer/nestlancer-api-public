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

dev: ## Start Docker services + run all apps in dev mode
	docker compose -f docker-compose.yml up -d
	pnpm dev

dev-services: ## Start only infrastructure services (Mailpit, S3 storage, Jaeger)
	docker compose -f docker-compose.yml up -d

dev-full: ## Start all infra including S3-compatible storage and Jaeger
	docker compose -f docker-compose.yml --profile full up -d

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

test-e2e-full: ## Run end-to-end tests with full Docker lifecycle (start → test → teardown)
	bash scripts/test/run-e2e.sh

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

dev-docker-up: ## Start all 26 containers in watch mode (detached)
	docker compose -f docker-compose.dev.yml up -d

dev-docker-down: ## Stop and remove all dev containers
	docker compose -f docker-compose.dev.yml down

dev-docker-logs: ## Follow logs from all dev containers
	docker compose -f docker-compose.dev.yml logs -f --tail=100

dev-docker-restart: ## Restart a single service (usage: make dev-docker-restart SERVICE=svc-auth)
	docker compose -f docker-compose.dev.yml restart $(SERVICE)

# ─── Docker (legacy infra-only) ────────────────────

docker-up: ## Start infrastructure services for development
	docker compose -f docker-compose.yml up -d

docker-down: ## Stop all Docker services
	docker compose -f docker-compose.yml down

docker-up-full: ## Start all services including S3-compatible storage and Jaeger
	docker compose -f docker-compose.yml --profile full up -d

docker-test: ## Start test infrastructure
	docker compose -f docker-compose.yml up -d

docker-test-up: ## Start full E2E test stack (all services + workers)
	docker compose -f docker-compose.yml -f docker-compose.test.yml up -d

docker-test-down: ## Stop E2E test stack and remove volumes
	docker compose -f docker-compose.yml -f docker-compose.test.yml down -v

docker-build: ## Build all Docker images
	bash scripts/docker/build-all.sh

docker-push: ## Push all Docker images to registry
	bash scripts/docker/push-all.sh

docker-clean: ## Clean up Docker resources
	bash scripts/docker/clean.sh

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
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
