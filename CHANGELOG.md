# Changelog

All notable changes to the **Nestlancer Backend API** are documented here.

- Style: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
- Generated from git history by `scripts/docs/generate-changelog.mjs` (`pnpm docs:changelog`)
- Coverage: **565 commits** (2026-02-23 → 2026-10-02)

## [Unreleased]

### Added

- Documentation overhaul: `docs/components/` for every service, worker, and library
- K3s/Terraform manifests and staging CD pipeline

---

## 2026-10

_6 commits_

### Added

- **email-templates** — enhance email templates with improved styling and structure (`25c4ea23`, 2026-10-01)

### Fixed

- **api,ops** — normalize envelopes, expose K3s metrics, and wire missing workers (`5d81b337`, 2026-10-02)
- **email** — ship client-safe transactional templates for ZeptoMail (`fe8cc303`, 2026-10-02)
- **audit** — harden quote send, unread counts, and ACL/session gaps (`106172f4`, 2026-10-02)
- **notifications** — honor account timezone for quiet hours (`737cb77b`, 2026-10-01)
- **auth,docs** — harden refresh races, portal mismatch, and PDF identity (`2dd6a50e`, 2026-10-01)

---

## 2026-09

_67 commits_

### Added

- **caddy** — add reverse proxy for Next.js on host.docker.internal (`2cf9b297`, 2026-09-24)
- **api** — implement token refresh mechanism for AdminApiClient (`30513a16`, 2026-09-20)
- **docker** — add resumable phased prod builds with progress UI (`2d09780e`, 2026-09-19)
- **middleware** — enhance public HTTP cache handling and response management (`a0877bc6`, 2026-09-18)
- **security** — gate Turnstile on Infisical secret presence (`cb1a6fd8`, 2026-09-18)
- **docker** — streamline image building and enhance worker deployment (`9298687c`, 2026-09-17)
- **cache** — implement public HTTP caching middleware and enhance response handling (`7966858c`, 2026-09-17)
- **healthcheck** — add health checks for services and workers (`a8916398`, 2026-09-16)
- **tracing** — enable tracing and enhance observability across services (`d7d63d3f`, 2026-09-16)
- **logging** — enhance observability and logging capabilities (`fd30c121`, 2026-09-15)
- **config** — enable tracing and enhance observability configuration (`538bf1b2`, 2026-09-14)
- **proxy** — enhance header management and public path resolution (`b53ee659`, 2026-09-14)
- **payments** — implement payment cancellation for admin and enhance payment intent creation (`478ddaae`, 2026-09-13)
- **notifications** — include amount details in notification messages (`d91c7a2f`, 2026-09-13)
- **admin** — enhance admin profile synchronization and avatar upload (`20e31b23`, 2026-09-13)
- **milestones** — enhance milestone handling and status management (`ba2a9fa2`, 2026-09-13)
- **avatars** — update avatar sources and metadata for user profiles (`477233f6`, 2026-09-12)
- **gateway** — add Permissions-Policy header for enhanced security (`82771175`, 2026-09-12)
- **auth** — implement refresh token grace period and locking mechanism (`e09a9bc1`, 2026-09-12)
- **sanitize** — refactor sanitization logic and introduce utility functions (`dd04a091`, 2026-09-12)
- **payments** — enhance manual payment processing and validation (`703dfaaf`, 2026-09-12)
- **payments** — enhance payment processing and notification clarity (`f3c9e077`, 2026-09-12)
- **projects** — add endpoint for project status change history (`5c94f4fd`, 2026-09-11)
- **documents** — enhance document visibility and notification message clarity (`b5fcc871`, 2026-09-11)
- **notifications** — enhance notification message templates and formatting (`7ea06c6e`, 2026-09-10)
- **payments** — update dispute retrieval logic and enhance response structure (`9fe11054`, 2026-09-09)
- **documents** — enhance document management for users and admins (`ab60f587`, 2026-09-08)
- **moderation** — implement message moderation features and history tracking (`b87eca6b`, 2026-09-07)
- **ip-utils** — add isPrivateOrLocalIp function and enhance getClientIp logic (`5a5b3b62`, 2026-09-06)
- **analytics** — complete admin dashboard metrics with real chart data (`6b2ee006`, 2026-09-04)
- **payments** — reconcile milestone progress and sync overall progress on payment completion (`a7a78599`, 2026-09-01)
- **messages** — add project thread endpoint and enhance project message retrieval (`b7c8e6e4`, 2026-09-01)
- **projects** — enhance project creation and payment scheduling from quotes (`9f841f72`, 2026-09-01)

### Fixed

- **perf** — cut serial reads and presign latency on hot paths (`7fe5f846`, 2026-09-24)
- **storage** — sign presigned URLs for the public host (`32affd3b`, 2026-09-24)
- **admin** — issue impersonation as a revocable client access token (`1b625bef`, 2026-09-23)
- **contact** — update ContactSubject enum and database migration for SALES and BILLING (`f1546d2e`, 2026-09-23)
- **notification-worker** — load VAPID keys from registered config path (`04f737c6`, 2026-09-22)
- **audit** — align queue health names and harden payment detail lookups (`da9b2f25`, 2026-09-22)
- **perf** — speed login, refresh, media, and hot-path scale (`63e52be3`, 2026-09-22)
- **docs, payments** — update S3 bucket policy and enhance dispute handling (`268976e6`, 2026-09-21)
- **audit** — keep disputed revenue collected and harden payment gates (`cb0238ea`, 2026-09-20)
- **audit** — stop payment-as-approval, analytics aliases, GSTIN, quote PDF cache (`8720c0c9`, 2026-09-20)
- **audit** — company legal PDF identity, jobs, reports, and quote totals (`b164b7a1`, 2026-09-20)
- **audit** — close remaining payment, deliverable, and document gaps (`4d7852fc`, 2026-09-20)
- **audit** — remediate payment, webhook SSRF, and API contract bugs (`8ad5884e`, 2026-09-19)
- **documents** — close public verify enumeration and extend public cache (`6105533c`, 2026-09-18)
- **audit** — stop list 500s, revision failures, and client note leaks (`f99c2d4a`, 2026-09-12)
- **rate-limit** — env-driven limits + MPC audit remediations (`c6783b87`, 2026-09-11)
- **projects** — update completed milestones logic to align with client hub requirements (`27c908d8`, 2026-09-10)
- **contact** — honor Turnstile bypass and return CONTACT_005 on verify failure (`0c70c556`, 2026-09-10)
- **throttle** — update rate limit handling and documentation for seeding (`20ecbb4d`, 2026-09-08)
- **audit** — capacity honesty, notification tabs, and docker-direct seeding (`3233931f`, 2026-09-06)
- **auth** — preserve 2FA challenge payload and verify hashed backup codes (`a5f5ca05`, 2026-09-05)
- **messages** — store file captions and show replies in timelines. (`23ccfb18`, 2026-09-04)
- **payments** — harden Razorpay confirm/webhook and manual-payment alias. (`559299c7`, 2026-09-02)
- **audit** — provision projects on quote accept and harden WS auth/CORS. (`94a9d831`, 2026-09-02)
- **audit** — expose request category in admin API and harden WS proxy (`199747a0`, 2026-09-02)
- **audit** — harden rate limits, CSP, PDF timeouts, and session UA parsing (`43b81028`, 2026-09-01)
- **audit** — remediate security findings and outbox project creation (`4028b6d6`, 2026-09-01)

### Changed

- **env** — add Infisical-aligned example env files with demo values (`5711b38a`, 2026-09-28)
- **security** — stop tracking env secrets and keep examples only (`e143a319`, 2026-09-28)
- **migrations** — remove obsolete migration files for chat threads, user preferences, and payment structures (`0c4ca917`, 2026-09-24)
- **seed** — replace Prisma and prod-data with one API seed runner (`8c2b08e1`, 2026-09-23)
- **docker** — speed up prod image builds with selective deploy (`b9a07a6a`, 2026-09-19)
- **health** — remove uptime from health responses and update tests (`13358220`, 2026-09-13)
- **notifications** — remove internal notifications gateway controller (`a1da26ab`, 2026-09-09)

---

## 2026-08

_64 commits_

### Added

- **token** — enhance refresh token management with revocation and validation (`9e15816f`, 2026-08-30)
- **seed** — implement unique per-client password generation for demo accounts (`ddae50db`, 2026-08-28)
- **payments** — add Razorpay + offline bank/UPI dual-path flow (`a5ade266`, 2026-08-26)
- **blog** — enrich public post detail for editorial article UI (`7b2039c0`, 2026-08-25)
- **docker** — optimize prod image builds with buildx bake and affected targets. (`67d9e5c9`, 2026-08-23)
- add production origin TLS support and update deployment scripts (`f921d0c1`, 2026-08-22)
- **rules** — add comprehensive rules for API contracts, authentication, CI/CD, database access, environment secrets, NestJS conventions, observability, project overview, queues, security, and testing (`9f759a5e`, 2026-08-16)
- **system** — harden maintenance mode and announcement delivery (`6bb80eda`, 2026-08-13)
- **messaging** — add archive/delete, group management, and remove emoji reactions (`f1adbe34`, 2026-08-10)
- **messaging** — improve inbox metadata and chat presence over WebSocket (`045597e8`, 2026-08-07)
- **avatars** — add new portrait sources to sources.json and update pnpm-lock.yaml with '@nestlancer/common' and 'puppeteer' dependencies. (`160780f4`, 2026-08-06)
- **pdf** — enhance PDF generation with Puppeteer header/footer support and layout options. (`1275ce2e`, 2026-08-03)
- **documents** — add admin download endpoint and restrict user version listings. (`276633ed`, 2026-08-01)
- **payments** — enrich billing PDFs with official references and project context. (`061693b3`, 2026-08-01)

### Fixed

- **audit** — restore users/me alias, outbox wiring, and media scan fixes (`21499e7b`, 2026-08-31)
- **audit** — harden media scan, logout revocation, and API security (`11ddf20f`, 2026-08-30)
- **audit** — remediate pass-02 security and API findings (`cc285add`, 2026-08-29)
- **ci** — detect prod stack with docker ps -a in deploy-only (`86bdcbed`, 2026-08-28)
- **ci** — deploy prod from live compose working_dir on VPS (`6f404162`, 2026-08-28)
- **ci** — reload prod secrets without GHCR pull when stack is live (`6b8d4f5d`, 2026-08-28)
- **ci** — install deps on VPS before prod migrate deploy (`e3c0a364`, 2026-08-28)
- **ci** — fallback prod deploy path when VPS clone is missing (`a09f94d5`, 2026-08-28)
- **security** — remediate external audit findings for prod API surface (`9d6509db`, 2026-08-28)
- **api** — route apex/www to landing and close second audit gaps (`f40bd1e2`, 2026-08-27)
- **api** — harden portal auth, document numbers, PDFs, and prod seed (`f4b87a18`, 2026-08-27)
- **api** — harden auth, PDFs, verify-document, and notification copy (`bac347ac`, 2026-08-26)
- **api** — repair prod QA defects for PDFs, quotes, invoices, and Turnstile (`3242a0c1`, 2026-08-26)
- **payments** — link trailing work to Final and expose billable amounts (`04a2dec1`, 2026-08-26)
- **prod** — seed portfolio catalog and restore public banners. (`144f631c`, 2026-08-25)
- **prod** — use app.nestlancer.com as the public client hostname. (`39b7390d`, 2026-08-25)
- **prod** — stream blog feeds, coerce message pagination, and harden S3 wipe. (`f43da185`, 2026-08-24)
- **prod-data** — seed via public gateway and survive rate limits (`995e7ab4`, 2026-08-23)
- **prod** — harden health probes, worker heartbeats, and OpenAPI merge. (`0465c5ec`, 2026-08-23)
- **prod** — restore health probes, worker heartbeats, and prod compose wiring. (`a9418b79`, 2026-08-22)
- **prod-data** — use gateway path for milestone request-payment seeding (`d118d64d`, 2026-08-22)
- **ci** — use non-watch Nest boot in Dev CD so gateway smoke can pass (`cac4ce1e`, 2026-08-20)
- **ci** — install deps before migrate and raise Dev CD SSH timeout (`60cfd0b7`, 2026-08-20)
- **ci** — clone backend deploy path on VPS if missing (`a4108797`, 2026-08-20)
- **test** — update unit mocks to match current service constructors (`e956c9ca`, 2026-08-20)
- **test** — align unit tests with exchange defaults and Prisma outbox model (`d459b722`, 2026-08-20)
- **test** — honor PDF_DEV_HTML_FALLBACK before launching Chromium (`912fb838`, 2026-08-20)
- **test** — mock assertExchange in queue publisher unit test (`bba6f8b9`, 2026-08-20)
- **ci** — restore green CI and add deployment guides (`f8113d96`, 2026-08-20)
- **ci/cd** — isolate prod from dev for same-VPS coexistence (`d1adc353`, 2026-08-19)
- **security** — harden gateway auth, secrets, and runtime defaults (`719b5a4d`, 2026-08-16)
- **blog** — add admin post/comment search and harden pagination (`d6936857`, 2026-08-14)
- **media** — restore /media/shared routing and tighten private/orphan scope (`00180a14`, 2026-08-13)
- **audit** — split log categories and fix impersonation session auditing (`90f1dd39`, 2026-08-07)
- **pdf** — refresh stale documents across all PDF types and rebuild dist on lib changes. (`9ab1ab36`, 2026-08-05)
- **pdf** — restore 3d838ed PDF layout and force stale payment document refresh. (`ced3d51e`, 2026-08-05)
- **pdf** — revert billing PDF enrichment to restore pre-upgrade payment format. (`7756a123`, 2026-08-05)
- **payments** — scale milestone schedules and serialize seeded installment payments. (`3d838ed6`, 2026-08-02)

### Changed

- **prod-data** — trim demo seed to 15 users and fix REDACTED_DEMO_PASSWORD passwords (`76718700`, 2026-08-30)
- **deploy** — add production deploy-only workflow for secret reloads (`cd33e7f6`, 2026-08-28)
- **api** — refresh OpenAPI mirror for dual-path payments (`47eefec2`, 2026-08-26)
- **prod-data** — professionalize demo account copy and seedKeys (`acc6c385`, 2026-08-23)
- **docker** — add fast prod monorepo builds and GHCR CD pipeline (`a0b061d0`, 2026-08-18)
- **docker** — retune 24GB watch bring-up and worker deploy (`730648f0`, 2026-08-18)
- **docker** — update resource limits and watch service configurations (`9bbee2bc`, 2026-08-17)
- **docker** — retune compose limits for the 8c/24GB VPS (`82d37615`, 2026-08-15)
- keep PDF UI from 1275ce2, discarding 50e427d and 7756a12 changes. (`56fb6778`, 2026-08-05)
- Revert "feat(pdf): enhance PDF generation with Puppeteer header/footer support and layout options." (`50e427d5`, 2026-08-05)

### Documentation

- update deployment guides for dev and prod environments (`506a86d0`, 2026-08-21)

### Removed

- **docker** — restore compose and deploy scripts to pre-VPS-tune state (`58809aac`, 2026-08-17)

---

## 2026-07

_13 commits_

### Added

- **milestones** — enforce sequence rules and payment gating on approval. (`6cf9f6b8`, 2026-07-31)
- **prod-data** — add demo avatars, profile seeding, and dev proxy fixes (`153dc54d`, 2026-07-30)
- **prod-data** — expand user-admin interaction seed cohorts and scenarios. (`4a721bd7`, 2026-07-25)
- **quotes** — add service agreement preview, signing, and enriched contract PDFs. (`b61450ea`, 2026-07-24)
- **quotes** — expose standard and project-specific terms on client quotes. (`8cedc73f`, 2026-07-23)
- **prod-data,admin** — unify seed layout and seed-safe upsert APIs (`d35f1928`, 2026-07-19)
- **prod-data** — introduce new blog seed layer with comprehensive data and scripts (`ff0be10a`, 2026-07-18)
- **docker** — harden compose for SSH-safe low-RAM VPS bring-up (`2bd418c7`, 2026-07-16)
- **observability** — wire metrics, tracing, and infra monitoring across workloads (`8a279484`, 2026-07-12)

### Fixed

- **payments** — enforce dual-model pay-only milestone gating (`acdc8bcd`, 2026-07-20)
- **openapi** — use object example for notification template channels (`17ca7a10`, 2026-07-19)
- **blog,quotes** — wire taxonomy CRUD and quote payment schedule on patch (`6a7e4cdd`, 2026-07-19)

### Changed

- **openapi** — refresh merged spec for contract preview and admin download routes (`62c0eee2`, 2026-07-24)

---

## 2026-06

_95 commits_

### Added

- **prod-data** — add comprehensive documentation for admin-client data flow (`da486c61`, 2026-06-21)
- **prod-data** — add dev user-admin interaction seed scenarios (`092d3617`, 2026-06-20)
- **prod-data** — add database and cloud storage reset tooling (`489e2750`, 2026-06-20)
- **prod-data** — add Python init seed pipeline with JSON reference data (`afba227b`, 2026-06-20)
- **scripts** — add migration bootstrap helpers and MIGRATION_DATABASE_URL support (`df67a0c8`, 2026-06-20)
- **docs** — add comprehensive API flow guide for admin-client interactions (`68d1ddad`, 2026-06-18)
- **quotes** — add line-item library, quote prefill, and deprecate static templates (`40ce6af5`, 2026-06-18)
- **payments** — implement ProgressProxyService for milestone completion (`fb32c511`, 2026-06-18)
- **gateway** — expose admin routes and service registry for flow plan (`a6ae92da`, 2026-06-18)
- **progress** — milestone review workflow and admin time entries (`9f65e019`, 2026-06-18)
- **payments** — shared completion flow, enforcement, and reconciliation (`e1d5b14e`, 2026-06-18)
- **projects** — consolidate payment schedule and project lifecycle (`c4bf60c9`, 2026-06-18)
- **quotes** — support payment schedules and automated quote expiry (`081056c0`, 2026-06-18)
- **requests** — add service catalog, admin capacity, and quote DTOs (`4303af2b`, 2026-06-18)
- **libs** — extend outbox routing, notification jobs, and test DB helper (`c30ee479`, 2026-06-18)
- **common** — add payment schedule utilities, state machines, and enums (`692cdd79`, 2026-06-18)
- **db** — add flow plan schema, migrations, and db tooling (`caeb0119`, 2026-06-18)
- **audit** — implement audit queue service and enhance logging (`2f51c4f3`, 2026-06-15)
- **gateway** — expose portfolio admin and project bridge routes (`de27496d`, 2026-06-13)
- **media** — add promote-to-portfolio workflow for admin media (`efda476f`, 2026-06-13)
- **projects** — add project-to-portfolio draft bridge (`2816dbe1`, 2026-06-13)
- **portfolio** — add media management, likes, and public response mapping (`a451367a`, 2026-06-13)
- **db** — add portfolio project bridge, likes, and preview media schema (`7f9d4d53`, 2026-06-13)
- **blogs** — add repair-images option to seed script (`c3b3e13e`, 2026-06-12)
- **gateway** — expose expanded admin media routes (`892ddd87`, 2026-06-12)
- **media** — enhance share endpoints with link purpose support (`f2fe039d`, 2026-06-12)
- **media** — expand admin media service and controller endpoints (`1c0fc058`, 2026-06-12)
- **media** — add admin query, references, and scope services (`3ad614fb`, 2026-06-12)
- **media** — add admin DTOs and expand query/share validation (`70a6a913`, 2026-06-12)
- **media** — add share link purpose to media schema (`309ddb65`, 2026-06-12)
- **workers** — expand export processor formats and document worker hooks. (`7fb14085`, 2026-06-12)
- **gateway** — expose admin routes for reports, templates, documents and exports. (`454668c4`, 2026-06-12)
- **admin** — add analytics reports listing and download endpoints. (`c0d392b9`, 2026-06-12)
- **progress** — enforce client-facing progress visibility rules. (`8c1ad189`, 2026-06-12)
- **payments** — add admin receipt/invoice routes and remove duplicate PDF logic. (`78a1c747`, 2026-06-12)
- **quotes** — add contract PDF service and document version endpoints. (`5ba0a7f1`, 2026-06-12)
- **projects** — improve payment schedules, timeline and deliverable handling. (`2ace0804`, 2026-06-12)
- **projects** — add duplicate-from-template wizard API and deprecate async clone. (`79ff1282`, 2026-06-12)
- **documents** — extend generation service with versioning support. (`69899b8b`, 2026-06-12)
- **pdf** — refresh templates, layout, branding and formatting utilities. (`02265e02`, 2026-06-12)
- **common** — add progress visibility and project access constants. (`e004315a`, 2026-06-12)
- **gateway** — remediate route gaps, standardize INR, and fix payment/delivery flows (`196bbf68`, 2026-06-11)
- **pdf** — unify document branding and layout across PDF templates (`a0898e7a`, 2026-06-09)
- **notifications** — add preference gating, templates, and worker dispatch pipeline. (`37631604`, 2026-06-08)
- **documents** — add document generation, versioning, and verification system (`c82f45fc`, 2026-06-08)
- **cdn** — enhance Cloudflare configuration and invalidation handling (`d881d0ff`, 2026-06-07)
- **prod-data** — add blog seed catalog, featured images, and API seeder (`83f8db6a`, 2026-06-05)
- **env** — update environment configuration for Backblaze B2 and email services (`cbc14065`, 2026-06-05)
- **email** — add shared email library and unify dispatch pipeline (`c2586718`, 2026-06-04)
- **payments** — enforce milestone payment gating and review reminders (`eef361b1`, 2026-06-02)
- **deploy** — expand K3s manifests with env overlays and deploy automation (`d04755d8`, 2026-06-01)
- **deploy** — standardize production images on GHCR and expand K3s manifests (`102c6d33`, 2026-06-01)
- **deploy** — add K3s/Terraform manifests and staging CD pipeline (`ba86fd33`, 2026-06-01)

### Fixed

- **services** — honor soft deletes and consolidate 2FA on authConfig (`8eb22295`, 2026-06-21)
- **portfolio,media,messaging,notifications** — align interfaces and enums (`9d5caae4`, 2026-06-18)
- **gateway** — expose portfolio media admin routes in OpenAPI (`1341bdc4`, 2026-06-13)
- **requests** — align request creation DTO and service handling (`7d3625fa`, 2026-06-13)
- **contact** — align contact submission DTO and handling (`98f4e7f8`, 2026-06-13)
- **media-worker** — improve virus scan processor error handling (`37810f9f`, 2026-06-12)
- **users** — wire activity service for export and document audit events. (`93e9cc92`, 2026-06-12)
- **notifications** — align job mapper with new document and export events. (`a8b8ae88`, 2026-06-12)
- **blog** — expose featured image URLs and harden media publishing (`12e15c35`, 2026-06-05)
- **mail** — resolve ZeptoMail SMTP host by region (India DC) (`b5dc350e`, 2026-06-01)
- **product** — align API copy and tests with single-studio model (`7fd6a962`, 2026-06-01)
- **users** — wire admin GDPR export and add swagger:validate CI alias (`3608573c`, 2026-06-01)

### Changed

- **storage** — consolidate object storage to S3-compatible config only (`3570c64f`, 2026-06-23)
- **env** — remove deprecated environment configuration files (`a3bcf99b`, 2026-06-21)
- **prod-data** — remove deprecated blog seed data and related files (`cbcc27a7`, 2026-06-21)
- **prod-data** — adopt scripts/data layout and shared lib for seed layers (`d499c836`, 2026-06-21)
- **db** — harden Prisma schema, CHECK constraints, and migration bootstrap (`31cf1e34`, 2026-06-20)
- **config** — wire package scripts, gitignore, and Infisical for prod-data (`314f5f71`, 2026-06-20)
- **seeds** — align Prisma seed scripts with prod-data init pipeline (`e3c6d8e4`, 2026-06-20)
- **db** — squash Prisma migrations into consolidated init migration (`5b11d433`, 2026-06-20)
- **config** — add payment enforcement and scheduler env vars (`2e86eadb`, 2026-06-18)
- **blog** — split taxonomy into authors, categories, and tags services (`fe25660e`, 2026-06-18)
- **openapi** — refresh merged spec with admin media routes (`120de297`, 2026-06-12)
- **openapi** — refresh merged spec with new gateway routes (`9e07b99f`, 2026-06-12)
- **docker** — update dev compose and Dockerfile for local services. (`bdfde9bc`, 2026-06-12)
- **blog** — remove blog series feature and related fields (`ef0957c9`, 2026-06-05)
- **database** — enhance database connection handling with pg-pool utility (`ff4182ed`, 2026-06-05)
- **docker** — update development environment configuration and add Caddy proxy (`dec3099a`, 2026-06-02)
- **deploy** — update K3s manifests for environment-specific configurations (`945989a8`, 2026-06-02)
- **ci** — publish production images only on release (`87210e8f`, 2026-06-02)
- **deploy** — update production docker and workflows (`989def01`, 2026-06-02)
- Merge pull request #10 from nestlancer/chore/fix-dependabot-branches (`8c60075c`, 2026-06-02)
- Merge pull request #6 from nestlancer/chore/fix-dependabot-branches (`2d590536`, 2026-06-01)
- **deps** — tame Dependabot and align root uuid to v13 (`398ad9a5`, 2026-06-01)
- relax gitignore for private repo disaster recovery (`21e68d4a`, 2026-06-01)
- **prisma** — split prod and dev seeds with env-specific taxonomy (`f6f43848`, 2026-06-01)

### Documentation

- **prod-data** — reorganize seeding docs and add blog seed runner (`cc935315`, 2026-06-20)
- **readme** — add backend beginner guide and ops runbook references (`9864a1b2`, 2026-06-02)
- restructure documentation and standardize markdown format (`d09f01f5`, 2026-06-01)
- add master implementation tracker and fix CI workflow paths (`478efa47`, 2026-06-01)

### Tests

- **e2e** — add flow plan v2 cross-service integration coverage (`8e040f65`, 2026-06-18)
- **portfolio,projects** — cover bridge, media, and payload utilities (`c99df776`, 2026-06-13)

---

## 2026-05

_74 commits_

### Added

- **admin** — add user and project filters for pipeline drill-down (`f5946679`, 2026-05-31)
- **portfolio** — add public timeline endpoint and fix Prisma JSON typing (`be791c3a`, 2026-05-30)
- **openapi** — enhance OpenAPI normalization and merge logic (`7d931668`, 2026-05-29)
- **openapi** — harden merged spec and fix gateway webhook routing (`fef45d99`, 2026-05-29)
- **openapi** — normalize merged spec and fix nested notification DTOs (`1464cb07`, 2026-05-29)
- **openapi** — unify merged spec contract source and standard responses (`497aa755`, 2026-05-29)
- **blog** — expand admin APIs and harden public post reads (`85cd97e4`, 2026-05-26)
- **storage,auth,requests** — presigned downloads, permissions guard, and portfolio admin (`53bb1ca1`, 2026-05-24)
- **messages, media** — enhance messaging and media handling with new endpoints and context management (`4d7608e6`, 2026-05-24)
- **media** — chunked upload, public share links, and admin gateway parity (`a0c839e6`, 2026-05-23)
- implement client IP handling and decorator for proxy-aware requests (`777d5a23`, 2026-05-23)
- **progress,payments** — milestone lifecycle, paise contract, and admin gateway parity (`a2c521d7`, 2026-05-22)
- payment-to-project lifecycle, centralized outbox routing, and Razorpay checkout config (`d68fc69c`, 2026-05-22)
- gateway and service routes for payments, progress, and project schedules (`f0683f37`, 2026-05-21)
- admin project/progress routes, quote-accepted project creation, and API gap fixes (`dd3e4300`, 2026-05-21)
- add admin requests/quotes gateway routes and harden 2FA and quote flows (`c59ae26c`, 2026-05-21)
- implement admin user management API enhancements and password reset flow (`e65bb10d`, 2026-05-20)
- add CI/CD workflows for backend deployment and testing (`60e39b1e`, 2026-05-17)
- **admin** — proxy user impersonation and document OpenAPI sources (`ff8cd5b7`, 2026-05-17)
- **gateway** — add client dashboard-summary BFF with parallel upstream calls (`e7fdaef9`, 2026-05-16)
- **messaging** — add chat threads, realtime delivery, and project-scoped access (`1dedb85c`, 2026-05-15)
- add logout and logout-all endpoints for session management (`939a0a0f`, 2026-05-14)
- implement role-based access control and enhance JWT handling (`62eaf5b0`, 2026-05-14)
- **tests** — expand system testing suite with new E2E and smoke tests (`a9dbf69b`, 2026-05-05)
- **testing** — add cross-cutting system smoke suite for platform wiring (`44b992c3`, 2026-05-05)

### Fixed

- **payments** — expose admin refund route and harden Razorpay refund flow (`604b1531`, 2026-05-31)
- **blog** — client-side view tracking, engagement API, and comment auth fixes. (`ad1b386f`, 2026-05-31)
- **admin** — restore audit logs and blog analytics gateway routing. (`a9f91879`, 2026-05-31)
- **gateway** — expose admin payment detail and notification template routes (`4d02ad55`, 2026-05-31)
- standardize quotes in Docker Compose files and update envfile reports (`d938ce0a`, 2026-05-18)
- **gateway** — make Swagger docs public and add merged OpenAPI export (`d73a157c`, 2026-05-15)
- **e2e** — stabilize system suite and align gateway/service routes (`221bae88`, 2026-05-06)

### Changed

- Harden auth and share APIs to keep secrets out of URLs and logs. (`1fdfabe5`, 2026-05-31)
- **api** — commit merged OpenAPI mirror for contract checks (`33a5e2de`, 2026-05-29)
- **auth** — remove CSRF token endpoint and update health check visibility (`fe318ec2`, 2026-05-24)
- update environment variables and pnpm lock for new project dependencies (`8248d27b`, 2026-05-23)
- lint/format gateway and services; clarify paise Swagger docs (`8978b71b`, 2026-05-23)
- streamline Swagger setup and enhance response interceptors (`589a2c57`, 2026-05-20)
- add CI/CD workflows for backend validation and deployment (`609b322d`, 2026-05-20)
- improve documentation for Infisical error messages and database migration commands (`215a82b5`, 2026-05-19)
- update database migration commands and CI/CD workflow documentation (`325362e6`, 2026-05-19)
- refactor Infisical secret fetching in CI/CD workflow and add export script (`cc6df85e`, 2026-05-19)
- format .infisical.json for consistency and readability (`50b17621`, 2026-05-19)
- commit .infisical.json for CI/CD integration and update workflow logic (`e9a20fa1`, 2026-05-19)
- enhance CI/CD workflow for Infisical integration and update documentation (`94017ac7`, 2026-05-19)
- add local CD simulation script and update Infisical export in CI/CD workflow (`5db995bb`, 2026-05-19)
- update Infisical secrets-action method in CI/CD workflow and documentation (`65be923d`, 2026-05-19)
- update Jest configuration and CI workflow for improved performance (`c2672809`, 2026-05-19)
- update Node.js version and add Prisma Client generation step in CI/CD workflows (`2ba9bf76`, 2026-05-18)
- update ESLint configurations across services to improve type safety and consistency (`5bf4b9cc`, 2026-05-18)
- update controller methods to remove Promise<any> return type and improve DTO usage (`05feada8`, 2026-05-18)
- migrate dev env to Infisical and update dev CD/deploy flow (`55d77cc4`, 2026-05-18)
- update Docker images in development and E2E configurations (`f4f928c6`, 2026-05-17)
- update user-related endpoints in AdminController to forward requests to users service (`ad2c2d38`, 2026-05-14)
- improve CORS origin parsing and add production warning for development seeds (`9652e7b0`, 2026-05-13)
- enhance development seed data for improved testing and UI simulation (`2d27d638`, 2026-05-13)
- update environment configurations and enhance JWT handling (`502217a3`, 2026-05-12)
- enhance OpenAPI documentation and validation processes (`1a749095`, 2026-05-10)
- add comprehensive environment validation report for development, e2e, and production configurations (`9d392643`, 2026-05-07)
- update Razorpay credentials in development and e2e environment files, and add validation report for environment configurations (`2aaf5b92`, 2026-05-07)
- update environment variable values for service connectivity across development, e2e, and production environments (`c0d71f97`, 2026-05-07)
- update E2E test commands for improved performance (`d95dd586`, 2026-05-05)
- enable force exit in Jest configuration for E2E tests (`d449a8fc`, 2026-05-05)

### Documentation

- document Node.js version requirements and provide ESM-safe workarounds for Prisma commands (`957bd040`, 2026-05-09)
- add comprehensive testing report for Nestlancer backend (`9d9d1902`, 2026-05-05)
- update README with E2E database runbook and migration troubleshooting steps (`f7c68c11`, 2026-05-04)

### Tests

- refactor QuoteStatusService unit tests to use mockPrismaWrite (`8f7e26d8`, 2026-05-19)
- simplify mock implementation in TokenService unit tests (`564b381d`, 2026-05-19)
- refactor unit tests for RegistrationService and TokenService to use mockPrismaWrite (`127638aa`, 2026-05-19)
- update unit tests to use mockPrismaWrite for media and request services (`beaa4107`, 2026-05-19)
- enhance unit tests for messaging services with additional mocks and assertions (`9f825971`, 2026-05-19)
- add JWT access public key to integration and unit tests (`e03c77ba`, 2026-05-18)
- **system** — add complete cross-service smoke coverage and full docker-compose.e2e stack (`9ac55bd1`, 2026-05-05)
- align specs with current module wiring and service contracts (`87f378c4`, 2026-05-04)

---

## 2026-04

_9 commits_

### Added

- enhance Docker configuration and queue services (`47398146`, 2026-04-29)
- add docker-compose orchestration and convenience scripts for development environment setup (`dc166f4b`, 2026-04-29)
- Add initial configuration files for code-review-graph (`d2a4c219`, 2026-04-22)

### Changed

- update Docker configuration and TypeScript settings (`cbd34802`, 2026-04-29)
- remove obsolete database and deployment scripts (`66b90e21`, 2026-04-28)
- remove obsolete Docker Compose files and related commands (`f95e8fea`, 2026-04-28)
- migrate storage stack to MinIO-compatible S3 provider. - Replace the dedicated Cloudflare R2 provider wiring with a generic S3 provider flow and add first-class MinIO configuration suppor… (`22bc3704`, 2026-04-28)
- Remove obsolete configuration and documentation files (`24c56b60`, 2026-04-22)
- update storage configuration and logging commands for Docker (`7f8a2cbe`, 2026-04-22)

---

## 2026-03

_208 commits_

### Added

- Add comprehensive storage and CDN setup guide for Backblaze B2 and Cloudflare, updating environment configurations, setup scripts, and documentation. (`015b90e6`, 2026-03-28)
- Add comprehensive storage and CDN setup guide for Backblaze B2 and Cloudflare, updating environment configurations, setup scripts, and documentation. (`0777718b`, 2026-03-26)
- **storage** — add cloud fallback with background synchronization (`7044b147`, 2026-03-17)
- Refactor storage configuration for improved clarity and consistency (`12d1fafb`, 2026-03-17)
- Update email configuration to use noreply address (`66d318be`, 2026-03-16)
- Revamp environment configuration files for clarity and consistency (`0f87f19f`, 2026-03-15)
- Remove backup management functionality and related components (`db9a6d3b`, 2026-03-15)
- Enhance outbox polling with retry logic and metrics (`ec8f227c`, 2026-03-15)
- Enhance webhook consumer with metrics, DLQ support, and idempotency (`6d169fa5`, 2026-03-15)
- Add streaming download functionality to storage providers (`7db8049b`, 2026-03-15)
- Enhance analytics consumer with DTO validation and DLQ support (`d12c85d0`, 2026-03-15)
- Enhance audit worker with DTO validation and queue configuration (`f84a7110`, 2026-03-15)
- Add notification handling with retry logic and validation (`8dd9cd9b`, 2026-03-15)
- Implement email idempotency with caching and dynamic mailer configuration, and fallback to a default templates path. (`9f98631b`, 2026-03-15)
- add typescript configuration with path aliases and simplify husky hook scripts (`8f7b0d29`, 2026-03-15)
- enhance E2E tests for WebSocket gateway (`39d0d9e7`, 2026-03-14)
- **admin** — replace super-admin guard with admin guard, add backup/impersonation models (`177ace12`, 2026-03-14)
- enhance E2E testing for contact service (`4b4225ab`, 2026-03-13)
- enhance E2E testing for blog service (`b52bce39`, 2026-03-13)
- enhance E2E testing for portfolio service (`832aaf7e`, 2026-03-13)
- enhance E2E testing for media service (`b375187c`, 2026-03-13)
- enhance E2E testing for messaging service (`3b1b5f79`, 2026-03-13)
- enhance E2E testing for notifications service (`776fa846`, 2026-03-13)
- **payments** — add service-level E2E tests with strict assertions (`d9340eee`, 2026-03-13)
- enhance E2E testing for progress service and improve error handling (`924be5f5`, 2026-03-13)
- enhance validation and error handling in project services (`26f0397c`, 2026-03-13)
- enhance E2E testing for quotes service and improve error handling (`9bba12c1`, 2026-03-13)
- enhance business logic exception handling and improve E2E test assertions (`ed97455c`, 2026-03-13)
- **test** — comprehensive e2e test suite expansion and documentation (`babb5fba`, 2026-03-09)
- implement business logic in ws-gateway (`1cdd5d64`, 2026-03-09)
- implement business logic in workers/webhook-worker (`9329d267`, 2026-03-09)
- implement business logic in workers/media-worker (`c23a629e`, 2026-03-09)
- implement business logic in workers/audit-worker (`f9c8c301`, 2026-03-09)
- implement business logic in workers/analytics-worker (`da04e994`, 2026-03-09)
- implement business logic in services/users (`e9079070`, 2026-03-09)
- implement business logic in services/requests (`26b04f9c`, 2026-03-09)
- implement business logic in services/quotes (`37ca01da`, 2026-03-09)
- implement business logic in services/projects (`e0e2fc62`, 2026-03-09)
- implement business logic in services/progress (`a3e45318`, 2026-03-09)
- implement business logic in services/portfolio (`71b10b8f`, 2026-03-09)
- implement business logic in services/payments (`ce8ca4b0`, 2026-03-09)
- implement business logic in services/notifications (`0aec4fc1`, 2026-03-09)
- implement business logic in services/messaging (`4395ecb7`, 2026-03-09)
- implement business logic in services/media (`9c6dd764`, 2026-03-09)
- implement business logic in services/health (`1db912e5`, 2026-03-09)
- implement business logic in services/blog (`fddf1a80`, 2026-03-09)
- implement business logic in services/admin (`0a721d7c`, 2026-03-09)
- implement business logic in gateway/auth (`034bd47c`, 2026-03-09)
- implement business logic in root package.json (`11065d28`, 2026-03-09)
- implement business logic in libs/storage (`7e12be08`, 2026-03-09)
- implement business logic in prisma/schema (`bcd5285d`, 2026-03-09)
- **webhook-worker** — add jsdoc and refine webhook delivery worker (`bd7310e9`, 2026-03-08)
- **outbox-poller** — add jsdoc and refine outbox polling implementation (`9f8d567a`, 2026-03-08)
- **notification-worker** — add jsdoc and refine notification push providers (`ee700b94`, 2026-03-08)
- **media-worker** — add jsdoc and refine media processing workers (`f01a7896`, 2026-03-08)
- **email-worker** — add jsdoc and refine email rendering and retry logic (`bd1dc5e4`, 2026-03-08)
- **cdn-worker** — add jsdoc and refine cdn invalidation service (`7c101d58`, 2026-03-08)
- **audit-worker** — add jsdoc and refine audit consumer implementation (`e15e44c5`, 2026-03-08)
- **analytics-worker** — add jsdoc and refine analytics aggregation logic (`d612c45f`, 2026-03-08)
- **webhooks** — add swagger documentation and refine webhook service (`79d9e18e`, 2026-03-08)
- **users** — add swagger documentation and refine user service (`b1baa6cc`, 2026-03-08)
- **requests** — add swagger documentation and refine requests service (`457d7bae`, 2026-03-08)
- **quotes** — add swagger documentation and refine quotes service (`a564ba19`, 2026-03-08)
- **projects** — add swagger documentation and refine projects service (`c2b1c414`, 2026-03-08)
- **progress** — add swagger documentation and refine progress service (`fd6c2c0a`, 2026-03-08)
- **portfolio** — add swagger documentation and refine portfolio service (`6bcfabb2`, 2026-03-08)
- **payments** — add swagger documentation and refine payment service (`60c86ade`, 2026-03-08)
- **notifications** — add swagger documentation and refine notification service (`6f8eba7a`, 2026-03-08)
- **messaging** — add swagger documentation and refine messaging service (`957deed3`, 2026-03-08)
- **media** — add swagger documentation and refine media service (`cd88769a`, 2026-03-08)
- **health** — add swagger documentation for health checks (`95bf2082`, 2026-03-08)
- **contact** — add swagger documentation and refine contact service (`241468ad`, 2026-03-08)
- **blog** — add swagger documentation and refine blog services (`a0eb5ef0`, 2026-03-08)
- **auth** — add swagger documentation for public endpoints and DTOs (`06ff0b5d`, 2026-03-08)
- **admin** — add swagger documentation and refine controllers (`f40e3243`, 2026-03-08)
- **gateway** — update global routing for audited endpoints (`b147c515`, 2026-03-08)
- **misc** — update admin, messaging, health, and webhook services (`1a850f95`, 2026-03-08)
- **blog** — expand analytics, taxonomy, and moderation features (`c2d622d4`, 2026-03-08)
- **payments** — add user invoices and milestone management (`d622572c`, 2026-03-08)
- **notifications** — implement push notifications and root controllers (`1dd05097`, 2026-03-08)
- **media** — add chunked upload and root media controllers (`082f6550`, 2026-03-08)
- **users** — implement 2FA, admin bulk operations, and activity logs (`b09baec4`, 2026-03-08)
- Add X-Request-ID and X-API-Version headers and allow X-Request-ID as an alternative correlation ID input. (`f308d28e`, 2026-03-07)
- **workers** — integrate and stabilize all 8 worker services in Docker (`0e5757a2`, 2026-03-07)
- add custom webpack configuration and progress service (`a56e0475`, 2026-03-06)
- Introduce ProgressModule and detailed health check; enhance E2E setup with AI prompt, refine proxy error handling, and update test data. (`8f312132`, 2026-03-06)
- **analytics-worker** — stabilize worker configuration and complete report generation (`77dd46fe`, 2026-03-05)
- **test** — add missing unit tests for services and workers (`7b2e3fdb`, 2026-03-04)
- delete unused Prisma migration file (`20df9094`, 2026-03-04)
- Migrate media worker to @nestlancer/queue for message consumption, update storage service API, and streamline processors. (`1bf75171`, 2026-03-03)
- Introduce Dispute model, refine payment statuses, migrate incoming webhooks to WebhookLog, and standardize queue processing with @nestlancer/queue decorators. (`6c5681c7`, 2026-03-03)
- fix build errors in payments service and update user field references (`49d19fa0`, 2026-03-03)
- update quote schema and enhance PDF generation service (`b3c5606f`, 2026-03-03)
- **prisma** — major schema update and database documentation (`421fd2ad`, 2026-03-03)
- **libs** — improve alerts routing, outbox publishing, and add comprehensive test suites (`9a3861ae`, 2026-03-01)

### Fixed

- **e2e** — update Jest configuration to support ESM-only uuid transformation (`de5359af`, 2026-03-13)
- **services** — resolve backend service startup failures and dependency injection issues (`a9413085`, 2026-03-07)
- **gateway** — correct proxy routing logic and app module configuration (`2d809b7e`, 2026-03-05)
- **ws-gateway** — fix failing unit and integration tests (`0c82a7f3`, 2026-03-05)
- **webhook-worker** — fix app.module, tests, and integration spec (`a4fe7f67`, 2026-03-05)
- **outbox-poller** — resolve failing unit and integration tests (`c78e82e1`, 2026-03-05)
- **media-worker** — resolve module initialization issues and fix tests (`4a3036b4`, 2026-03-05)
- **notification-worker** — implement unit tests and fix dependency resolution (`7ce94dd8`, 2026-03-05)
- **workers** — resolve audit-worker and cdn-worker test failures (`0fa26736`, 2026-03-05)
- **email-worker** — resolve dependency injection and template loading issues (`a3f7bd20`, 2026-03-05)
- **messaging-service** — resolve missing dependencies in AppModule (`f2212306`, 2026-03-05)
- **tests** — resolve dependency and configuration issues in progress and projects services (`b327d749`, 2026-03-04)
- **health,contact** — resolve dependency injection errors and fix test failures (`926f99ba`, 2026-03-04)
- **users** — resolve test failures and prisma schema inconsistencies (`fa68e0bf`, 2026-03-04)
- **auth** — resolve integration and unit test failures (`7593e47c`, 2026-03-04)
- **tests** — resolve relative import path errors in unit tests (`137af126`, 2026-03-04)
- **notifications** — resolve build errors and update imports - Update main.ts to use LoggerService from @nestlancer/logger and remove logger injection from AllExceptionsFilter. - Fix Prisma orderBy … (`13f9d16e`, 2026-03-03)
- **requests** — align requests-service with schema and fix build errors - Updated Prisma schemas (request.prisma, user.prisma) to include missing relations and fields. - Refactored RequestsService a… (`b9fb384b`, 2026-03-03)
- **projects** — resolve build errors and update relation mapping (`3ebb9292`, 2026-03-03)
- **ws-gateway** — resolve build errors and correct CacheService usage (`21bb6e4a`, 2026-03-03)
- **gateway** — resolve compression import and add express dependencies (`4791f2ae`, 2026-03-03)
- **users-service** — resolve build errors and align with schema changes (`27adb29f`, 2026-03-03)
- **auth-service** — resolve build errors and align schema with service logic (`4927f237`, 2026-03-03)
- **libs** — resolve tsc errors in libs/testing and fix failing library tests (`0a2fcc17`, 2026-03-02)
- **testing** — resolve 32 typescript compilation errors in libs/testing (`6088ad06`, 2026-03-02)

### Changed

- implement automated storage cleanup for orphaned assets on DB failure (`e1766e30`, 2026-03-29)
- standardize storage bucket configuration using consistent environment variables across all services and workers (`cd430197`, 2026-03-28)
- optimize cdn-worker for cloudflare-only (`89f71356`, 2026-03-15)
- Remove SES email provider support and DKIM configuration. (`ac3f29b8`, 2026-03-15)
- replace MailHog with Mailpit in configuration and documentation (`13d54c20`, 2026-03-15)
- migrate E2E tests to supertest, enhance authentication and authorization coverage, and update Jest configuration for ESM compatibility. (`52daae11`, 2026-03-14)
- feat ( gateway ) - update gateway files (`330f3228`, 2026-03-14)
- feat ( update prompt ) - update ai-prompt (`6fb6f104`, 2026-03-14)
- Enhance E2E tests for user management and preferences (`d79d931a`, 2026-03-13)
- Add full auth service E2E coverage and align assertions (`c15c31cb`, 2026-03-13)
- remove end-to-end testing framework and related configurations (`e8f4548f`, 2026-03-11)
- apply formatting across the codebase (`5caf3952`, 2026-03-10)
- - Added @nestjs/swagger dependency to all microservices. - Configured individual Swagger documentation setup in each service's main.ts. - Enhanced API Gateway to aggregate all microservice API spec… (`2d198bcc`, 2026-03-10)
- update test infrastructure and complete integration testing setup (`a8e87cbd`, 2026-03-10)
- remove e2e test infrastructure and update dependencies (`991f62d5`, 2026-03-09)
- update build configuration and dependencies (`bf2f2ba8`, 2026-03-07)
- feat(add) - add e2e test files and its configuration files and also added e2e docker setup file for support-services. (`c2703607`, 2026-03-06)
- Remove all Kubernetes deployment configurations and GitHub automation. (`c2f12097`, 2026-03-05)
- **media** — align core logic with standards and achieve 100% test pass (`b7c5e301`, 2026-03-05)
- Standardize Jest configurations across all packages by introducing dedicated config files, a base config, and granular test scripts. (`f0f2f442`, 2026-03-04)
- refactor tests and update test documentation (`80bde71f`, 2026-03-04)
- Renamed eventType to type in outbox creation and added any type assertion for health service metric counters. (`7245afd9`, 2026-03-03)
- standardize model names in aggregation service calls and refine analytics calculations for blog comments and project revenue. (`5a0d9462`, 2026-03-03)
- Update queue service to publisher, add storage dependency, and refine audit user fields and email template body. (`099a2a86`, 2026-03-03)
- Update user ID field to /, refactor media entity fields and storage service integration, and adjust API response types. (`2e737676`, 2026-03-03)
- resolve build and type errors across services (`54218075`, 2026-03-03)
- update common library import, ensure webhook secrets default to empty string, and add type assertions for webhook log data. (`066095f0`, 2026-03-03)
- Standardize queue routing keys and exchanges, update contact status enum, and enhance contact submission with UUID-based ticket IDs and refined rate limiting. (`5784d913`, 2026-03-03)
- **messaging** — update user selection and project relation fields (`66870158`, 2026-03-03)
- **db** — migrate project-wide to UUID v7 (`eb37b0e2`, 2026-03-03)
- fix auth service build errors . (`fafc9294`, 2026-03-03)
- Remove e2e test configurations and specific e2e test files from various services. (`ee963f7a`, 2026-03-02)
- **auth-lib** — consolidate decorators and fix typescript errors (`ab689cd4`, 2026-03-02)
- fix monorepo-wide compilation and module resolution errors (`d1735639`, 2026-03-02)
- **config** — refactor environment variable management and sync test environment (`e9d4deee`, 2026-03-02)
- Update example secret and key values in Infisical configuration and remove the AI implementation prompt reference document. (`bd1395b5`, 2026-03-01)
- Standardize NestJS core dependencies across libraries and streamline Docker build configurations and image naming. (`6124f23b`, 2026-03-01)
- migrate deployment architecture to VPS-based Kubernetes and cleanup legacy infrastructure (`9e02a327`, 2026-03-01)

### Documentation

- synchronize reference documentation with implemented endpoints (`0fc94cf5`, 2026-03-08)

### Tests

- **webhook-worker** — expand e2e tests and improve setup mocks (`4e280dfb`, 2026-03-14)
- **outbox-poller** — expand e2e tests and improve setup mocks (`b182c00d`, 2026-03-14)
- **notification-worker** — expand e2e tests and improve setup mocks (`ce59cb56`, 2026-03-14)
- **media-worker** — expand e2e tests and improve setup mocks (`24981913`, 2026-03-14)
- **email-worker** — expand e2e tests and improve setup mocks (`171827d3`, 2026-03-14)
- **cdn-worker** — expand e2e tests and improve setup mocks (`2fd3b2ad`, 2026-03-14)
- **audit-worker** — expand e2e tests and improve setup mocks (`f45e4604`, 2026-03-14)
- **analytics-worker** — expand e2e tests and improve setup mocks (`bf0ec3cf`, 2026-03-14)
- **e2e** — update health service E2E tests for response structure (`e009d8f2`, 2026-03-13)
- **e2e** — refine end-to-end testing practices and configurations (`48501722`, 2026-03-13)
- **e2e** — enhance end-to-end testing setup and specifications (`c755b9b6`, 2026-03-13)
- **e2e** — add end-to-end tests for multiple services (`df7993c7`, 2026-03-12)
- implement comprehensive integration tests across all microservices and workers (`37eeaaef`, 2026-03-11)
- upgrade integration tests from smoke to functional coverage (`97e5140a`, 2026-03-10)
- **e2e** — setup comprehensive end-to-end testing framework (`2ebd66bd`, 2026-03-10)
- **gateway** — implement and complete integration testing (`2da4f4b5`, 2026-03-10)
- **webhook-worker** — implement and complete integration testing (`8c1574d7`, 2026-03-10)
- **outbox-poller** — implement and complete integration testing (`2feb835f`, 2026-03-10)
- **notification-worker** — implement and complete integration testing (`bc15317f`, 2026-03-10)
- **media-worker** — implement and complete integration testing (`254583fb`, 2026-03-10)
- **email-worker** — implement and complete integration testing (`1d08c957`, 2026-03-10)
- **cdn-worker** — implement and complete integration testing (`efc7a7d5`, 2026-03-10)
- **audit-worker** — implement and complete integration testing (`6ae7f2e0`, 2026-03-10)
- **analytics-worker** — implement and complete integration testing (`cb14a3f1`, 2026-03-10)
- **webhooks** — implement and complete integration testing (`d14b00ae`, 2026-03-10)
- **users** — implement and complete integration testing (`f1579acd`, 2026-03-10)
- **requests** — implement and complete integration testing (`0dcb709b`, 2026-03-10)
- **quotes** — implement and complete integration testing (`92b878dd`, 2026-03-10)
- **projects** — implement and complete integration testing (`5e3341a4`, 2026-03-10)
- **progress** — implement and complete integration testing (`6455ac1e`, 2026-03-10)
- **portfolio** — implement and complete integration testing (`98817f39`, 2026-03-10)
- **payments** — implement and complete integration testing (`6e3e51d2`, 2026-03-10)
- **notifications** — implement and complete integration testing (`dad0eb53`, 2026-03-10)
- **messaging** — implement and complete integration testing (`6beb15af`, 2026-03-10)
- **media** — implement and complete integration testing (`c6e07af9`, 2026-03-10)
- **health** — implement and complete integration testing (`2c92780d`, 2026-03-10)
- **contact** — implement and complete integration testing (`4ada0a17`, 2026-03-10)
- **blog** — implement and complete integration testing (`85d3d2b1`, 2026-03-10)
- **auth** — implement and complete integration testing (`93009182`, 2026-03-10)
- **admin** — implement and complete integration testing (`95b60b4c`, 2026-03-10)
- **admin, webhooks** — fix failing unit and integration tests (`e1d1c08d`, 2026-03-05)
- **blog,portfolio** — fix unit and integration test failures (`3d246b54`, 2026-03-05)
- fix notifications service unit and integration tests (`4f6038dc`, 2026-03-05)
- **payments** — fix integration test connection leaks and unit test DI errors - Mocked QueueConsumerService and OutboxPollerService in app.module.integration.spec.ts to prevent tests from hanging o… (`b4d2ca16`, 2026-03-05)
- **quotes,requests** — fix unit and integration tests (`e8ea18a5`, 2026-03-04)
- Add basic AppModule integration tests for all services and workers. (`c99194b3`, 2026-03-04)
- **integration** — fix failing integration tests across library modules (`99c24c1b`, 2026-03-02)
- **libs** — fix unit test failures and achieve 100% test coverage (`6c090bd8`, 2026-03-01)
- **services** — fix and complete all unit tests (100% pass rate) (`252f27b7`, 2026-03-01)

---

## 2026-02

_29 commits_

### Added

- populate example Turnstile and VAPID keys in infisical.example.json (`2eda4121`, 2026-02-28)
- Remove SMS notification channel, consolidate Docker Compose configurations, and introduce Infisical example for environment variables. (`0be660c6`, 2026-02-28)
- **gateway** — implement centralized http proxy system and service registry (`bb48976c`, 2026-02-27)
- **ws-gateway** — implement production-ready socket scaling and error handling (`87235844`, 2026-02-26)
- implement service layer logic and update schema definitions (`ff3b9106`, 2026-02-26)
- **database** — refactor prisma schema and re-initialize migrations (`772d5976`, 2026-02-26)
- **libs** — implement all stub libraries with production-ready code (`7a128ad5`, 2026-02-26)
- **workers** — implement CDN and Outbox Poller workers (`ddb59366`, 2026-02-23)
- implement analytics and webhook workers (`d7ff38c7`, 2026-02-23)
- **workers** — implement email and notification workers (`620500b1`, 2026-02-23)
- implement webhooks ingestion service (`c83d3034`, 2026-02-23)
- **admin** — implement admin service base structure and endpoints (`cae31559`, 2026-02-23)
- implement portfolio and blog microservices (`fc3e0704`, 2026-02-23)
- implement notifications and media microservices - scaffolded service () - implemented core notifications module with RabbitMQ integration - added preferences module for user notification sett… (`2a850493`, 2026-02-23)
- **services** — implement Progress, Payments, and Messaging microservices (`2e563bd5`, 2026-02-23)
- **api** — implement core backend microservices (`9b660f6e`, 2026-02-23)
- Centralize Prisma configuration with a new root-level `prisma.config.ts` file and add Prisma dependencies. (`0b55ce5f`, 2026-02-23)
- implement sections 7-10 — database, shared libs, API & WS gateways (`130f0b12`, 2026-02-23)
- **infra** — implement project infrastructure (sections 2-6) (`d1f983bf`, 2026-02-23)
- add initial comprehensive backend API reference documentation (`6a88cd90`, 2026-02-23)

### Changed

- Standardize TypeScript configurations, update Prisma schema with push subscriptions, and add Nodemailer to the mail library. (`e5947de2`, 2026-02-28)
- Standardize Nest CLI configurations across services, workers, and gateways by removing and adding new module configurations. (`a8434f2e`, 2026-02-28)
- ## fix(workers): resolve strict TypeScript errors and standardize dependencies (`0d61ba95`, 2026-02-26)
- **feat(workers): add audit-worker and media-worker microservices** (`0dae5791`, 2026-02-23)
- update pnpm dependencies (`e5915e4c`, 2026-02-23)
- **feat(contact): implement contact service foundation and API endpoints** (`77317805`, 2026-02-23)
- **root** — initialize monorepo setup and root configuration files (`9d54af59`, 2026-02-23)
- Initial commit (`95b931ac`, 2026-02-23)

### Documentation

- Update search module description to reflect Meilisearch integration and update dependency. (`275b46f4`, 2026-02-26)

---

