## [Unreleased]

### Fixed

- fix(payments): dual-model work milestones link trailing deliveries to Final and expose billableAmount / inclusive flags
- fix(admin): payment hub budget no longer double-counts work + schedule amounts; installment progress labels

### Added

- Documentation overhaul: `docs/components/` for every service, worker, and library
- K3s/Terraform manifests and staging CD pipeline

---

## 2026-06 (5 commits)

### Added

- feat(deploy): add K3s/Terraform manifests and staging CD pipeline (`c9bbf8e`, 2026-06-01)

### Fixed

- fix(product): align API copy and tests with single-studio model (`906a8c9`, 2026-06-01)
- fix(users): wire admin GDPR export and add swagger:validate CI alias (`3f7129f`, 2026-06-01)

### Changed

- refactor(prisma): split prod and dev seeds with env-specific taxonomy (`6d5f4b3`, 2026-06-01)

### 📚 Documentation

- docs: add master implementation tracker and fix CI workflow paths (`dd86c62`, 2026-06-01)

---

## 2026-05 (77 commits)

### Added

- feat(admin): add user and project filters for pipeline drill-down (`7e91013`, 2026-05-31)
- feat(portfolio): add public timeline endpoint and fix Prisma JSON typing (`bb49642`, 2026-05-30)
- feat(openapi): enhance OpenAPI normalization and merge logic (`87ac090`, 2026-05-29)
- feat(openapi): harden merged spec and fix gateway webhook routing (`27c47f8`, 2026-05-29)
- feat(openapi): normalize merged spec and fix nested notification DTOs (`f77f4eb`, 2026-05-29)
- feat(openapi): unify merged spec contract source and standard responses (`2efe121`, 2026-05-29)
- feat(blog): expand admin APIs and harden public post reads (`308b833`, 2026-05-26)
- feat(storage,auth,requests): presigned downloads, permissions guard, and portfolio admin (`52dd78a`, 2026-05-24)
- feat(messages, media): enhance messaging and media handling with new endpoints and context management (`a044c71`, 2026-05-24)
- feat(media): chunked upload, public share links, and admin gateway parity (`51f039e`, 2026-05-23)
- feat: implement client IP handling and decorator for proxy-aware requests (`527ab6c`, 2026-05-23)
- feat(progress,payments): milestone lifecycle, paise contract, and admin gateway parity (`8cdf03b`, 2026-05-22)
- feat: payment-to-project lifecycle, centralized outbox routing, and Razorpay checkout config (`2c53e1a`, 2026-05-22)
- feat: gateway and service routes for payments, progress, and project schedules (`d1162f9`, 2026-05-21)
- feat: admin project/progress routes, quote-accepted project creation, and API gap fixes (`69be2a8`, 2026-05-21)
- feat: add admin requests/quotes gateway routes and harden 2FA and quote flows (`6ecbb90`, 2026-05-21)
- feat: implement admin user management API enhancements and password reset flow (`4bff9c8`, 2026-05-20)
- feat: add CI/CD workflows for backend deployment and testing (`f084810`, 2026-05-17)
- feat(admin): proxy user impersonation and document OpenAPI sources (`78f8075`, 2026-05-17)
- feat(gateway): add client dashboard-summary BFF with parallel upstream calls (`f99a8ef`, 2026-05-16)
- feat(messaging): add chat threads, realtime delivery, and project-scoped access (`92e371b`, 2026-05-15)
- feat: add logout and logout-all endpoints for session management (`3914a2a`, 2026-05-14)
- feat: implement role-based access control and enhance JWT handling (`88f10c1`, 2026-05-14)
- feat(tests): expand system testing suite with new E2E and smoke tests (`6832ed8`, 2026-05-05)
- feat(testing): add cross-cutting system smoke suite for platform wiring (`c48654a`, 2026-05-05)

### Fixed

- fix(payments): expose admin refund route and harden Razorpay refund flow (`ca529b7`, 2026-05-31)
- fix(blog): client-side view tracking, engagement API, and comment auth fixes. (`c4293b3`, 2026-05-31)
- fix(admin): restore audit logs and blog analytics gateway routing. (`e4971d0`, 2026-05-31)
- fix(gateway): expose admin payment detail and notification template routes (`ce64dda`, 2026-05-31)
- fix: standardize quotes in Docker Compose files and update envfile reports (`be5d05d`, 2026-05-18)
- fix(gateway): make Swagger docs public and add merged OpenAPI export (`96ce02a`, 2026-05-15)
- fix(e2e): stabilize system suite and align gateway/service routes (`dea7d88`, 2026-05-06)

### Changed

- Harden auth and share APIs to keep secrets out of URLs and logs. (`7f86bcb`, 2026-05-31)
- chore(api): commit merged OpenAPI mirror for contract checks (`85e34b6`, 2026-05-29)
- chore: reorder MINIO_PUBLIC_ENDPOINT in environment configuration (`5839a09`, 2026-05-24)
- refactor(auth): remove CSRF token endpoint and update health check visibility (`58e8fc9`, 2026-05-24)
- chore: update environment variables and pnpm lock for new project dependencies (`aeec0a4`, 2026-05-23)
- chore: lint/format gateway and services; clarify paise Swagger docs (`e983d97`, 2026-05-23)
- refactor: streamline Swagger setup and enhance response interceptors (`80cdeea`, 2026-05-20)
- chore: add CI/CD workflows for backend validation and deployment (`b1f019c`, 2026-05-20)
- chore: improve documentation for Infisical error messages and database migration commands (`cb73325`, 2026-05-19)
- chore: update database migration commands and CI/CD workflow documentation (`1480892`, 2026-05-19)
- chore: refactor Infisical secret fetching in CI/CD workflow and add export script (`993bbe0`, 2026-05-19)
- chore: format .infisical.json for consistency and readability (`e6f69db`, 2026-05-19)
- chore: commit .infisical.json for CI/CD integration and update workflow logic (`bfaa29b`, 2026-05-19)
- chore: enhance CI/CD workflow for Infisical integration and update documentation (`aecc44c`, 2026-05-19)
- chore: add local CD simulation script and update Infisical export in CI/CD workflow (`690ea0f`, 2026-05-19)
- chore: update Infisical secrets-action method in CI/CD workflow and documentation (`4b09d9c`, 2026-05-19)
- chore: update Jest configuration and CI workflow for improved performance (`5e7701f`, 2026-05-19)
- chore: update Node.js version and add Prisma Client generation step in CI/CD workflows (`49cc25a`, 2026-05-18)
- chore: update ESLint configurations across services to improve type safety and consistency (`fe661e2`, 2026-05-18)
- refactor: update controller methods to remove Promise<any> return type and improve DTO usage (`b539d6e`, 2026-05-18)
- chore: migrate dev env to Infisical and update dev CD/deploy flow (`7cc7c2b`, 2026-05-18)
- chore: update Docker images in development and E2E configurations (`b2ea161`, 2026-05-17)
- chore: add Prometheus monitoring configuration to .env.development (`98575e8`, 2026-05-16)
- refactor: update user-related endpoints in AdminController to forward requests to users service (`fa27c85`, 2026-05-14)
- refactor: improve CORS origin parsing and add production warning for development seeds (`93b1222`, 2026-05-13)
- chore: enhance development seed data for improved testing and UI simulation (`26a9002`, 2026-05-13)
- chore: update environment configurations and enhance JWT handling (`269ba08`, 2026-05-12)
- chore: enhance OpenAPI documentation and validation processes (`2a3d184`, 2026-05-10)
- chore: add comprehensive environment validation report for development, e2e, and production configurations (`fae0e24`, 2026-05-07)
- chore: update Razorpay credentials in development and e2e environment files, and add validation report for environment configurations (`3c96584`, 2026-05-07)
- chore: update environment variable values for service connectivity across development, e2e, and production environments (`a66b39d`, 2026-05-07)
- chore: update environment variable configurations across all deployment stages (`4719c72`, 2026-05-06)
- chore: update E2E test commands for improved performance (`155998d`, 2026-05-05)
- chore: enable force exit in Jest configuration for E2E tests (`320512f`, 2026-05-05)

### 📚 Documentation

- docs: document Node.js version requirements and provide ESM-safe workarounds for Prisma commands (`00a14b1`, 2026-05-09)
- docs: add comprehensive testing report for Nestlancer backend (`6d7b67d`, 2026-05-05)
- docs: update README with E2E database runbook and migration troubleshooting steps (`48ce1cc`, 2026-05-04)

### Tests

- test: refactor QuoteStatusService unit tests to use mockPrismaWrite (`3b35637`, 2026-05-19)
- test: simplify mock implementation in TokenService unit tests (`52c2de1`, 2026-05-19)
- test: refactor unit tests for RegistrationService and TokenService to use mockPrismaWrite (`9f4189d`, 2026-05-19)
- test: update unit tests to use mockPrismaWrite for media and request services (`e63cc03`, 2026-05-19)
- test: enhance unit tests for messaging services with additional mocks and assertions (`198b990`, 2026-05-19)
- test: add JWT access public key to integration and unit tests (`60f25d1`, 2026-05-18)
- test(system): add complete cross-service smoke coverage and full docker-compose.e2e stack (`2b29cb9`, 2026-05-05)
- test: align specs with current module wiring and service contracts (`ff294d7`, 2026-05-04)

---

## 2026-04 (10 commits)

### Added

- feat: enhance Docker configuration and queue services (`6e8a470`, 2026-04-29)
- feat: add docker-compose orchestration and convenience scripts for development environment setup (`216d124`, 2026-04-29)
- feat: Add initial configuration files for code-review-graph (`40bca4e`, 2026-04-22)

### Changed

- chore: update Docker configuration and TypeScript settings (`eb846f8`, 2026-04-29)
- chore: remove obsolete database and deployment scripts (`82ad76f`, 2026-04-28)
- chore: remove obsolete Docker Compose files and related commands (`0810414`, 2026-04-28)
- refactor: migrate storage stack to MinIO-compatible S3 provider. - Replace the dedicated Cloudflare R2 provider wiring with a generic S3 provider flow and add first-class MinIO configuration suppor… (`2ca0ba1`, 2026-04-28)
- chore: Remove .env file and update environment configurations (`1f04825`, 2026-04-25)
- chore: Remove obsolete configuration and documentation files (`3197a0a`, 2026-04-22)
- refactor: update storage configuration and logging commands for Docker (`7d53e89`, 2026-04-22)

---

## 2026-03 (208 commits)

### Added

- feat: Add comprehensive storage and CDN setup guide for Backblaze B2 and Cloudflare, updating environment configurations, setup scripts, and documentation. (`6e98666`, 2026-03-28)
- feat: Add comprehensive storage and CDN setup guide for Backblaze B2 and Cloudflare, updating environment configurations, setup scripts, and documentation. (`4774f21`, 2026-03-26)
- feat(storage): add cloud fallback with background synchronization (`199160d`, 2026-03-17)
- feat: Refactor storage configuration for improved clarity and consistency (`3a5c159`, 2026-03-17)
- feat: Update email configuration to use noreply address (`5f59697`, 2026-03-16)
- feat: Revamp environment configuration files for clarity and consistency (`cc7c323`, 2026-03-15)
- feat: Remove backup management functionality and related components (`8f753f6`, 2026-03-15)
- feat: Enhance outbox polling with retry logic and metrics (`f4805f9`, 2026-03-15)
- feat: Enhance webhook consumer with metrics, DLQ support, and idempotency (`df9e764`, 2026-03-15)
- feat: Add streaming download functionality to storage providers (`0aa8848`, 2026-03-15)
- feat: Enhance analytics consumer with DTO validation and DLQ support (`555a690`, 2026-03-15)
- feat: Enhance audit worker with DTO validation and queue configuration (`379aabb`, 2026-03-15)
- feat: Add notification handling with retry logic and validation (`908f5e2`, 2026-03-15)
- feat: Implement email idempotency with caching and dynamic mailer configuration, and fallback to a default templates path. (`b5bc3ba`, 2026-03-15)
- feat: add typescript configuration with path aliases and simplify husky hook scripts (`d99f0cf`, 2026-03-15)
- feat: enhance E2E tests for WebSocket gateway (`4756711`, 2026-03-14)
- feat(admin): replace super-admin guard with admin guard, add backup/impersonation models (`6ac946a`, 2026-03-14)
- feat: enhance E2E testing for contact service (`27b6ca5`, 2026-03-13)
- feat: enhance E2E testing for blog service (`4f6f479`, 2026-03-13)
- feat: enhance E2E testing for portfolio service (`744e9d2`, 2026-03-13)
- feat: enhance E2E testing for media service (`3133dbf`, 2026-03-13)
- feat: enhance E2E testing for messaging service (`1e377c6`, 2026-03-13)
- feat: enhance E2E testing for notifications service (`132cfb7`, 2026-03-13)
- feat(payments): add service-level E2E tests with strict assertions (`d08363c`, 2026-03-13)
- feat: enhance E2E testing for progress service and improve error handling (`a494849`, 2026-03-13)
- feat: enhance validation and error handling in project services (`860d56f`, 2026-03-13)
- feat: enhance E2E testing for quotes service and improve error handling (`2d8068c`, 2026-03-13)
- feat: enhance business logic exception handling and improve E2E test assertions (`76e7341`, 2026-03-13)
- feat(test): comprehensive e2e test suite expansion and documentation (`e30bce2`, 2026-03-09)
- feat: implement business logic in ws-gateway (`acc181f`, 2026-03-09)
- feat: implement business logic in workers/webhook-worker (`1a9671c`, 2026-03-09)
- feat: implement business logic in workers/media-worker (`d787ab8`, 2026-03-09)
- feat: implement business logic in workers/audit-worker (`67c0460`, 2026-03-09)
- feat: implement business logic in workers/analytics-worker (`f24d955`, 2026-03-09)
- feat: implement business logic in services/users (`201b738`, 2026-03-09)
- feat: implement business logic in services/requests (`4f1cf51`, 2026-03-09)
- feat: implement business logic in services/quotes (`de9c9b7`, 2026-03-09)
- feat: implement business logic in services/projects (`9064fcc`, 2026-03-09)
- feat: implement business logic in services/progress (`b8696d8`, 2026-03-09)
- feat: implement business logic in services/portfolio (`65fb2b3`, 2026-03-09)
- feat: implement business logic in services/payments (`a49a8a1`, 2026-03-09)
- feat: implement business logic in services/notifications (`c1ebb96`, 2026-03-09)
- feat: implement business logic in services/messaging (`20f62dd`, 2026-03-09)
- feat: implement business logic in services/media (`9e232b8`, 2026-03-09)
- feat: implement business logic in services/health (`601a963`, 2026-03-09)
- feat: implement business logic in services/blog (`5296ba6`, 2026-03-09)
- feat: implement business logic in services/admin (`673810d`, 2026-03-09)
- feat: implement business logic in gateway/auth (`98be206`, 2026-03-09)
- feat: implement business logic in root package.json (`e88a045`, 2026-03-09)
- feat: implement business logic in libs/storage (`c858d5f`, 2026-03-09)
- feat: implement business logic in prisma/schema (`0b96241`, 2026-03-09)
- feat(webhook-worker): add jsdoc and refine webhook delivery worker (`62619d1`, 2026-03-08)
- feat(outbox-poller): add jsdoc and refine outbox polling implementation (`50f7f5a`, 2026-03-08)
- feat(notification-worker): add jsdoc and refine notification push providers (`c59d7b1`, 2026-03-08)
- feat(media-worker): add jsdoc and refine media processing workers (`b6300ac`, 2026-03-08)
- feat(email-worker): add jsdoc and refine email rendering and retry logic (`c4f67a8`, 2026-03-08)
- feat(cdn-worker): add jsdoc and refine cdn invalidation service (`2792255`, 2026-03-08)
- feat(audit-worker): add jsdoc and refine audit consumer implementation (`f6eb732`, 2026-03-08)
- feat(analytics-worker): add jsdoc and refine analytics aggregation logic (`c76e881`, 2026-03-08)
- feat(webhooks): add swagger documentation and refine webhook service (`0d2ff43`, 2026-03-08)
- feat(users): add swagger documentation and refine user service (`73cd24e`, 2026-03-08)
- feat(requests): add swagger documentation and refine requests service (`c19fae8`, 2026-03-08)
- feat(quotes): add swagger documentation and refine quotes service (`c366e3e`, 2026-03-08)
- feat(projects): add swagger documentation and refine projects service (`fda35dc`, 2026-03-08)
- feat(progress): add swagger documentation and refine progress service (`dc9c014`, 2026-03-08)
- feat(portfolio): add swagger documentation and refine portfolio service (`c7008ba`, 2026-03-08)
- feat(payments): add swagger documentation and refine payment service (`f2fc955`, 2026-03-08)
- feat(notifications): add swagger documentation and refine notification service (`3b82f94`, 2026-03-08)
- feat(messaging): add swagger documentation and refine messaging service (`e1362e0`, 2026-03-08)
- feat(media): add swagger documentation and refine media service (`44b5c83`, 2026-03-08)
- feat(health): add swagger documentation for health checks (`353d87d`, 2026-03-08)
- feat(contact): add swagger documentation and refine contact service (`7dd4686`, 2026-03-08)
- feat(blog): add swagger documentation and refine blog services (`8a335fc`, 2026-03-08)
- feat(auth): add swagger documentation for public endpoints and DTOs (`064be28`, 2026-03-08)
- feat(admin): add swagger documentation and refine controllers (`c079ca4`, 2026-03-08)
- feat(gateway): update global routing for audited endpoints (`78e5aa5`, 2026-03-08)
- feat(misc): update admin, messaging, health, and webhook services (`10bbd85`, 2026-03-08)
- feat(blog): expand analytics, taxonomy, and moderation features (`ac5c545`, 2026-03-08)
- feat(payments): add user invoices and milestone management (`e8b4b60`, 2026-03-08)
- feat(notifications): implement push notifications and root controllers (`41dd9f2`, 2026-03-08)
- feat(media): add chunked upload and root media controllers (`941f878`, 2026-03-08)
- feat(users): implement 2FA, admin bulk operations, and activity logs (`8a612a1`, 2026-03-08)
- feat: Add X-Request-ID and X-API-Version headers and allow X-Request-ID as an alternative correlation ID input. (`6acd9c7`, 2026-03-07)
- feat(workers): integrate and stabilize all 8 worker services in Docker (`5749609`, 2026-03-07)
- feat: add custom webpack configuration and progress service (`0e15085`, 2026-03-06)
- feat: Introduce ProgressModule and detailed health check; enhance E2E setup with AI prompt, refine proxy error handling, and update test data. (`15e9473`, 2026-03-06)
- feat(analytics-worker): stabilize worker configuration and complete report generation (`13d9980`, 2026-03-05)
- feat(test): add missing unit tests for services and workers (`e63e3aa`, 2026-03-04)
- feat: delete unused Prisma migration file (`5d9d2d5`, 2026-03-04)
- feat: Migrate media worker to @nestlancer/queue for message consumption, update storage service API, and streamline processors. (`081eb7c`, 2026-03-03)
- feat: Introduce Dispute model, refine payment statuses, migrate incoming webhooks to WebhookLog, and standardize queue processing with @nestlancer/queue decorators. (`24b7c0d`, 2026-03-03)
- feat: fix build errors in payments service and update user field references (`3dc811d`, 2026-03-03)
- feat: update quote schema and enhance PDF generation service (`75c281f`, 2026-03-03)
- feat(prisma): major schema update and database documentation (`a4d3a35`, 2026-03-03)
- feat(libs): improve alerts routing, outbox publishing, and add comprehensive test suites (`ddbb0ff`, 2026-03-01)

### Fixed

- fix(e2e): update Jest configuration to support ESM-only uuid transformation (`853d969`, 2026-03-13)
- fix(services): resolve backend service startup failures and dependency injection issues (`4eeb783`, 2026-03-07)
- fix(gateway): correct proxy routing logic and app module configuration (`6163e05`, 2026-03-05)
- fix(ws-gateway): fix failing unit and integration tests (`f7aff9f`, 2026-03-05)
- fix(webhook-worker): fix app.module, tests, and integration spec (`47397be`, 2026-03-05)
- fix(outbox-poller): resolve failing unit and integration tests (`cfce423`, 2026-03-05)
- fix(media-worker): resolve module initialization issues and fix tests (`044a031`, 2026-03-05)
- fix(notification-worker): implement unit tests and fix dependency resolution (`5daebae`, 2026-03-05)
- fix(workers): resolve audit-worker and cdn-worker test failures (`d332613`, 2026-03-05)
- fix(email-worker): resolve dependency injection and template loading issues (`e96fd61`, 2026-03-05)
- fix(messaging-service): resolve missing dependencies in AppModule (`4f80a40`, 2026-03-05)
- fix(tests): resolve dependency and configuration issues in progress and projects services (`202bfea`, 2026-03-04)
- fix(health,contact): resolve dependency injection errors and fix test failures (`2bab9f2`, 2026-03-04)
- fix(users): resolve test failures and prisma schema inconsistencies (`5ceec3d`, 2026-03-04)
- fix(auth): resolve integration and unit test failures (`89dfd94`, 2026-03-04)
- fix(tests): resolve relative import path errors in unit tests (`38ba6f6`, 2026-03-04)
- fix(notifications): resolve build errors and update imports - Update main.ts to use LoggerService from @nestlancer/logger and remove logger injection from AllExceptionsFilter. - Fix Prisma orderBy … (`78b8846`, 2026-03-03)
- fix(requests): align requests-service with schema and fix build errors - Updated Prisma schemas (request.prisma, user.prisma) to include missing relations and fields. - Refactored RequestsService a… (`9a159fb`, 2026-03-03)
- fix(projects): resolve build errors and update relation mapping (`921a457`, 2026-03-03)
- fix(ws-gateway): resolve build errors and correct CacheService usage (`964cb25`, 2026-03-03)
- fix(gateway): resolve compression import and add express dependencies (`9ccb9bb`, 2026-03-03)
- fix(users-service): resolve build errors and align with schema changes (`79bc934`, 2026-03-03)
- fix(auth-service): resolve build errors and align schema with service logic (`05fb475`, 2026-03-03)
- fix(libs): resolve tsc errors in libs/testing and fix failing library tests (`84f2b55`, 2026-03-02)
- fix(testing): resolve 32 typescript compilation errors in libs/testing (`b7cdfb0`, 2026-03-02)

### Changed

- refactor: implement automated storage cleanup for orphaned assets on DB failure (`3f94f07`, 2026-03-29)
- refactor: standardize storage bucket configuration using consistent environment variables across all services and workers (`cb9362b`, 2026-03-28)
- chore: optimize cdn-worker for cloudflare-only (`34c42cb`, 2026-03-15)
- chore: Remove SES email provider support and DKIM configuration. (`48f01b9`, 2026-03-15)
- refactor: replace MailHog with Mailpit in configuration and documentation (`16ac4cd`, 2026-03-15)
- refactor: migrate E2E tests to supertest, enhance authentication and authorization coverage, and update Jest configuration for ESM compatibility. (`4b163fd`, 2026-03-14)
- feat ( gateway ) - update gateway files (`57d5d5c`, 2026-03-14)
- feat ( update prompt ) - update ai-prompt (`2b5c493`, 2026-03-14)
- Enhance E2E tests for user management and preferences (`d6cc14b`, 2026-03-13)
- Add full auth service E2E coverage and align assertions (`03087b9`, 2026-03-13)
- refactor: remove end-to-end testing framework and related configurations (`b6388db`, 2026-03-11)
- chore: apply formatting across the codebase (`fb7eaf6`, 2026-03-10)
- - Added @nestjs/swagger dependency to all microservices. - Configured individual Swagger documentation setup in each service's main.ts. - Enhanced API Gateway to aggregate all microservice API spec… (`c4c64d0`, 2026-03-10)
- chore: update test infrastructure and complete integration testing setup (`72f45fd`, 2026-03-10)
- chore: remove e2e test infrastructure and update dependencies (`06cbdb4`, 2026-03-09)
- chore: update build configuration and dependencies (`a3efe60`, 2026-03-07)
- feat(add) - add e2e test files and its configuration files and also added e2e docker setup file for support-services. (`f1de919`, 2026-03-06)
- Remove all Kubernetes deployment configurations and GitHub automation. (`9e6e2b2`, 2026-03-05)
- refactor(media): align core logic with standards and achieve 100% test pass (`cdc4719`, 2026-03-05)
- refactor: Standardize Jest configurations across all packages by introducing dedicated config files, a base config, and granular test scripts. (`30eeb5d`, 2026-03-04)
- chore: refactor tests and update test documentation (`16e3ef5`, 2026-03-04)
- Refactor: Renamed eventType to type in outbox creation and added any type assertion for health service metric counters. (`0078a7d`, 2026-03-03)
- refactor: standardize model names in aggregation service calls and refine analytics calculations for blog comments and project revenue. (`a30a5ab`, 2026-03-03)
- refactor: Update queue service to publisher, add storage dependency, and refine audit user fields and email template body. (`fab1d5f`, 2026-03-03)
- refactor: Update user ID field to /, refactor media entity fields and storage service integration, and adjust API response types. (`caded6d`, 2026-03-03)
- chore: resolve build and type errors across services (`c90823f`, 2026-03-03)
- refactor: update common library import, ensure webhook secrets default to empty string, and add type assertions for webhook log data. (`581e798`, 2026-03-03)
- refactor: Standardize queue routing keys and exchanges, update contact status enum, and enhance contact submission with UUID-based ticket IDs and refined rate limiting. (`58ff0c4`, 2026-03-03)
- refactor(messaging): update user selection and project relation fields (`6c80205`, 2026-03-03)
- refactor(db): migrate project-wide to UUID v7 (`6fc0cf9`, 2026-03-03)
- chore: fix auth service build errors . (`5c707b9`, 2026-03-03)
- chore: Remove e2e test configurations and specific e2e test files from various services. (`87db760`, 2026-03-02)
- refactor(auth-lib): consolidate decorators and fix typescript errors (`9bb3502`, 2026-03-02)
- build: fix monorepo-wide compilation and module resolution errors (`f9bf133`, 2026-03-02)
- chore(config): refactor environment variable management and sync test environment (`e279b15`, 2026-03-02)
- chore: Update example secret and key values in Infisical configuration and remove the AI implementation prompt reference document. (`5eae1c0`, 2026-03-01)
- Refactor: Standardize NestJS core dependencies across libraries and streamline Docker build configurations and image naming. (`616100f`, 2026-03-01)
- chore: migrate deployment architecture to VPS-based Kubernetes and cleanup legacy infrastructure (`c910593`, 2026-03-01)

### 📚 Documentation

- docs: synchronize reference documentation with implemented endpoints (`d9b9205`, 2026-03-08)

### Tests

- test(webhook-worker): expand e2e tests and improve setup mocks (`b65f136`, 2026-03-14)
- test(outbox-poller): expand e2e tests and improve setup mocks (`ec7eec2`, 2026-03-14)
- test(notification-worker): expand e2e tests and improve setup mocks (`cb08a79`, 2026-03-14)
- test(media-worker): expand e2e tests and improve setup mocks (`c6c474b`, 2026-03-14)
- test(email-worker): expand e2e tests and improve setup mocks (`35b5d52`, 2026-03-14)
- test(cdn-worker): expand e2e tests and improve setup mocks (`8f92bab`, 2026-03-14)
- test(audit-worker): expand e2e tests and improve setup mocks (`816fe8c`, 2026-03-14)
- test(analytics-worker): expand e2e tests and improve setup mocks (`fc48d7f`, 2026-03-14)
- test(e2e): update health service E2E tests for response structure (`959d555`, 2026-03-13)
- test(e2e): refine end-to-end testing practices and configurations (`5ad30a7`, 2026-03-13)
- test(e2e): enhance end-to-end testing setup and specifications (`b5b4370`, 2026-03-13)
- test(e2e): add end-to-end tests for multiple services (`a64a1d4`, 2026-03-12)
- test: implement comprehensive integration tests across all microservices and workers (`a987ac4`, 2026-03-11)
- test: upgrade integration tests from smoke to functional coverage (`5f558cb`, 2026-03-10)
- test(e2e): setup comprehensive end-to-end testing framework (`426018d`, 2026-03-10)
- test(gateway): implement and complete integration testing (`26937b9`, 2026-03-10)
- test(webhook-worker): implement and complete integration testing (`3992645`, 2026-03-10)
- test(outbox-poller): implement and complete integration testing (`842f6a9`, 2026-03-10)
- test(notification-worker): implement and complete integration testing (`43dcbd5`, 2026-03-10)
- test(media-worker): implement and complete integration testing (`138bdff`, 2026-03-10)
- test(email-worker): implement and complete integration testing (`cb9b8b8`, 2026-03-10)
- test(cdn-worker): implement and complete integration testing (`d4831fb`, 2026-03-10)
- test(audit-worker): implement and complete integration testing (`674c2fa`, 2026-03-10)
- test(analytics-worker): implement and complete integration testing (`d088b3d`, 2026-03-10)
- test(webhooks): implement and complete integration testing (`20c739e`, 2026-03-10)
- test(users): implement and complete integration testing (`867935e`, 2026-03-10)
- test(requests): implement and complete integration testing (`78fb387`, 2026-03-10)
- test(quotes): implement and complete integration testing (`17bc07c`, 2026-03-10)
- test(projects): implement and complete integration testing (`93d0681`, 2026-03-10)
- test(progress): implement and complete integration testing (`ae47460`, 2026-03-10)
- test(portfolio): implement and complete integration testing (`94b10c7`, 2026-03-10)
- test(payments): implement and complete integration testing (`aee1946`, 2026-03-10)
- test(notifications): implement and complete integration testing (`2eb70a2`, 2026-03-10)
- test(messaging): implement and complete integration testing (`4402f5e`, 2026-03-10)
- test(media): implement and complete integration testing (`e67aa76`, 2026-03-10)
- test(health): implement and complete integration testing (`0998863`, 2026-03-10)
- test(contact): implement and complete integration testing (`c191591`, 2026-03-10)
- test(blog): implement and complete integration testing (`c00f59b`, 2026-03-10)
- test(auth): implement and complete integration testing (`f381043`, 2026-03-10)
- test(admin): implement and complete integration testing (`99b1f9c`, 2026-03-10)
- test(admin, webhooks): fix failing unit and integration tests (`4241036`, 2026-03-05)
- test(blog,portfolio): fix unit and integration test failures (`dce1c98`, 2026-03-05)
- test: fix notifications service unit and integration tests (`c2ec7b9`, 2026-03-05)
- test(payments): fix integration test connection leaks and unit test DI errors - Mocked QueueConsumerService and OutboxPollerService in app.module.integration.spec.ts to prevent tests from hanging o… (`94ae84f`, 2026-03-05)
- test(quotes,requests): fix unit and integration tests (`d88563b`, 2026-03-04)
- test: Add basic AppModule integration tests for all services and workers. (`e9aea48`, 2026-03-04)
- test(integration): fix failing integration tests across library modules (`7671545`, 2026-03-02)
- test(libs): fix unit test failures and achieve 100% test coverage (`41290ca`, 2026-03-01)
- test(services): fix and complete all unit tests (100% pass rate) (`346cdec`, 2026-03-01)

---

## 2026-02 (29 commits)

### Added

- feat: populate example Turnstile and VAPID keys in infisical.example.json (`14e7160`, 2026-02-28)
- feat: Remove SMS notification channel, consolidate Docker Compose configurations, and introduce Infisical example for environment variables. (`09b4868`, 2026-02-28)
- feat(gateway): implement centralized http proxy system and service registry (`2c08988`, 2026-02-27)
- feat(ws-gateway): implement production-ready socket scaling and error handling (`0178703`, 2026-02-26)
- feat: implement service layer logic and update schema definitions (`7d56b58`, 2026-02-26)
- feat(database): refactor prisma schema and re-initialize migrations (`d90ff85`, 2026-02-26)
- feat(libs): implement all stub libraries with production-ready code (`76f03ab`, 2026-02-26)
- feat(workers): implement CDN and Outbox Poller workers (`9c628bd`, 2026-02-23)
- feat: implement analytics and webhook workers (`ade65cc`, 2026-02-23)
- feat(workers): implement email and notification workers (`b8d9247`, 2026-02-23)
- feat: implement webhooks ingestion service (`76a9494`, 2026-02-23)
- feat(admin): implement admin service base structure and endpoints (`c983ef6`, 2026-02-23)
- feat: implement portfolio and blog microservices (`a191b3a`, 2026-02-23)
- feat: implement notifications and media microservices - scaffolded service () - implemented core notifications module with RabbitMQ integration - added preferences module for user notification sett… (`122f1be`, 2026-02-23)
- feat(services): implement Progress, Payments, and Messaging microservices (`938dcdc`, 2026-02-23)
- feat(api): implement core backend microservices (`487072b`, 2026-02-23)
- feat: Centralize Prisma configuration with a new root-level `prisma.config.ts` file and add Prisma dependencies. (`d8df9fc`, 2026-02-23)
- feat: implement sections 7-10 — database, shared libs, API & WS gateways (`1a041f4`, 2026-02-23)
- feat(infra): implement project infrastructure (sections 2-6) (`e2fa464`, 2026-02-23)
- feat: add initial comprehensive backend API reference documentation (`81ef8b1`, 2026-02-23)

### Changed

- refactor: Standardize TypeScript configurations, update Prisma schema with push subscriptions, and add Nodemailer to the mail library. (`ffe9d41`, 2026-02-28)
- chore: Standardize Nest CLI configurations across services, workers, and gateways by removing and adding new module configurations. (`6075cc9`, 2026-02-28)
- ## fix(workers): resolve strict TypeScript errors and standardize dependencies (`bde83c5`, 2026-02-26)
- **feat(workers): add audit-worker and media-worker microservices** (`bac63ac`, 2026-02-23)
- chore: update pnpm dependencies (`6f41816`, 2026-02-23)
- **feat(contact): implement contact service foundation and API endpoints** (`4d95a3c`, 2026-02-23)
- chore(root): initialize monorepo setup and root configuration files (`6f5b2ed`, 2026-02-23)
- Initial commit (`920ecf5`, 2026-02-23)

### 📚 Documentation

- docs: Update search module description to reflect Meilisearch integration and update dependency. (`5ae8c0c`, 2026-02-26)

---
