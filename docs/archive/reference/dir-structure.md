Archived layout snapshot. Seeding no longer lives under `prisma/seeds/`. The current runner is `seed/seed.sh` and payloads are in `seed/payloads/`.

```
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── cd-staging.yml
│   │   ├── cd-production.yml
│   │   ├── codeql-analysis.yml
│   │   ├── dependency-review.yml
│   │   └── release.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── config.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS
│   └── dependabot.yml
│
├── docs/
│   ├── api/
│   │   ├── openapi.yaml
│   │   ├── openapi-v1.json
│   │   ├── postman-collection.json
│   │   └── endpoints-reference.md
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── system-diagram.mmd
│   │   ├── data-flow.md
│   │   ├── database-schema.md
│   │   ├── event-catalog.md
│   │   ├── queue-topology.md
│   │   └── websocket-protocol.md
│   ├── adr/
│   │   ├── 001-monorepo-structure.md
│   │   ├── 002-database-choice.md
│   │   ├── 003-auth-strategy.md
│   │   ├── 004-outbox-pattern.md
│   │   ├── 005-read-write-split.md
│   │   ├── 006-queue-topology.md
│   │   ├── 007-idempotency-strategy.md
│   │   └── 008-caching-strategy.md
│   ├── runbooks/
│   │   ├── incident-response.md
│   │   ├── database-failover.md
│   │   ├── queue-recovery.md
│   │   ├── dlq-processing.md
│   │   ├── scaling-guide.md
│   │   └── deployment-checklist.md
│   ├── guides/
│   │   ├── getting-started.md
│   │   ├── local-development.md
│   │   ├── testing-strategy.md
│   │   ├── coding-standards.md
│   │   ├── adding-new-service.md
│   │   ├── adding-new-worker.md
│   │   └── environment-variables.md
│   └── changelog/
│       ├── CHANGELOG.md
│       └── MIGRATION_GUIDE.md
│
├── scripts/
│   ├── setup/
│   │   ├── init-project.sh
│   │   ├── install-dependencies.sh
│   │   ├── setup-local-env.sh
│   │   └── generate-secrets.sh
│   ├── db/
│   │   ├── migrate.sh
│   │   ├── seed.sh
│   │   ├── reset.sh
│   │   ├── backup.sh
│   │   └── restore.sh
│   ├── docker/
│   │   ├── build-all.sh
│   │   ├── push-all.sh
│   │   └── clean.sh
│   ├── deploy/
│   │   ├── deploy-staging.sh
│   │   ├── deploy-production.sh
│   │   └── rollback.sh
│   ├── dev/
│   │   ├── start-services.sh
│   │   ├── start-workers.sh
│   │   ├── start-gateway.sh
│   │   ├── start-all.sh
│   │   ├── watch-logs.sh
│   │   └── generate-types.sh
│   └── test/
│       ├── run-unit.sh
│       ├── run-e2e.sh
│       ├── run-integration.sh
│       └── coverage-report.sh
│
├── docker/
│   ├── gateway/
│   │   └── Dockerfile
│   ├── ws-gateway/
│   │   └── Dockerfile
│   ├── service-base/
│   │   └── Dockerfile.base
│   ├── worker-base/
│   │   └── Dockerfile.base
│   ├── nginx/
│   │   ├── nginx.conf
│   │   ├── conf.d/
│   │   │   ├── api-gateway.conf
│   │   │   ├── ws-gateway.conf
│   │   │   ├── rate-limiting.conf
│   │   │   └── ssl.conf
│   │   └── certs/
│   │       └── .gitkeep
│   └── monitoring/
│       ├── prometheus/
│       │   ├── prometheus.yml
│       │   └── alert-rules.yml
│       ├── grafana/
│       │   ├── provisioning/
│       │   │   ├── dashboards/
│       │   │   │   ├── dashboard.yml
│       │   │   │   ├── api-overview.json
│       │   │   │   ├── service-health.json
│       │   │   │   ├── queue-metrics.json
│       │   │   │   ├── database-metrics.json
│       │   │   │   └── worker-metrics.json
│       │   │   └── datasources/
│       │   │       └── datasource.yml
│       │   └── grafana.ini
│       ├── jaeger/
│       │   └── jaeger-config.yml
│       └── alertmanager/
│           └── alertmanager.yml
│
├── deploy/
│   ├── kubernetes/
│   │   ├── base/
│   │   │   ├── namespace.yaml
│   │   │   ├── configmap.yaml
│   │   │   ├── secrets.yaml
│   │   │   ├── network-policy.yaml
│   │   │   ├── ingress.yaml
│   │   │   ├── hpa.yaml
│   │   │   ├── pdb.yaml
│   │   │   ├── service-account.yaml
│   │   │   └── kustomization.yaml
│   │   ├── services/
│   │   │   ├── gateway/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── ws-gateway/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── auth/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── users/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── requests/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── quotes/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── projects/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── progress/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── payments/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── messaging/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── notifications/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── media/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── portfolio/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── blog/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── contact/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── admin/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── webhooks/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   └── health/
│   │   │       ├── deployment.yaml
│   │   │       ├── service.yaml
│   │   │       └── kustomization.yaml
│   │   ├── workers/
│   │   │   ├── email-worker/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── notification-worker/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── audit-worker/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── media-worker/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── analytics-worker/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── webhook-worker/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── cdn-worker/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── hpa.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   └── outbox-poller/
│   │   │       ├── deployment.yaml
│   │   │       ├── hpa.yaml
│   │   │       └── kustomization.yaml
│   │   ├── infrastructure/
│   │   │   ├── postgresql/
│   │   │   │   ├── primary-statefulset.yaml
│   │   │   │   ├── replica-statefulset.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── pvc.yaml
│   │   │   │   ├── patroni-config.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── redis-cache/
│   │   │   │   ├── statefulset.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── config.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── redis-pubsub/
│   │   │   │   ├── statefulset.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── config.yaml
│   │   │   │   └── kustomization.yaml
│   │   │   ├── rabbitmq/
│   │   │   │   ├── statefulset.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   ├── config.yaml
│   │   │   │   ├── definitions.json
│   │   │   │   └── kustomization.yaml
│   │   │   └── monitoring/
│   │   │       ├── prometheus-deployment.yaml
│   │   │       ├── grafana-deployment.yaml
│   │   │       ├── jaeger-deployment.yaml
│   │   │       └── kustomization.yaml
│   │   └── overlays/
│   │       ├── development/
│   │       │   ├── kustomization.yaml
│   │       │   └── patches/
│   │       │       ├── replicas.yaml
│   │       │       └── resources.yaml
│   │       ├── staging/
│   │       │   ├── kustomization.yaml
│   │       │   └── patches/
│   │       │       ├── replicas.yaml
│   │       │       └── resources.yaml
│   │       └── production/
│   │           ├── kustomization.yaml
│   │           └── patches/
│   │               ├── replicas.yaml
│   │               └── resources.yaml
│   └── terraform/
│       ├── environments/
│       │   ├── staging/
│       │   │   ├── main.tf
│       │   │   ├── variables.tf
│       │   │   ├── outputs.tf
│       │   │   ├── terraform.tfvars
│       │   │   └── backend.tf
│       │   └── production/
│       │       ├── main.tf
│       │       ├── variables.tf
│       │       ├── outputs.tf
│       │       ├── terraform.tfvars
│       │       └── backend.tf
│       └── modules/
│           ├── vpc/
│           │   ├── main.tf
│           │   ├── variables.tf
│           │   └── outputs.tf
│           ├── rds/
│           │   ├── main.tf
│           │   ├── variables.tf
│           │   └── outputs.tf
│           ├── elasticache/
│           │   ├── main.tf
│           │   ├── variables.tf
│           │   └── outputs.tf
│           ├── s3/
│           │   ├── main.tf
│           │   ├── variables.tf
│           │   └── outputs.tf
│           ├── cloudfront/
│           │   ├── main.tf
│           │   ├── variables.tf
│           │   └── outputs.tf
│           ├── ses/
│           │   ├── main.tf
│           │   ├── variables.tf
│           │   └── outputs.tf
│           ├── eks/
│           │   ├── main.tf
│           │   ├── variables.tf
│           │   └── outputs.tf
│           ├── rabbitmq/
│           │   ├── main.tf
│           │   ├── variables.tf
│           │   └── outputs.tf
│           └── secrets-manager/
│               ├── main.tf
│               ├── variables.tf
│               └── outputs.tf
│
├── prisma/
│   ├── schema/
│   │   ├── schema.prisma
│   │   ├── user.prisma
│   │   ├── auth.prisma
│   │   ├── project.prisma
│   │   ├── request.prisma
│   │   ├── quote.prisma
│   │   ├── progress.prisma
│   │   ├── payment.prisma
│   │   ├── message.prisma
│   │   ├── notification.prisma
│   │   ├── media.prisma
│   │   ├── portfolio.prisma
│   │   ├── blog.prisma
│   │   ├── contact.prisma
│   │   ├── admin.prisma
│   │   ├── audit.prisma
│   │   ├── webhook.prisma
│   │   ├── outbox.prisma
│   │   └── idempotency.prisma
│   ├── migrations/
│   │   ├── 00001_initial_schema/
│   │   │   └── migration.sql
│   │   ├── 00002_auth_tables/
│   │   │   └── migration.sql
│   │   ├── 00003_user_tables/
│   │   │   └── migration.sql
│   │   ├── 00004_project_tables/
│   │   │   └── migration.sql
│   │   ├── 00005_request_tables/
│   │   │   └── migration.sql
│   │   ├── 00006_quote_tables/
│   │   │   └── migration.sql
│   │   ├── 00007_progress_tables/
│   │   │   └── migration.sql
│   │   ├── 00008_payment_tables/
│   │   │   └── migration.sql
│   │   ├── 00009_messaging_tables/
│   │   │   └── migration.sql
│   │   ├── 00010_notification_tables/
│   │   │   └── migration.sql
│   │   ├── 00011_media_tables/
│   │   │   └── migration.sql
│   │   ├── 00012_portfolio_tables/
│   │   │   └── migration.sql
│   │   ├── 00013_blog_tables/
│   │   │   └── migration.sql
│   │   ├── 00014_contact_tables/
│   │   │   └── migration.sql
│   │   ├── 00015_admin_tables/
│   │   │   └── migration.sql
│   │   ├── 00016_audit_tables/
│   │   │   └── migration.sql
│   │   ├── 00017_webhook_tables/
│   │   │   └── migration.sql
│   │   ├── 00018_outbox_table/
│   │   │   └── migration.sql
│   │   ├── 00019_idempotency_table/
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   ├── seeds/
│   │   ├── index.ts
│   │   ├── 01-roles.seed.ts
│   │   ├── 02-admin-user.seed.ts
│   │   ├── 03-categories.seed.ts
│   │   ├── 04-tags.seed.ts
│   │   ├── 05-email-templates.seed.ts
│   │   ├── 06-notification-templates.seed.ts
│   │   ├── 07-auto-replies.seed.ts
│   │   ├── 08-feature-flags.seed.ts
│   │   ├── 09-system-config.seed.ts
│   │   └── dev/
│   │       ├── 10-test-users.seed.ts
│   │       ├── 11-test-projects.seed.ts
│   │       ├── 12-test-portfolio.seed.ts
│   │       └── 13-test-blog-posts.seed.ts
│   └── prisma.config.ts
│
│
│
│ ══════════════════════════════════════════════
│  SHARED LIBRARIES
│ ══════════════════════════════════════════════
│
├── libs/
│   │
│   ├── common/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── constants/
│   │   │   │   ├── index.ts
│   │   │   │   ├── app.constants.ts
│   │   │   │   ├── error-codes.constants.ts
│   │   │   │   ├── regex.constants.ts
│   │   │   │   ├── mime-types.constants.ts
│   │   │   │   ├── file-limits.constants.ts
│   │   │   │   ├── pagination.constants.ts
│   │   │   │   └── currency.constants.ts
│   │   │   ├── enums/
│   │   │   │   ├── index.ts
│   │   │   │   ├── role.enum.ts
│   │   │   │   ├── user-status.enum.ts
│   │   │   │   ├── project-status.enum.ts
│   │   │   │   ├── request-status.enum.ts
│   │   │   │   ├── quote-status.enum.ts
│   │   │   │   ├── payment-status.enum.ts
│   │   │   │   ├── payment-method.enum.ts
│   │   │   │   ├── milestone-status.enum.ts
│   │   │   │   ├── deliverable-status.enum.ts
│   │   │   │   ├── progress-type.enum.ts
│   │   │   │   ├── message-type.enum.ts
│   │   │   │   ├── notification-type.enum.ts
│   │   │   │   ├── notification-priority.enum.ts
│   │   │   │   ├── notification-channel.enum.ts
│   │   │   │   ├── media-type.enum.ts
│   │   │   │   ├── media-status.enum.ts
│   │   │   │   ├── portfolio-status.enum.ts
│   │   │   │   ├── blog-status.enum.ts
│   │   │   │   ├── comment-status.enum.ts
│   │   │   │   ├── contact-status.enum.ts
│   │   │   │   ├── contact-subject.enum.ts
│   │   │   │   ├── contact-priority.enum.ts
│   │   │   │   ├── webhook-status.enum.ts
│   │   │   │   ├── currency.enum.ts
│   │   │   │   ├── sort-order.enum.ts
│   │   │   │   └── request-category.enum.ts
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   │   ├── api-response.type.ts
│   │   │   │   ├── paginated-response.type.ts
│   │   │   │   ├── error-response.type.ts
│   │   │   │   ├── pagination-params.type.ts
│   │   │   │   ├── filter-params.type.ts
│   │   │   │   ├── sort-params.type.ts
│   │   │   │   ├── date-range.type.ts
│   │   │   │   ├── money.type.ts
│   │   │   │   └── jwt-payload.type.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── index.ts
│   │   │   │   ├── service-health.interface.ts
│   │   │   │   ├── audit-context.interface.ts
│   │   │   │   ├── request-context.interface.ts
│   │   │   │   ├── pagination.interface.ts
│   │   │   │   └── base-entity.interface.ts
│   │   │   ├── decorators/
│   │   │   │   ├── index.ts
│   │   │   │   ├── public.decorator.ts
│   │   │   │   ├── roles.decorator.ts
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   ├── idempotency-key.decorator.ts
│   │   │   │   ├── api-paginated.decorator.ts
│   │   │   │   ├── api-standard-response.decorator.ts
│   │   │   │   └── trim.decorator.ts
│   │   │   ├── dto/
│   │   │   │   ├── index.ts
│   │   │   │   ├── pagination-query.dto.ts
│   │   │   │   ├── date-range-query.dto.ts
│   │   │   │   ├── id-param.dto.ts
│   │   │   │   └── bulk-operation.dto.ts
│   │   │   ├── exceptions/
│   │   │   │   ├── index.ts
│   │   │   │   ├── base.exception.ts
│   │   │   │   ├── business-logic.exception.ts
│   │   │   │   ├── not-found.exception.ts
│   │   │   │   ├── conflict.exception.ts
│   │   │   │   ├── forbidden.exception.ts
│   │   │   │   ├── validation.exception.ts
│   │   │   │   ├── rate-limit.exception.ts
│   │   │   │   ├── external-service.exception.ts
│   │   │   │   └── idempotency-conflict.exception.ts
│   │   │   ├── filters/
│   │   │   │   ├── index.ts
│   │   │   │   ├── all-exceptions.filter.ts
│   │   │   │   └── http-exception.filter.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── index.ts
│   │   │   │   ├── logging.interceptor.ts
│   │   │   │   ├── transform-response.interceptor.ts
│   │   │   │   ├── timeout.interceptor.ts
│   │   │   │   ├── etag.interceptor.ts
│   │   │   │   └── admin-audit-proxy.interceptor.ts
│   │   │   ├── pipes/
│   │   │   │   ├── index.ts
│   │   │   │   ├── validation.pipe.ts
│   │   │   │   ├── parse-uuid.pipe.ts
│   │   │   │   ├── parse-pagination.pipe.ts
│   │   │   │   └── sanitize.pipe.ts
│   │   │   └── utils/
│   │   │       ├── index.ts
│   │   │       ├── slug.util.ts
│   │   │       ├── date.util.ts
│   │   │       ├── money.util.ts
│   │   │       ├── pagination.util.ts
│   │   │       ├── hash.util.ts
│   │   │       ├── retry.util.ts
│   │   │       ├── sanitize.util.ts
│   │   │       └── uuid.util.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── config/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── config.module.ts
│   │   │   ├── config.service.ts
│   │   │   ├── schemas/
│   │   │   │   ├── app.schema.ts
│   │   │   │   ├── database.schema.ts
│   │   │   │   ├── redis.schema.ts
│   │   │   │   ├── rabbitmq.schema.ts
│   │   │   │   ├── jwt.schema.ts
│   │   │   │   ├── storage.schema.ts
│   │   │   │   ├── smtp.schema.ts
│   │   │   │   ├── razorpay.schema.ts
│   │   │   │   ├── cors.schema.ts
│   │   │   │   └── rate-limit.schema.ts
│   │   │   └── loaders/
│   │   │       ├── env.loader.ts
│   │   │       └── secrets.loader.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── database/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── database.module.ts
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.service.ts
│   │   │   │   ├── prisma-write.service.ts
│   │   │   │   ├── prisma-read.service.ts
│   │   │   │   └── prisma.module.ts
│   │   │   ├── repositories/
│   │   │   │   └── base.repository.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── repository.interface.ts
│   │   │   │   └── transaction.interface.ts
│   │   │   ├── decorators/
│   │   │   │   ├── read-only.decorator.ts
│   │   │   │   ├── write-only.decorator.ts
│   │   │   │   └── transactional.decorator.ts
│   │   │   └── utils/
│   │   │       ├── query-builder.util.ts
│   │   │       └── soft-delete.util.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── cache/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── cache.module.ts
│   │   │   ├── cache.service.ts
│   │   │   ├── redis-cache.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── ttl.strategy.ts
│   │   │   │   ├── lru.strategy.ts
│   │   │   │   └── tag-based-invalidation.strategy.ts
│   │   │   ├── decorators/
│   │   │   │   ├── cacheable.decorator.ts
│   │   │   │   └── cache-invalidate.decorator.ts
│   │   │   └── interfaces/
│   │   │       └── cache.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── queue/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── queue.module.ts
│   │   │   ├── queue-publisher.service.ts
│   │   │   ├── queue-consumer.service.ts
│   │   │   ├── exchanges/
│   │   │   │   ├── events.exchange.ts
│   │   │   │   └── webhooks.exchange.ts
│   │   │   ├── routing-keys/
│   │   │   │   ├── email.routing-keys.ts
│   │   │   │   ├── notification.routing-keys.ts
│   │   │   │   ├── audit.routing-keys.ts
│   │   │   │   ├── media.routing-keys.ts
│   │   │   │   ├── analytics.routing-keys.ts
│   │   │   │   ├── webhook.routing-keys.ts
│   │   │   │   └── cdn.routing-keys.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── message-envelope.interface.ts
│   │   │   │   ├── queue-options.interface.ts
│   │   │   │   └── consumer-options.interface.ts
│   │   │   ├── decorators/
│   │   │   │   └── consume.decorator.ts
│   │   │   └── dlq/
│   │   │       ├── dlq.service.ts
│   │   │       └── dlq.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── outbox/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── outbox.module.ts
│   │   │   ├── outbox.service.ts
│   │   │   ├── outbox-poller.service.ts
│   │   │   ├── outbox.repository.ts
│   │   │   └── interfaces/
│   │   │       ├── outbox-event.interface.ts
│   │   │       └── outbox-options.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── auth-lib/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── auth-lib.module.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   ├── roles.guard.ts
│   │   │   │   ├── permissions.guard.ts
│   │   │   │   ├── webhook-auth.guard.ts
│   │   │   │   ├── csrf.guard.ts
│   │   │   │   └── api-key.guard.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── jwt-refresh.strategy.ts
│   │   │   │   └── api-key.strategy.ts
│   │   │   ├── decorators/
│   │   │   │   ├── auth.decorator.ts
│   │   │   │   ├── roles.decorator.ts
│   │   │   │   ├── permissions.decorator.ts
│   │   │   │   └── current-user.decorator.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── jwt-payload.interface.ts
│   │   │   │   ├── authenticated-user.interface.ts
│   │   │   │   └── permission.interface.ts
│   │   │   └── utils/
│   │   │       ├── token.util.ts
│   │   │       └── password.util.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── logger/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── logger.module.ts
│   │   │   ├── logger.service.ts
│   │   │   ├── formatters/
│   │   │   │   ├── json.formatter.ts
│   │   │   │   └── pretty.formatter.ts
│   │   │   ├── transports/
│   │   │   │   ├── console.transport.ts
│   │   │   │   ├── file.transport.ts
│   │   │   │   └── aggregator.transport.ts
│   │   │   ├── middleware/
│   │   │   │   └── request-logger.middleware.ts
│   │   │   └── interfaces/
│   │   │       └── log-context.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── metrics/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── metrics.module.ts
│   │   │   ├── metrics.service.ts
│   │   │   ├── prometheus.service.ts
│   │   │   ├── collectors/
│   │   │   │   ├── http-metrics.collector.ts
│   │   │   │   ├── queue-metrics.collector.ts
│   │   │   │   ├── db-metrics.collector.ts
│   │   │   │   ├── cache-metrics.collector.ts
│   │   │   │   └── custom-metrics.collector.ts
│   │   │   ├── interceptors/
│   │   │   │   └── metrics.interceptor.ts
│   │   │   └── interfaces/
│   │   │       └── metric.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── tracing/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── tracing.module.ts
│   │   │   ├── tracing.service.ts
│   │   │   ├── otel-setup.ts
│   │   │   ├── propagators/
│   │   │   │   └── context-propagator.ts
│   │   │   ├── interceptors/
│   │   │   │   └── tracing.interceptor.ts
│   │   │   ├── middleware/
│   │   │   │   └── correlation-id.middleware.ts
│   │   │   └── interfaces/
│   │   │       └── span-context.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── health-lib/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── health-lib.module.ts
│   │   │   ├── indicators/
│   │   │   │   ├── database.indicator.ts
│   │   │   │   ├── redis.indicator.ts
│   │   │   │   ├── rabbitmq.indicator.ts
│   │   │   │   ├── storage.indicator.ts
│   │   │   │   ├── smtp.indicator.ts
│   │   │   │   ├── memory.indicator.ts
│   │   │   │   └── disk.indicator.ts
│   │   │   └── interfaces/
│   │   │       └── health-indicator.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── idempotency/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── idempotency.module.ts
│   │   │   ├── idempotency.service.ts
│   │   │   ├── idempotency.guard.ts
│   │   │   ├── idempotency.interceptor.ts
│   │   │   ├── stores/
│   │   │   │   ├── redis-idempotency.store.ts
│   │   │   │   └── db-idempotency.store.ts
│   │   │   ├── decorators/
│   │   │   │   └── idempotent.decorator.ts
│   │   │   └── interfaces/
│   │   │       └── idempotency-store.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── audit/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── audit.module.ts
│   │   │   ├── audit-writer.service.ts
│   │   │   ├── audit.repository.ts
│   │   │   ├── decorators/
│   │   │   │   └── auditable.decorator.ts
│   │   │   └── interfaces/
│   │   │       ├── audit-entry.interface.ts
│   │   │       └── audit-context.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── alerts/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── alerts.module.ts
│   │   │   ├── alerts.service.ts
│   │   │   ├── channels/
│   │   │   │   ├── pagerduty.channel.ts
│   │   │   │   ├── slack.channel.ts
│   │   │   │   └── email-alert.channel.ts
│   │   │   ├── rules/
│   │   │   │   └── alert-rules.config.ts
│   │   │   └── interfaces/
│   │   │       └── alert.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── middleware/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── middleware.module.ts
│   │   │   ├── cors.middleware.ts
│   │   │   ├── request-tracer.middleware.ts
│   │   │   ├── maintenance-mode.middleware.ts
│   │   │   ├── feature-flags.middleware.ts
│   │   │   ├── rate-limiter.middleware.ts
│   │   │   ├── rate-limiter.guard.ts
│   │   │   ├── helmet.middleware.ts
│   │   │   └── interfaces/
│   │   │       ├── rate-limit-tier.interface.ts
│   │   │       ├── feature-flag.interface.ts
│   │   │       └── maintenance-config.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── storage/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── storage.module.ts
│   │   │   ├── storage.service.ts
│   │   │   ├── providers/
│   │   │   │   ├── s3.provider.ts
│   │   │   │   ├── cloudinary.provider.ts
│   │   │   │   └── local.provider.ts
│   │   │   ├── utils/
│   │   │   │   ├── presigned-url.util.ts
│   │   │   │   └── content-type.util.ts
│   │   │   └── interfaces/
│   │   │       ├── storage-provider.interface.ts
│   │   │       ├── upload-options.interface.ts
│   │   │       └── storage-file.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── mail/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── mail.module.ts
│   │   │   ├── mail.service.ts
│   │   │   ├── providers/
│   │   │   │   ├── ses.provider.ts
│   │   │   │   ├── smtp.provider.ts
│   │   │   │   └── sendgrid.provider.ts
│   │   │   ├── templates/
│   │   │   │   ├── template-engine.service.ts
│   │   │   │   └── compiled/
│   │   │   │       └── .gitkeep
│   │   │   └── interfaces/
│   │   │       ├── mail-provider.interface.ts
│   │   │       └── mail-options.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── crypto/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── crypto.module.ts
│   │   │   ├── hashing.service.ts
│   │   │   ├── encryption.service.ts
│   │   │   ├── hmac.service.ts
│   │   │   ├── totp.service.ts
│   │   │   └── interfaces/
│   │   │       └── crypto.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── websocket/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── websocket.module.ts
│   │   │   ├── ws-adapter.ts
│   │   │   ├── ws-auth.service.ts
│   │   │   ├── room-manager.service.ts
│   │   │   ├── presence.service.ts
│   │   │   ├── heartbeat.service.ts
│   │   │   ├── decorators/
│   │   │   │   ├── ws-auth.decorator.ts
│   │   │   │   └── ws-room.decorator.ts
│   │   │   └── interfaces/
│   │   │       ├── ws-client.interface.ts
│   │   │       ├── ws-event.interface.ts
│   │   │       └── ws-room.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── pdf/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── pdf.module.ts
│   │   │   ├── pdf.service.ts
│   │   │   ├── templates/
│   │   │   │   ├── quote.template.ts
│   │   │   │   ├── invoice.template.ts
│   │   │   │   └── receipt.template.ts
│   │   │   └── interfaces/
│   │   │       └── pdf-options.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── search/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── search.module.ts
│   │   │   ├── search.service.ts
│   │   │   ├── filter-builder.service.ts
│   │   │   ├── sort-builder.service.ts
│   │   │   └── interfaces/
│   │   │       ├── search-options.interface.ts
│   │   │       └── filter-operator.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── circuit-breaker/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── circuit-breaker.module.ts
│   │   │   ├── circuit-breaker.service.ts
│   │   │   ├── decorators/
│   │   │   │   └── circuit-breaker.decorator.ts
│   │   │   └── interfaces/
│   │   │       └── circuit-breaker-options.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── turnstile/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── turnstile.module.ts
│   │   │   ├── turnstile.service.ts
│   │   │   ├── turnstile.guard.ts
│   │   │   ├── decorators/
│   │   │   │   └── require-turnstile.decorator.ts
│   │   │   └── interfaces/
│   │   │       └── turnstile.interface.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── testing/
│       ├── src/
│       │   ├── index.ts
│       │   ├── factories/
│       │   │   ├── user.factory.ts
│       │   │   ├── project.factory.ts
│       │   │   ├── request.factory.ts
│       │   │   ├── quote.factory.ts
│       │   │   ├── payment.factory.ts
│       │   │   ├── message.factory.ts
│       │   │   ├── notification.factory.ts
│       │   │   ├── media.factory.ts
│       │   │   ├── portfolio.factory.ts
│       │   │   ├── blog-post.factory.ts
│       │   │   └── contact.factory.ts
│       │   ├── mocks/
│       │   │   ├── prisma.mock.ts
│       │   │   ├── redis.mock.ts
│       │   │   ├── rabbitmq.mock.ts
│       │   │   ├── storage.mock.ts
│       │   │   ├── mail.mock.ts
│       │   │   └── razorpay.mock.ts
│       │   ├── helpers/
│       │   │   ├── test-app.helper.ts
│       │   │   ├── auth.helper.ts
│       │   │   ├── database.helper.ts
│       │   │   └── queue.helper.ts
│       │   └── fixtures/
│       │       ├── users.fixture.ts
│       │       ├── projects.fixture.ts
│       │       └── payments.fixture.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
│
│
│ ══════════════════════════════════════════════
│  API GATEWAY
│ ══════════════════════════════════════════════
│
├── gateway/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │   ├── gateway.config.ts
│   │   │   ├── routes.config.ts
│   │   │   ├── rate-limit.config.ts
│   │   │   ├── cors.config.ts
│   │   │   └── swagger.config.ts
│   │   ├── middleware/
│   │   │   ├── cors.middleware.ts
│   │   │   ├── request-tracer.middleware.ts
│   │   │   ├── maintenance-mode.middleware.ts
│   │   │   ├── rate-limiter.middleware.ts
│   │   │   └── request-logger.middleware.ts
│   │   ├── guards/
│   │   │   ├── public-route.guard.ts
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── admin-auth.guard.ts
│   │   │   ├── webhook-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   ├── permissions.guard.ts
│   │   │   └── csrf.guard.ts
│   │   ├── pipes/
│   │   │   ├── global-validation.pipe.ts
│   │   │   └── webhook-validation.pipe.ts
│   │   ├── filters/
│   │   │   ├── global-exception.filter.ts
│   │   │   └── gateway-exception.filter.ts
│   │   ├── interceptors/
│   │   │   ├── response-transform.interceptor.ts
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── timeout.interceptor.ts
│   │   │   ├── cache.interceptor.ts
│   │   │   └── metrics.interceptor.ts
│   │   ├── proxy/
│   │   │   ├── proxy.module.ts
│   │   │   ├── proxy.service.ts
│   │   │   └── service-registry.ts
│   │   └── swagger/
│   │       ├── swagger.setup.ts
│   │       └── swagger-ui.config.ts
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── cors.middleware.spec.ts
│   │   │   ├── rate-limiter.middleware.spec.ts
│   │   │   ├── jwt-auth.guard.spec.ts
│   │   │   └── proxy.service.spec.ts
│   │   └── e2e/
│   │       ├── gateway.e2e-spec.ts
│   │       └── middleware-pipeline.e2e-spec.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── Dockerfile
│   ├── .eslintrc.js
│   ├── .prettierrc
│   └── README.md
│
│
│
│ ══════════════════════════════════════════════
│  WEBSOCKET GATEWAY
│ ══════════════════════════════════════════════
│
├── ws-gateway/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   │   └── ws-gateway.config.ts
│   │   ├── auth/
│   │   │   ├── ws-auth.service.ts
│   │   │   └── ws-auth.guard.ts
│   │   ├── gateways/
│   │   │   ├── messages.gateway.ts
│   │   │   └── notifications.gateway.ts
│   │   ├── services/
│   │   │   ├── room-manager.service.ts
│   │   │   ├── presence.service.ts
│   │   │   ├── heartbeat.service.ts
│   │   │   └── redis-subscriber.service.ts
│   │   ├── adapters/
│   │   │   └── redis-io.adapter.ts
│   │   ├── decorators/
│   │   │   ├── ws-current-user.decorator.ts
│   │   │   └── ws-room.decorator.ts
│   │   ├── filters/
│   │   │   └── ws-exception.filter.ts
│   │   └── interfaces/
│   │       ├── ws-client.interface.ts
│   │       ├── ws-events.interface.ts
│   │       └── ws-room.interface.ts
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── ws-auth.service.spec.ts
│   │   │   ├── room-manager.service.spec.ts
│   │   │   └── presence.service.spec.ts
│   │   └── e2e/
│   │       ├── messages.gateway.e2e-spec.ts
│   │       └── notifications.gateway.e2e-spec.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── Dockerfile
│   ├── .eslintrc.js
│   ├── .prettierrc
│   └── README.md
│
│
│
│ ══════════════════════════════════════════════
│  SERVICES
│ ══════════════════════════════════════════════
│
├── services/
│   │
│   │ ────────────────────────────────────────
│   │  HEALTH SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── health/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── public/
│   │   │   │   │   └── health.public.controller.ts
│   │   │   │   └── admin/
│   │   │   │       └── health-debug.admin.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── health.service.ts
│   │   │   │   ├── database-health.service.ts
│   │   │   │   ├── cache-health.service.ts
│   │   │   │   ├── queue-health.service.ts
│   │   │   │   ├── storage-health.service.ts
│   │   │   │   ├── external-services-health.service.ts
│   │   │   │   ├── workers-health.service.ts
│   │   │   │   ├── websocket-health.service.ts
│   │   │   │   ├── system-metrics.service.ts
│   │   │   │   ├── feature-flags-health.service.ts
│   │   │   │   └── service-registry-health.service.ts
│   │   │   ├── dto/
│   │   │   │   └── health-query.dto.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── health-status.interface.ts
│   │   │   │   ├── health-check-result.interface.ts
│   │   │   │   └── system-metrics.interface.ts
│   │   │   └── config/
│   │   │       └── health.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── health.service.spec.ts
│   │   │   │   ├── database-health.service.spec.ts
│   │   │   │   ├── cache-health.service.spec.ts
│   │   │   │   └── health.public.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   └── health.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── health.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  AUTH SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── auth/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   └── public/
│   │   │   │       └── auth.public.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── registration.service.ts
│   │   │   │   ├── login.service.ts
│   │   │   │   ├── token.service.ts
│   │   │   │   ├── password.service.ts
│   │   │   │   ├── two-factor.service.ts
│   │   │   │   ├── email-verification.service.ts
│   │   │   │   ├── turnstile.service.ts
│   │   │   │   ├── csrf.service.ts
│   │   │   │   └── account-lockout.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── register.dto.ts
│   │   │   │   ├── login.dto.ts
│   │   │   │   ├── verify-email.dto.ts
│   │   │   │   ├── resend-verification.dto.ts
│   │   │   │   ├── verify-2fa.dto.ts
│   │   │   │   ├── refresh-token.dto.ts
│   │   │   │   ├── forgot-password.dto.ts
│   │   │   │   ├── reset-password.dto.ts
│   │   │   │   ├── check-email.dto.ts
│   │   │   │   └── auth-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── user-credential.entity.ts
│   │   │   │   ├── refresh-token.entity.ts
│   │   │   │   ├── email-verification-token.entity.ts
│   │   │   │   ├── password-reset-token.entity.ts
│   │   │   │   └── login-attempt.entity.ts
│   │   │   ├── guards/
│   │   │   │   └── turnstile.guard.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── auth.interface.ts
│   │   │   │   ├── token-payload.interface.ts
│   │   │   │   └── login-result.interface.ts
│   │   │   └── config/
│   │   │       └── auth.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── auth.service.spec.ts
│   │   │   │   ├── registration.service.spec.ts
│   │   │   │   ├── login.service.spec.ts
│   │   │   │   ├── token.service.spec.ts
│   │   │   │   ├── password.service.spec.ts
│   │   │   │   ├── two-factor.service.spec.ts
│   │   │   │   ├── email-verification.service.spec.ts
│   │   │   │   ├── account-lockout.service.spec.ts
│   │   │   │   └── auth.public.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   ├── register.e2e-spec.ts
│   │   │   │   ├── login.e2e-spec.ts
│   │   │   │   ├── token-refresh.e2e-spec.ts
│   │   │   │   ├── password-reset.e2e-spec.ts
│   │   │   │   └── two-factor.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── auth.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  USERS SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── users/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── user/
│   │   │   │   │   ├── profile.controller.ts
│   │   │   │   │   ├── two-factor.controller.ts
│   │   │   │   │   ├── sessions.controller.ts
│   │   │   │   │   └── account.controller.ts
│   │   │   │   └── admin/
│   │   │   │       └── users.admin.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── profile.service.ts
│   │   │   │   ├── preferences.service.ts
│   │   │   │   ├── avatar.service.ts
│   │   │   │   ├── sessions.service.ts
│   │   │   │   ├── two-factor.service.ts
│   │   │   │   ├── account.service.ts
│   │   │   │   ├── data-export.service.ts
│   │   │   │   └── users-admin.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── update-profile.dto.ts
│   │   │   │   ├── change-password.dto.ts
│   │   │   │   ├── upload-avatar.dto.ts
│   │   │   │   ├── update-preferences.dto.ts
│   │   │   │   ├── enable-2fa.dto.ts
│   │   │   │   ├── verify-2fa.dto.ts
│   │   │   │   ├── disable-2fa.dto.ts
│   │   │   │   ├── query-users.dto.ts
│   │   │   │   ├── update-user.dto.ts
│   │   │   │   ├── update-user-role.dto.ts
│   │   │   │   ├── update-user-status.dto.ts
│   │   │   │   ├── reset-user-password.dto.ts
│   │   │   │   ├── export-user.dto.ts
│   │   │   │   ├── bulk-users.dto.ts
│   │   │   │   ├── user-response.dto.ts
│   │   │   │   ├── session-response.dto.ts
│   │   │   │   └── activity-query.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   ├── user-preferences.entity.ts
│   │   │   │   ├── user-session.entity.ts
│   │   │   │   └── user-activity.entity.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── user.interface.ts
│   │   │   │   ├── preferences.interface.ts
│   │   │   │   └── session.interface.ts
│   │   │   └── config/
│   │   │       └── users.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── users.service.spec.ts
│   │   │   │   ├── profile.service.spec.ts
│   │   │   │   ├── sessions.service.spec.ts
│   │   │   │   ├── two-factor.service.spec.ts
│   │   │   │   ├── account.service.spec.ts
│   │   │   │   ├── users-admin.service.spec.ts
│   │   │   │   ├── profile.controller.spec.ts
│   │   │   │   ├── sessions.controller.spec.ts
│   │   │   │   └── users.admin.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   ├── profile.e2e-spec.ts
│   │   │   │   ├── sessions.e2e-spec.ts
│   │   │   │   ├── two-factor.e2e-spec.ts
│   │   │   │   ├── account.e2e-spec.ts
│   │   │   │   └── users-admin.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── users.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  REQUESTS SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── requests/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── user/
│   │   │   │   │   ├── requests.controller.ts
│   │   │   │   │   └── request-attachments.controller.ts
│   │   │   │   └── admin/
│   │   │   │       └── requests.admin.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── requests.service.ts
│   │   │   │   ├── request-attachments.service.ts
│   │   │   │   ├── request-notes.service.ts
│   │   │   │   ├── request-status.service.ts
│   │   │   │   ├── request-stats.service.ts
│   │   │   │   └── requests-admin.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-request.dto.ts
│   │   │   │   ├── update-request.dto.ts
│   │   │   │   ├── query-requests.dto.ts
│   │   │   │   ├── submit-request.dto.ts
│   │   │   │   ├── update-request-status.dto.ts
│   │   │   │   ├── create-note.dto.ts
│   │   │   │   ├── add-attachment.dto.ts
│   │   │   │   └── request-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── request.entity.ts
│   │   │   │   ├── request-attachment.entity.ts
│   │   │   │   ├── request-note.entity.ts
│   │   │   │   └── request-status-history.entity.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── request.interface.ts
│   │   │   │   └── request-status-flow.interface.ts
│   │   │   └── config/
│   │   │       └── requests.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── requests.service.spec.ts
│   │   │   │   ├── request-attachments.service.spec.ts
│   │   │   │   ├── request-status.service.spec.ts
│   │   │   │   ├── requests-admin.service.spec.ts
│   │   │   │   ├── requests.controller.spec.ts
│   │   │   │   └── requests.admin.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   ├── requests.e2e-spec.ts
│   │   │   │   ├── request-attachments.e2e-spec.ts
│   │   │   │   └── requests-admin.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── requests.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  QUOTES SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── quotes/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── user/
│   │   │   │   │   └── quotes.controller.ts
│   │   │   │   └── admin/
│   │   │   │       └── quotes.admin.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── quotes.service.ts
│   │   │   │   ├── quote-status.service.ts
│   │   │   │   ├── quote-pdf.service.ts
│   │   │   │   ├── quote-templates.service.ts
│   │   │   │   ├── quote-expiry.service.ts
│   │   │   │   ├── quote-stats.service.ts
│   │   │   │   └── quotes-admin.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-quote.dto.ts
│   │   │   │   ├── update-quote.dto.ts
│   │   │   │   ├── query-quotes.dto.ts
│   │   │   │   ├── accept-quote.dto.ts
│   │   │   │   ├── decline-quote.dto.ts
│   │   │   │   ├── request-changes.dto.ts
│   │   │   │   ├── send-quote.dto.ts
│   │   │   │   ├── duplicate-quote.dto.ts
│   │   │   │   ├── create-quote-template.dto.ts
│   │   │   │   ├── payment-breakdown.dto.ts
│   │   │   │   └── quote-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── quote.entity.ts
│   │   │   │   ├── quote-line-item.entity.ts
│   │   │   │   ├── quote-payment-breakdown.entity.ts
│   │   │   │   └── quote-template.entity.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── quote.interface.ts
│   │   │   │   └── quote-status-flow.interface.ts
│   │   │   └── config/
│   │   │       └── quotes.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── quotes.service.spec.ts
│   │   │   │   ├── quote-status.service.spec.ts
│   │   │   │   ├── quote-pdf.service.spec.ts
│   │   │   │   ├── quotes-admin.service.spec.ts
│   │   │   │   ├── quotes.controller.spec.ts
│   │   │   │   └── quotes.admin.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   ├── quotes.e2e-spec.ts
│   │   │   │   ├── quote-acceptance.e2e-spec.ts
│   │   │   │   └── quotes-admin.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── quotes.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  PROJECTS SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── projects/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── public/
│   │   │   │   │   └── projects.public.controller.ts
│   │   │   │   ├── user/
│   │   │   │   │   ├── projects.controller.ts
│   │   │   │   │   └── project-feedback.controller.ts
│   │   │   │   └── admin/
│   │   │   │       └── projects.admin.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── projects.service.ts
│   │   │   │   ├── project-status.service.ts
│   │   │   │   ├── project-feedback.service.ts
│   │   │   │   ├── project-messages.service.ts
│   │   │   │   ├── project-templates.service.ts
│   │   │   │   ├── project-analytics.service.ts
│   │   │   │   ├── project-export.service.ts
│   │   │   │   ├── project-stats.service.ts
│   │   │   │   └── projects-admin.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── query-public-projects.dto.ts
│   │   │   │   ├── query-projects.dto.ts
│   │   │   │   ├── update-project.dto.ts
│   │   │   │   ├── update-project-status.dto.ts
│   │   │   │   ├── approve-project.dto.ts
│   │   │   │   ├── request-revision.dto.ts
│   │   │   │   ├── submit-feedback.dto.ts
│   │   │   │   ├── send-project-message.dto.ts
│   │   │   │   ├── duplicate-project.dto.ts
│   │   │   │   ├── export-project.dto.ts
│   │   │   │   ├── create-project-template.dto.ts
│   │   │   │   └── project-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── project.entity.ts
│   │   │   │   ├── project-feedback.entity.ts
│   │   │   │   ├── project-message.entity.ts
│   │   │   │   └── project-template.entity.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── project.interface.ts
│   │   │   │   └── project-status-flow.interface.ts
│   │   │   └── config/
│   │   │       └── projects.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── projects.service.spec.ts
│   │   │   │   ├── project-status.service.spec.ts
│   │   │   │   ├── project-feedback.service.spec.ts
│   │   │   │   ├── projects-admin.service.spec.ts
│   │   │   │   ├── projects.public.controller.spec.ts
│   │   │   │   ├── projects.controller.spec.ts
│   │   │   │   └── projects.admin.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   ├── projects-public.e2e-spec.ts
│   │   │   │   ├── projects.e2e-spec.ts
│   │   │   │   ├── project-feedback.e2e-spec.ts
│   │   │   │   └── projects-admin.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── projects.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  PROGRESS SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── progress/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── user/
│   │   │   │   │   ├── progress.controller.ts
│   │   │   │   │   ├── milestone-approvals.controller.ts
│   │   │   │   │   └── deliverable-reviews.controller.ts
│   │   │   │   └── admin/
│   │   │   │       ├── progress.admin.controller.ts
│   │   │   │       ├── milestones.admin.controller.ts
│   │   │   │       └── deliverables.admin.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── progress.service.ts
│   │   │   │   ├── progress-timeline.service.ts
│   │   │   │   ├── milestones.service.ts
│   │   │   │   ├── deliverables.service.ts
│   │   │   │   ├── milestone-approval.service.ts
│   │   │   │   ├── deliverable-review.service.ts
│   │   │   │   └── progress-admin.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-progress-entry.dto.ts
│   │   │   │   ├── update-progress-entry.dto.ts
│   │   │   │   ├── query-progress.dto.ts
│   │   │   │   ├── create-milestone.dto.ts
│   │   │   │   ├── update-milestone.dto.ts
│   │   │   │   ├── approve-milestone.dto.ts
│   │   │   │   ├── request-milestone-revision.dto.ts
│   │   │   │   ├── upload-deliverable.dto.ts
│   │   │   │   ├── update-deliverable.dto.ts
│   │   │   │   ├── approve-deliverable.dto.ts
│   │   │   │   ├── reject-deliverable.dto.ts
│   │   │   │   ├── request-changes.dto.ts
│   │   │   │   ├── progress-entry-response.dto.ts
│   │   │   │   ├── milestone-response.dto.ts
│   │   │   │   └── deliverable-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── progress-entry.entity.ts
│   │   │   │   ├── milestone.entity.ts
│   │   │   │   └── deliverable.entity.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── progress.interface.ts
│   │   │   │   ├── milestone.interface.ts
│   │   │   │   └── deliverable.interface.ts
│   │   │   └── config/
│   │   │       └── progress.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── progress.service.spec.ts
│   │   │   │   ├── milestones.service.spec.ts
│   │   │   │   ├── deliverables.service.spec.ts
│   │   │   │   ├── milestone-approval.service.spec.ts
│   │   │   │   ├── deliverable-review.service.spec.ts
│   │   │   │   ├── progress.controller.spec.ts
│   │   │   │   ├── progress.admin.controller.spec.ts
│   │   │   │   ├── milestones.admin.controller.spec.ts
│   │   │   │   └── deliverables.admin.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   ├── progress.e2e-spec.ts
│   │   │   │   ├── milestones.e2e-spec.ts
│   │   │   │   ├── deliverables.e2e-spec.ts
│   │   │   │   └── progress-admin.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── progress.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  PAYMENTS SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── payments/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── user/
│   │   │   │   │   ├── payments.controller.ts
│   │   │   │   │   └── payment-methods.controller.ts
│   │   │   │   └── admin/
│   │   │   │       ├── payments.admin.controller.ts
│   │   │   │       ├── payment-milestones.admin.controller.ts
│   │   │   │       └── payment-disputes.admin.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── payments.service.ts
│   │   │   │   ├── payment-intent.service.ts
│   │   │   │   ├── payment-confirmation.service.ts
│   │   │   │   ├── payment-methods.service.ts
│   │   │   │   ├── refund.service.ts
│   │   │   │   ├── payment-milestones.service.ts
│   │   │   │   ├── payment-disputes.service.ts
│   │   │   │   ├── payment-reconciliation.service.ts
│   │   │   │   ├── payment-stats.service.ts
│   │   │   │   ├── receipt-pdf.service.ts
│   │   │   │   ├── invoice-pdf.service.ts
│   │   │   │   ├── razorpay.service.ts
│   │   │   │   ├── razorpay-webhook.service.ts
│   │   │   │   └── payments-admin.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-payment-intent.dto.ts
│   │   │   │   ├── initiate-payment.dto.ts
│   │   │   │   ├── confirm-payment.dto.ts
│   │   │   │   ├── cancel-payment.dto.ts
│   │   │   │   ├── query-payments.dto.ts
│   │   │   │   ├── save-payment-method.dto.ts
│   │   │   │   ├── create-payment-milestone.dto.ts
│   │   │   │   ├── update-payment-milestone.dto.ts
│   │   │   │   ├── process-refund.dto.ts
│   │   │   │   ├── verify-payment.dto.ts
│   │   │   │   ├── respond-dispute.dto.ts
│   │   │   │   ├── resolve-dispute.dto.ts
│   │   │   │   ├── reconciliation-query.dto.ts
│   │   │   │   ├── payment-response.dto.ts
│   │   │   │   ├── milestone-response.dto.ts
│   │   │   │   └── dispute-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── payment.entity.ts
│   │   │   │   ├── payment-intent.entity.ts
│   │   │   │   ├── payment-method.entity.ts
│   │   │   │   ├── payment-milestone.entity.ts
│   │   │   │   ├── payment-dispute.entity.ts
│   │   │   │   └── refund.entity.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── payment.interface.ts
│   │   │   │   ├── razorpay.interface.ts
│   │   │   │   ├── payment-status-flow.interface.ts
│   │   │   │   └── payment-gateway.interface.ts
│   │   │   └── config/
│   │   │       └── payments.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── payments.service.spec.ts
│   │   │   │   ├── payment-intent.service.spec.ts
│   │   │   │   ├── payment-confirmation.service.spec.ts
│   │   │   │   ├── refund.service.spec.ts
│   │   │   │   ├── razorpay.service.spec.ts
│   │   │   │   ├── razorpay-webhook.service.spec.ts
│   │   │   │   ├── payment-milestones.service.spec.ts
│   │   │   │   ├── payment-disputes.service.spec.ts
│   │   │   │   ├── payments.controller.spec.ts
│   │   │   │   ├── payments.admin.controller.spec.ts
│   │   │   │   └── payment-milestones.admin.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   ├── payment-flow.e2e-spec.ts
│   │   │   │   ├── refund.e2e-spec.ts
│   │   │   │   ├── payment-milestones.e2e-spec.ts
│   │   │   │   ├── payment-disputes.e2e-spec.ts
│   │   │   │   └── razorpay-webhook.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── payments.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  MESSAGING SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── messaging/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── user/
│   │   │   │   │   ├── conversations.controller.ts
│   │   │   │   │   ├── messages.controller.ts
│   │   │   │   │   └── message-threads.controller.ts
│   │   │   │   └── admin/
│   │   │   │       └── messages.admin.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── messaging.service.ts
│   │   │   │   ├── conversations.service.ts
│   │   │   │   ├── message-threads.service.ts
│   │   │   │   ├── message-reactions.service.ts
│   │   │   │   ├── message-search.service.ts
│   │   │   │   ├── message-read.service.ts
│   │   │   │   ├── unread-count.service.ts
│   │   │   │   └── messaging-admin.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── send-message.dto.ts
│   │   │   │   ├── edit-message.dto.ts
│   │   │   │   ├── query-messages.dto.ts
│   │   │   │   ├── search-messages.dto.ts
│   │   │   │   ├── add-reaction.dto.ts
│   │   │   │   ├── send-system-message.dto.ts
│   │   │   │   ├── flag-message.dto.ts
│   │   │   │   ├── message-response.dto.ts
│   │   │   │   └── conversation-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── message.entity.ts
│   │   │   │   ├── conversation.entity.ts
│   │   │   │   ├── message-reaction.entity.ts
│   │   │   │   ├── message-read-receipt.entity.ts
│   │   │   │   └── message-flag.entity.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── message.interface.ts
│   │   │   │   └── conversation.interface.ts
│   │   │   └── config/
│   │   │       └── messaging.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── messaging.service.spec.ts
│   │   │   │   ├── conversations.service.spec.ts
│   │   │   │   ├── message-threads.service.spec.ts
│   │   │   │   ├── message-reactions.service.spec.ts
│   │   │   │   ├── messaging-admin.service.spec.ts
│   │   │   │   ├── conversations.controller.spec.ts
│   │   │   │   ├── messages.controller.spec.ts
│   │   │   │   └── messages.admin.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   ├── conversations.e2e-spec.ts
│   │   │   │   ├── messages.e2e-spec.ts
│   │   │   │   ├── message-threads.e2e-spec.ts
│   │   │   │   └── messaging-admin.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── messaging.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  NOTIFICATIONS SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── notifications/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── user/
│   │   │   │   │   ├── notifications.controller.ts
│   │   │   │   │   ├── notification-preferences.controller.ts
│   │   │   │   │   └── push-subscriptions.controller.ts
│   │   │   │   └── admin/
│   │   │   │       ├── notifications.admin.controller.ts
│   │   │   │       └── notification-templates.admin.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── notifications.service.ts
│   │   │   │   ├── notification-preferences.service.ts
│   │   │   │   ├── push-subscriptions.service.ts
│   │   │   │   ├── notification-delivery.service.ts
│   │   │   │   ├── notification-broadcast.service.ts
│   │   │   │   ├── notification-segment.service.ts
│   │   │   │   ├── notification-templates.service.ts
│   │   │   │   ├── notification-stats.service.ts
│   │   │   │   └── notifications-admin.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── query-notifications.dto.ts
│   │   │   │   ├── mark-read.dto.ts
│   │   │   │   ├── mark-selected-read.dto.ts
│   │   │   │   ├── update-preferences.dto.ts
│   │   │   │   ├── register-push-subscription.dto.ts
│   │   │   │   ├── send-notification.dto.ts
│   │   │   │   ├── broadcast-notification.dto.ts
│   │   │   │   ├── segment-notification.dto.ts
│   │   │   │   ├── create-notification-template.dto.ts
│   │   │   │   ├── update-notification-template.dto.ts
│   │   │   │   ├── notification-response.dto.ts
│   │   │   │   └── preferences-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── notification.entity.ts
│   │   │   │   ├── notification-preference.entity.ts
│   │   │   │   ├── push-subscription.entity.ts
│   │   │   │   ├── notification-template.entity.ts
│   │   │   │   └── notification-delivery-log.entity.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── notification.interface.ts
│   │   │   │   ├── notification-channel.interface.ts
│   │   │   │   └── notification-template.interface.ts
│   │   │   └── config/
│   │   │       └── notifications.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── notifications.service.spec.ts
│   │   │   │   ├── notification-preferences.service.spec.ts
│   │   │   │   ├── push-subscriptions.service.spec.ts
│   │   │   │   ├── notification-delivery.service.spec.ts
│   │   │   │   ├── notification-broadcast.service.spec.ts
│   │   │   │   ├── notifications-admin.service.spec.ts
│   │   │   │   ├── notifications.controller.spec.ts
│   │   │   │   ├── notification-preferences.controller.spec.ts
│   │   │   │   └── notifications.admin.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   ├── notifications.e2e-spec.ts
│   │   │   │   ├── notification-preferences.e2e-spec.ts
│   │   │   │   ├── push-subscriptions.e2e-spec.ts
│   │   │   │   └── notifications-admin.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── notifications.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  MEDIA SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── media/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── user/
│   │   │   │   │   ├── media.controller.ts
│   │   │   │   │   ├── media-upload.controller.ts
│   │   │   │   │   └── chunked-upload.controller.ts
│   │   │   │   └── admin/
│   │   │   │       ├── media.admin.controller.ts
│   │   │   │       └── quarantine.admin.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── media.service.ts
│   │   │   │   ├── upload.service.ts
│   │   │   │   ├── chunked-upload.service.ts
│   │   │   │   ├── presigned-url.service.ts
│   │   │   │   ├── media-processing.service.ts
│   │   │   │   ├── media-versions.service.ts
│   │   │   │   ├── media-share.service.ts
│   │   │   │   ├── media-stats.service.ts
│   │   │   │   ├── virus-scan.service.ts
│   │   │   │   ├── quarantine.service.ts
│   │   │   │   ├── storage-cleanup.service.ts
│   │   │   │   └── media-admin.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── upload-request.dto.ts
│   │   │   │   ├── upload-confirm.dto.ts
│   │   │   │   ├── direct-upload.dto.ts
│   │   │   │   ├── init-chunked-upload.dto.ts
│   │   │   │   ├── upload-chunk.dto.ts
│   │   │   │   ├── complete-chunked-upload.dto.ts
│   │   │   │   ├── update-media.dto.ts
│   │   │   │   ├── query-media.dto.ts
│   │   │   │   ├── share-media.dto.ts
│   │   │   │   ├── reprocess-media.dto.ts
│   │   │   │   └── media-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── media.entity.ts
│   │   │   │   ├── media-version.entity.ts
│   │   │   │   ├── media-share-link.entity.ts
│   │   │   │   ├── chunked-upload-session.entity.ts
│   │   │   │   └── quarantined-file.entity.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── media.interface.ts
│   │   │   │   ├── upload-options.interface.ts
│   │   │   │   └── processing-result.interface.ts
│   │   │   └── config/
│   │   │       └── media.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── media.service.spec.ts
│   │   │   │   ├── upload.service.spec.ts
│   │   │   │   ├── chunked-upload.service.spec.ts
│   │   │   │   ├── media-processing.service.spec.ts
│   │   │   │   ├── virus-scan.service.spec.ts
│   │   │   │   ├── quarantine.service.spec.ts
│   │   │   │   ├── media.controller.spec.ts
│   │   │   │   ├── media-upload.controller.spec.ts
│   │   │   │   └── media.admin.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   ├── upload.e2e-spec.ts
│   │   │   │   ├── chunked-upload.e2e-spec.ts
│   │   │   │   ├── media-management.e2e-spec.ts
│   │   │   │   └── media-admin.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       ├── media.fixture.ts
│   │   │       └── files/
│   │   │           ├── test-image.jpg
│   │   │           ├── test-document.pdf
│   │   │           └── test-video.mp4
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  PORTFOLIO SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── portfolio/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── public/
│   │   │   │   │   └── portfolio.public.controller.ts
│   │   │   │   └── admin/
│   │   │   │       ├── portfolio.admin.controller.ts
│   │   │   │       └── portfolio-categories.admin.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── portfolio.service.ts
│   │   │   │   ├── portfolio-categories.service.ts
│   │   │   │   ├── portfolio-search.service.ts
│   │   │   │   ├── portfolio-analytics.service.ts
│   │   │   │   ├── portfolio-ordering.service.ts
│   │   │   │   ├── portfolio-likes.service.ts
│   │   │   │   └── portfolio-admin.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── query-portfolio.dto.ts
│   │   │   │   ├── search-portfolio.dto.ts
│   │   │   │   ├── create-portfolio-item.dto.ts
│   │   │   │   ├── update-portfolio-item.dto.ts
│   │   │   │   ├── update-privacy.dto.ts
│   │   │   │   ├── reorder-portfolio.dto.ts
│   │   │   │   ├── bulk-update-portfolio.dto.ts
│   │   │   │   ├── create-category.dto.ts
│   │   │   │   ├── update-category.dto.ts
│   │   │   │   ├── portfolio-item-response.dto.ts
│   │   │   │   └── category-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── portfolio-item.entity.ts
│   │   │   │   ├── portfolio-category.entity.ts
│   │   │   │   ├── portfolio-tag.entity.ts
│   │   │   │   ├── portfolio-image.entity.ts
│   │   │   │   └── portfolio-like.entity.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── portfolio.interface.ts
│   │   │   │   └── portfolio-analytics.interface.ts
│   │   │   └── config/
│   │   │       └── portfolio.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── portfolio.service.spec.ts
│   │   │   │   ├── portfolio-categories.service.spec.ts
│   │   │   │   ├── portfolio-analytics.service.spec.ts
│   │   │   │   ├── portfolio-admin.service.spec.ts
│   │   │   │   ├── portfolio.public.controller.spec.ts
│   │   │   │   └── portfolio.admin.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   ├── portfolio-public.e2e-spec.ts
│   │   │   │   ├── portfolio-admin.e2e-spec.ts
│   │   │   │   └── portfolio-categories.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── portfolio.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  BLOG SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── blog/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── public/
│   │   │   │   │   ├── posts.public.controller.ts
│   │   │   │   │   ├── blog-categories.public.controller.ts
│   │   │   │   │   ├── blog-tags.public.controller.ts
│   │   │   │   │   ├── authors.public.controller.ts
│   │   │   │   │   └── feed.public.controller.ts
│   │   │   │   ├── user/
│   │   │   │   │   ├── post-interactions.controller.ts
│   │   │   │   │   ├── comments.controller.ts
│   │   │   │   │   └── bookmarks.controller.ts
│   │   │   │   └── admin/
│   │   │   │       ├── posts.admin.controller.ts
│   │   │   │       ├── comments.admin.controller.ts
│   │   │   │       ├── blog-categories.admin.controller.ts
│   │   │   │       ├── blog-tags.admin.controller.ts
│   │   │   │       └── blog-analytics.admin.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── posts.service.ts
│   │   │   │   ├── post-publishing.service.ts
│   │   │   │   ├── post-scheduling.service.ts
│   │   │   │   ├── post-revisions.service.ts
│   │   │   │   ├── post-interactions.service.ts
│   │   │   │   ├── post-search.service.ts
│   │   │   │   ├── post-views.service.ts
│   │   │   │   ├── comments.service.ts
│   │   │   │   ├── comment-moderation.service.ts
│   │   │   │   ├── comment-reactions.service.ts
│   │   │   │   ├── categories.service.ts
│   │   │   │   ├── tags.service.ts
│   │   │   │   ├── bookmarks.service.ts
│   │   │   │   ├── authors.service.ts
│   │   │   │   ├── feed.service.ts
│   │   │   │   ├── related-posts.service.ts
│   │   │   │   ├── blog-analytics.service.ts
│   │   │   │   └── blog-admin.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── query-posts.dto.ts
│   │   │   │   ├── search-posts.dto.ts
│   │   │   │   ├── create-post.dto.ts
│   │   │   │   ├── update-post.dto.ts
│   │   │   │   ├── schedule-post.dto.ts
│   │   │   │   ├── create-comment.dto.ts
│   │   │   │   ├── update-comment.dto.ts
│   │   │   │   ├── reply-comment.dto.ts
│   │   │   │   ├── report-comment.dto.ts
│   │   │   │   ├── create-category.dto.ts
│   │   │   │   ├── update-category.dto.ts
│   │   │   │   ├── create-tag.dto.ts
│   │   │   │   ├── update-tag.dto.ts
│   │   │   │   ├── merge-tags.dto.ts
│   │   │   │   ├── post-response.dto.ts
│   │   │   │   ├── comment-response.dto.ts
│   │   │   │   ├── category-response.dto.ts
│   │   │   │   ├── tag-response.dto.ts
│   │   │   │   └── author-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── post.entity.ts
│   │   │   │   ├── post-revision.entity.ts
│   │   │   │   ├── post-view.entity.ts
│   │   │   │   ├── post-like.entity.ts
│   │   │   │   ├── comment.entity.ts
│   │   │   │   ├── comment-like.entity.ts
│   │   │   │   ├── comment-report.entity.ts
│   │   │   │   ├── blog-category.entity.ts
│   │   │   │   ├── blog-tag.entity.ts
│   │   │   │   └── bookmark.entity.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── post.interface.ts
│   │   │   │   ├── comment.interface.ts
│   │   │   │   └── feed.interface.ts
│   │   │   └── config/
│   │   │       └── blog.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── posts.service.spec.ts
│   │   │   │   ├── post-publishing.service.spec.ts
│   │   │   │   ├── post-scheduling.service.spec.ts
│   │   │   │   ├── comments.service.spec.ts
│   │   │   │   ├── comment-moderation.service.spec.ts
│   │   │   │   ├── categories.service.spec.ts
│   │   │   │   ├── tags.service.spec.ts
│   │   │   │   ├── bookmarks.service.spec.ts
│   │   │   │   ├── feed.service.spec.ts
│   │   │   │   ├── blog-analytics.service.spec.ts
│   │   │   │   ├── posts.public.controller.spec.ts
│   │   │   │   ├── comments.controller.spec.ts
│   │   │   │   ├── posts.admin.controller.spec.ts
│   │   │   │   └── comments.admin.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   ├── posts-public.e2e-spec.ts
│   │   │   │   ├── posts-admin.e2e-spec.ts
│   │   │   │   ├── comments.e2e-spec.ts
│   │   │   │   ├── comment-moderation.e2e-spec.ts
│   │   │   │   ├── categories.e2e-spec.ts
│   │   │   │   ├── tags.e2e-spec.ts
│   │   │   │   ├── bookmarks.e2e-spec.ts
│   │   │   │   └── feed.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── blog.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  CONTACT SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── contact/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   ├── public/
│   │   │   │   │   └── contact.public.controller.ts
│   │   │   │   └── admin/
│   │   │   │       ├── contact.admin.controller.ts
│   │   │   │       ├── contact-notes.admin.controller.ts
│   │   │   │       ├── contact-tags.admin.controller.ts
│   │   │   │       └── auto-replies.admin.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── contact.service.ts
│   │   │   │   ├── contact-submission.service.ts
│   │   │   │   ├── contact-notes.service.ts
│   │   │   │   ├── contact-tags.service.ts
│   │   │   │   ├── contact-response.service.ts
│   │   │   │   ├── auto-replies.service.ts
│   │   │   │   ├── spam-filter.service.ts
│   │   │   │   ├── contact-export.service.ts
│   │   │   │   ├── contact-stats.service.ts
│   │   │   │   └── contact-admin.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── submit-contact.dto.ts
│   │   │   │   ├── query-contacts.dto.ts
│   │   │   │   ├── update-contact.dto.ts
│   │   │   │   ├── update-contact-status.dto.ts
│   │   │   │   ├── update-contact-priority.dto.ts
│   │   │   │   ├── assign-contact.dto.ts
│   │   │   │   ├── respond-contact.dto.ts
│   │   │   │   ├── forward-contact.dto.ts
│   │   │   │   ├── create-note.dto.ts
│   │   │   │   ├── update-note.dto.ts
│   │   │   │   ├── add-tags.dto.ts
│   │   │   │   ├── bulk-contacts.dto.ts
│   │   │   │   ├── export-contacts.dto.ts
│   │   │   │   ├── create-auto-reply.dto.ts
│   │   │   │   ├── update-auto-reply.dto.ts
│   │   │   │   ├── create-tag.dto.ts
│   │   │   │   ├── contact-response.dto.ts
│   │   │   │   └── auto-reply-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── contact-message.entity.ts
│   │   │   │   ├── contact-note.entity.ts
│   │   │   │   ├── contact-tag.entity.ts
│   │   │   │   ├── contact-response-log.entity.ts
│   │   │   │   └── auto-reply.entity.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── contact.interface.ts
│   │   │   │   └── auto-reply.interface.ts
│   │   │   └── config/
│   │   │       └── contact.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── contact.service.spec.ts
│   │   │   │   ├── contact-submission.service.spec.ts
│   │   │   │   ├── contact-notes.service.spec.ts
│   │   │   │   ├── auto-replies.service.spec.ts
│   │   │   │   ├── spam-filter.service.spec.ts
│   │   │   │   ├── contact-export.service.spec.ts
│   │   │   │   ├── contact.public.controller.spec.ts
│   │   │   │   ├── contact.admin.controller.spec.ts
│   │   │   │   └── auto-replies.admin.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   ├── contact-submission.e2e-spec.ts
│   │   │   │   ├── contact-admin.e2e-spec.ts
│   │   │   │   ├── contact-notes.e2e-spec.ts
│   │   │   │   └── auto-replies.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── contact.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  ADMIN SERVICE
│   │ ────────────────────────────────────────
│   │
│   ├── admin/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── controllers/
│   │   │   │   └── admin/
│   │   │   │       ├── dashboard.admin.controller.ts
│   │   │   │       ├── system.admin.controller.ts
│   │   │   │       ├── email-templates.admin.controller.ts
│   │   │   │       ├── audit.admin.controller.ts
│   │   │   │       ├── webhooks.admin.controller.ts
│   │   │   │       ├── impersonation.admin.controller.ts
│   │   │   │       └── backups.admin.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── dashboard.service.ts
│   │   │   │   ├── dashboard-revenue.service.ts
│   │   │   │   ├── dashboard-users.service.ts
│   │   │   │   ├── dashboard-projects.service.ts
│   │   │   │   ├── dashboard-performance.service.ts
│   │   │   │   ├── system-config.service.ts
│   │   │   │   ├── email-templates.service.ts
│   │   │   │   ├── feature-flags.service.ts
│   │   │   │   ├── maintenance-mode.service.ts
│   │   │   │   ├── cache-management.service.ts
│   │   │   │   ├── background-jobs.service.ts
│   │   │   │   ├── system-logs.service.ts
│   │   │   │   ├── audit.service.ts
│   │   │   │   ├── audit-export.service.ts
│   │   │   │   ├── webhooks-management.service.ts
│   │   │   │   ├── webhook-deliveries.service.ts
│   │   │   │   ├── webhook-testing.service.ts
│   │   │   │   ├── impersonation.service.ts
│   │   │   │   ├── backups.service.ts
│   │   │   │   ├── backup-scheduler.service.ts
│   │   │   │   └── announcements.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── dashboard-query.dto.ts
│   │   │   │   ├── revenue-query.dto.ts
│   │   │   │   ├── update-system-config.dto.ts
│   │   │   │   ├── update-email-template.dto.ts
│   │   │   │   ├── toggle-feature.dto.ts
│   │   │   │   ├── toggle-maintenance.dto.ts
│   │   │   │   ├── clear-cache.dto.ts
│   │   │   │   ├── query-jobs.dto.ts
│   │   │   │   ├── query-logs.dto.ts
│   │   │   │   ├── query-audit.dto.ts
│   │   │   │   ├── export-audit.dto.ts
│   │   │   │   ├── create-webhook.dto.ts
│   │   │   │   ├── update-webhook.dto.ts
│   │   │   │   ├── test-webhook.dto.ts
│   │   │   │   ├── query-webhook-deliveries.dto.ts
│   │   │   │   ├── impersonate-user.dto.ts
│   │   │   │   ├── create-backup.dto.ts
│   │   │   │   ├── restore-backup.dto.ts
│   │   │   │   ├── update-backup-schedule.dto.ts
│   │   │   │   ├── send-announcement.dto.ts
│   │   │   │   ├── dashboard-response.dto.ts
│   │   │   │   ├── audit-response.dto.ts
│   │   │   │   ├── webhook-response.dto.ts
│   │   │   │   └── backup-response.dto.ts
│   │   │   ├── entities/
│   │   │   │   ├── system-config.entity.ts
│   │   │   │   ├── email-template.entity.ts
│   │   │   │   ├── feature-flag.entity.ts
│   │   │   │   ├── audit-log.entity.ts
│   │   │   │   ├── webhook.entity.ts
│   │   │   │   ├── webhook-delivery.entity.ts
│   │   │   │   ├── webhook-event.entity.ts
│   │   │   │   ├── impersonation-session.entity.ts
│   │   │   │   ├── backup.entity.ts
│   │   │   │   ├── backup-schedule.entity.ts
│   │   │   │   ├── background-job.entity.ts
│   │   │   │   └── announcement.entity.ts
│   │   │   ├── guards/
│   │   │   │   └── admin.guard.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── dashboard.interface.ts
│   │   │   │   ├── system-config.interface.ts
│   │   │   │   ├── webhook.interface.ts
│   │   │   │   ├── audit.interface.ts
│   │   │   │   └── backup.interface.ts
│   │   │   └── config/
│   │   │       └── admin.config.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── dashboard.service.spec.ts
│   │   │   │   ├── system-config.service.spec.ts
│   │   │   │   ├── email-templates.service.spec.ts
│   │   │   │   ├── feature-flags.service.spec.ts
│   │   │   │   ├── maintenance-mode.service.spec.ts
│   │   │   │   ├── audit.service.spec.ts
│   │   │   │   ├── webhooks-management.service.spec.ts
│   │   │   │   ├── impersonation.service.spec.ts
│   │   │   │   ├── backups.service.spec.ts
│   │   │   │   ├── dashboard.admin.controller.spec.ts
│   │   │   │   ├── system.admin.controller.spec.ts
│   │   │   │   ├── audit.admin.controller.spec.ts
│   │   │   │   ├── webhooks.admin.controller.spec.ts
│   │   │   │   └── backups.admin.controller.spec.ts
│   │   │   ├── e2e/
│   │   │   │   ├── dashboard.e2e-spec.ts
│   │   │   │   ├── system-config.e2e-spec.ts
│   │   │   │   ├── feature-flags.e2e-spec.ts
│   │   │   │   ├── audit.e2e-spec.ts
│   │   │   │   ├── webhooks.e2e-spec.ts
│   │   │   │   ├── impersonation.e2e-spec.ts
│   │   │   │   └── backups.e2e-spec.ts
│   │   │   └── fixtures/
│   │   │       └── admin.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── Dockerfile
│   │   │   ├── .eslintrc.js
│   │   ├── .prettierrc
│   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  WEBHOOKS INGESTION SERVICE
│   │ ────────────────────────────────────────
│   │
│   └── webhooks/
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── controllers/
│       │   │   └── webhook/
│       │   │       ├── webhook-receiver.controller.ts
│       │   │       └── webhook-logs.controller.ts
│       │   ├── services/
│       │   │   ├── webhook-ingestion.service.ts
│       │   │   ├── signature-verifier.service.ts
│       │   │   ├── webhook-enqueue.service.ts
│       │   │   ├── webhook-logs.service.ts
│       │   │   └── provider-registry.service.ts
│       │   ├── providers/
│       │   │   ├── razorpay.provider.ts
│       │   │   ├── github.provider.ts
│       │   │   └── generic.provider.ts
│       │   ├── dto/
│       │   │   ├── webhook-payload.dto.ts
│       │   │   ├── query-webhook-logs.dto.ts
│       │   │   └── webhook-log-response.dto.ts
│       │   ├── entities/
│       │   │   ├── webhook-event-log.entity.ts
│       │   │   └── webhook-provider-config.entity.ts
│       │   ├── guards/
│       │   │   ├── webhook-ip-allowlist.guard.ts
│       │   │   └── webhook-rate-limit.guard.ts
│       │   ├── interfaces/
│       │   │   ├── webhook-provider.interface.ts
│       │   │   └── webhook-verification.interface.ts
│       │   └── config/
│       │       └── webhooks.config.ts
│       ├── tests/
│       │   ├── unit/
│       │   │   ├── webhook-ingestion.service.spec.ts
│       │   │   ├── signature-verifier.service.spec.ts
│       │   │   ├── webhook-enqueue.service.spec.ts
│       │   │   ├── webhook-receiver.controller.spec.ts
│       │   │   └── razorpay.provider.spec.ts
│       │   ├── e2e/
│       │   │   ├── webhook-receive.e2e-spec.ts
│       │   │   └── webhook-logs.e2e-spec.ts
│       │   └── fixtures/
│       │       └── webhooks.fixture.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── nest-cli.json
│       ├── Dockerfile
│       ├── .eslintrc.js
│       ├── .prettierrc
│       └── README.md
│
│
│
│ ══════════════════════════════════════════════
│  WORKERS
│ ══════════════════════════════════════════════
│
├── workers/
│   │
│   │ ────────────────────────────────────────
│   │  EMAIL WORKER
│   │ ────────────────────────────────────────
│   │
│   ├── email-worker/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── consumers/
│   │   │   │   └── email.consumer.ts
│   │   │   ├── processors/
│   │   │   │   ├── verification-email.processor.ts
│   │   │   │   ├── password-reset-email.processor.ts
│   │   │   │   ├── welcome-email.processor.ts
│   │   │   │   ├── notification-email.processor.ts
│   │   │   │   ├── quote-email.processor.ts
│   │   │   │   ├── payment-email.processor.ts
│   │   │   │   ├── project-email.processor.ts
│   │   │   │   ├── contact-auto-reply.processor.ts
│   │   │   │   ├── contact-response.processor.ts
│   │   │   │   └── announcement-email.processor.ts
│   │   │   ├── services/
│   │   │   │   ├── email-worker.service.ts
│   │   │   │   ├── email-renderer.service.ts
│   │   │   │   └── email-retry.service.ts
│   │   │   ├── templates/
│   │   │   │   ├── layouts/
│   │   │   │   │   └── base.hbs
│   │   │   │   ├── verification.hbs
│   │   │   │   ├── password-reset.hbs
│   │   │   │   ├── welcome.hbs
│   │   │   │   ├── notification.hbs
│   │   │   │   ├── quote-sent.hbs
│   │   │   │   ├── quote-accepted.hbs
│   │   │   │   ├── payment-received.hbs
│   │   │   │   ├── payment-reminder.hbs
│   │   │   │   ├── payment-failed.hbs
│   │   │   │   ├── project-update.hbs
│   │   │   │   ├── project-completed.hbs
│   │   │   │   ├── contact-auto-reply.hbs
│   │   │   │   ├── contact-response.hbs
│   │   │   │   └── announcement.hbs
│   │   │   ├── config/
│   │   │   │   └── email-worker.config.ts
│   │   │   └── interfaces/
│   │   │       ├── email-job.interface.ts
│   │   │       └── email-template-data.interface.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── email.consumer.spec.ts
│   │   │   │   ├── email-worker.service.spec.ts
│   │   │   │   ├── email-renderer.service.spec.ts
│   │   │   │   └── verification-email.processor.spec.ts
│   │   │   └── fixtures/
│   │   │       └── email.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  NOTIFICATION WORKER
│   │ ────────────────────────────────────────
│   │
│   ├── notification-worker/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── consumers/
│   │   │   │   └── notification.consumer.ts
│   │   │   ├── processors/
│   │   │   │   ├── in-app-notification.processor.ts
│   │   │   │   ├── push-notification.processor.ts
│   │   │   │   └── realtime-fanout.processor.ts
│   │   │   ├── services/
│   │   │   │   ├── notification-worker.service.ts
│   │   │   │   ├── push-provider.service.ts
│   │   │   │   └── redis-publisher.service.ts
│   │   │   ├── config/
│   │   │   │   └── notification-worker.config.ts
│   │   │   └── interfaces/
│   │   │       ├── notification-job.interface.ts
│   │   │       └── push-payload.interface.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── notification.consumer.spec.ts
│   │   │   │   ├── notification-worker.service.spec.ts
│   │   │   │   ├── in-app-notification.processor.spec.ts
│   │   │   │   └── push-notification.processor.spec.ts
│   │   │   └── fixtures/
│   │   │       └── notification.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  AUDIT WORKER
│   │ ────────────────────────────────────────
│   │
│   ├── audit-worker/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── consumers/
│   │   │   │   └── audit.consumer.ts
│   │   │   ├── processors/
│   │   │   │   └── audit-batch-insert.processor.ts
│   │   │   ├── services/
│   │   │   │   ├── audit-worker.service.ts
│   │   │   │   └── batch-buffer.service.ts
│   │   │   ├── config/
│   │   │   │   └── audit-worker.config.ts
│   │   │   └── interfaces/
│   │   │       └── audit-job.interface.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── audit.consumer.spec.ts
│   │   │   │   ├── audit-worker.service.spec.ts
│   │   │   │   └── batch-buffer.service.spec.ts
│   │   │   └── fixtures/
│   │   │       └── audit.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  MEDIA WORKER
│   │ ────────────────────────────────────────
│   │
│   ├── media-worker/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── consumers/
│   │   │   │   └── media.consumer.ts
│   │   │   ├── processors/
│   │   │   │   ├── image-resize.processor.ts
│   │   │   │   ├── image-compress.processor.ts
│   │   │   │   ├── thumbnail-generator.processor.ts
│   │   │   │   ├── video-transcode.processor.ts
│   │   │   │   ├── document-thumbnail.processor.ts
│   │   │   │   ├── metadata-extractor.processor.ts
│   │   │   │   └── virus-scan.processor.ts
│   │   │   ├── services/
│   │   │   │   ├── media-worker.service.ts
│   │   │   │   ├── image-processing.service.ts
│   │   │   │   ├── video-processing.service.ts
│   │   │   │   └── cdn-invalidation-emitter.service.ts
│   │   │   ├── config/
│   │   │   │   └── media-worker.config.ts
│   │   │   └── interfaces/
│   │   │       ├── media-job.interface.ts
│   │   │       └── processing-options.interface.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── media.consumer.spec.ts
│   │   │   │   ├── media-worker.service.spec.ts
│   │   │   │   ├── image-processing.service.spec.ts
│   │   │   │   ├── thumbnail-generator.processor.spec.ts
│   │   │   │   └── virus-scan.processor.spec.ts
│   │   │   └── fixtures/
│   │   │       ├── media.fixture.ts
│   │   │       └── files/
│   │   │           ├── test-image.jpg
│   │   │           └── test-video.mp4
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  ANALYTICS WORKER
│   │ ────────────────────────────────────────
│   │
│   ├── analytics-worker/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── consumers/
│   │   │   │   └── analytics.consumer.ts
│   │   │   ├── processors/
│   │   │   │   ├── user-analytics.processor.ts
│   │   │   │   ├── project-analytics.processor.ts
│   │   │   │   ├── revenue-analytics.processor.ts
│   │   │   │   ├── portfolio-analytics.processor.ts
│   │   │   │   ├── blog-analytics.processor.ts
│   │   │   │   └── engagement-analytics.processor.ts
│   │   │   ├── services/
│   │   │   │   ├── analytics-worker.service.ts
│   │   │   │   ├── aggregation.service.ts
│   │   │   │   └── report-generator.service.ts
│   │   │   ├── config/
│   │   │   │   └── analytics-worker.config.ts
│   │   │   └── interfaces/
│   │   │       ├── analytics-job.interface.ts
│   │   │       └── aggregation-result.interface.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── analytics.consumer.spec.ts
│   │   │   │   ├── analytics-worker.service.spec.ts
│   │   │   │   ├── aggregation.service.spec.ts
│   │   │   │   └── revenue-analytics.processor.spec.ts
│   │   │   └── fixtures/
│   │   │       └── analytics.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  WEBHOOK WORKER
│   │ ────────────────────────────────────────
│   │
│   ├── webhook-worker/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── consumers/
│   │   │   │   └── webhook.consumer.ts
│   │   │   ├── processors/
│   │   │   │   ├── razorpay-webhook.processor.ts
│   │   │   │   ├── github-webhook.processor.ts
│   │   │   │   └── generic-webhook.processor.ts
│   │   │   ├── handlers/
│   │   │   │   ├── razorpay/
│   │   │   │   │   ├── payment-captured.handler.ts
│   │   │   │   │   ├── payment-failed.handler.ts
│   │   │   │   │   ├── refund-processed.handler.ts
│   │   │   │   │   └── dispute-created.handler.ts
│   │   │   │   └── github/
│   │   │   │       ├── push.handler.ts
│   │   │   │       ├── pull-request.handler.ts
│   │   │   │       └── deployment.handler.ts
│   │   │   ├── services/
│   │   │   │   ├── webhook-worker.service.ts
│   │   │   │   ├── signature-verifier.service.ts
│   │   │   │   └── webhook-logger.service.ts
│   │   │   ├── config/
│   │   │   │   └── webhook-worker.config.ts
│   │   │   └── interfaces/
│   │   │       ├── webhook-job.interface.ts
│   │   │       └── webhook-handler.interface.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── webhook.consumer.spec.ts
│   │   │   │   ├── webhook-worker.service.spec.ts
│   │   │   │   ├── signature-verifier.service.spec.ts
│   │   │   │   ├── razorpay-webhook.processor.spec.ts
│   │   │   │   ├── payment-captured.handler.spec.ts
│   │   │   │   └── payment-failed.handler.spec.ts
│   │   │   └── fixtures/
│   │   │       ├── webhook.fixture.ts
│   │   │       └── payloads/
│   │   │           ├── razorpay-payment-captured.json
│   │   │           ├── razorpay-payment-failed.json
│   │   │           ├── razorpay-refund.json
│   │   │           └── github-push.json
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  CDN WORKER
│   │ ────────────────────────────────────────
│   │
│   ├── cdn-worker/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── consumers/
│   │   │   │   └── cdn.consumer.ts
│   │   │   ├── processors/
│   │   │   │   ├── path-invalidation.processor.ts
│   │   │   │   └── batch-invalidation.processor.ts
│   │   │   ├── services/
│   │   │   │   ├── cdn-worker.service.ts
│   │   │   │   ├── cloudfront-invalidation.service.ts
│   │   │   │   ├── cloudflare-invalidation.service.ts
│   │   │   │   └── batch-collector.service.ts
│   │   │   ├── config/
│   │   │   │   └── cdn-worker.config.ts
│   │   │   └── interfaces/
│   │   │       ├── cdn-job.interface.ts
│   │   │       └── cdn-provider.interface.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── cdn.consumer.spec.ts
│   │   │   │   ├── cdn-worker.service.spec.ts
│   │   │   │   ├── cloudfront-invalidation.service.spec.ts
│   │   │   │   └── batch-collector.service.spec.ts
│   │   │   └── fixtures/
│   │   │       └── cdn.fixture.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   │   └── README.md
│   │
│   │ ────────────────────────────────────────
│   │  OUTBOX POLLER WORKER
│   │ ────────────────────────────────────────
│   │
│   └── outbox-poller/
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── services/
│       │   │   ├── outbox-poller.service.ts
│       │   │   ├── outbox-publisher.service.ts
│       │   │   └── poll-scheduler.service.ts
│       │   ├── config/
│       │   │   └── outbox-poller.config.ts
│       │   └── interfaces/
│       │       ├── outbox-record.interface.ts
│       │       └── poller-options.interface.ts
│       ├── tests/
│       │   ├── unit/
│       │   │   ├── outbox-poller.service.spec.ts
│       │   │   ├── outbox-publisher.service.spec.ts
│       │   │   └── poll-scheduler.service.spec.ts
│       │   └── fixtures/
│       │       └── outbox.fixture.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── Dockerfile
│       └── README.md
│
│
│
│ ══════════════════════════════════════════════
│  ROOT CONFIGURATION
│ ══════════════════════════════════════════════
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .gitignore
├── .gitattributes
├── .nvmrc
├── .editorconfig
├── .eslintrc.js
├── .prettierrc
├── .prettierignore
├── .lintstagedrc
├── .husky/
│   ├── pre-commit
│   └── commit-msg
├── commitlint.config.js
├── jest.config.ts
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.test.yml
├── docker-compose.prod.yml
├── Makefile
├── LICENSE
└── README.md
```
