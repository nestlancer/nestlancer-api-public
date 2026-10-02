---
config:
  layout: elk
---

flowchart TB

%% ═══════════════════════════════════════════════════
%% EXTERNAL SYSTEMS
%% ═══════════════════════════════════════════════════
subgraph EXT["🌐 External Systems"]
PGW[("PostgreSQL Primary<br/>Writes + Auto-Failover<br/>(Patroni / RDS Multi-AZ)")]
PGR1[("PostgreSQL Read Replica")]
REDIS_C[("Redis — Cache<br/>(dedicated instance)")]
REDIS_P[("Redis — Pub/Sub<br/>(dedicated instance)")]
MQ[("RabbitMQ<br/>Exchanges: events · webhooks<br/>Per-queue TTL + DLQ")]
PRIVATE_STORAGE[("Private Object Storage<br/>(S3)<br/>Project Deliverables")]
PUBLIC_STORAGE[("Public Object Storage<br/>(S3)<br/>Portfolio / Blog Media")]
CDN_NODE["CDN Edge<br/>(CloudFront / Cloudflare)<br/>Cache Invalidation API"]
SMTP[("SMTP / SES")]
PAY[("Razorpay")]
THIRD["Third-Party APIs<br/>(Git, CI, etc.)"]
Secrets Manager[("Secrets Manager<br/>Secrets Manager")]
end

%% ═══════════════════════════════════════════════════
%% ENTRY LAYER
%% ═══════════════════════════════════════════════════
subgraph ENTRY["🚪 Entry Layer"]
LB["Load Balancer<br/>TLS Termination · Sticky Sessions (WS)<br/>HTTP → API_GW · WS → WS_AUTH"]
API_GW["API Gateway<br/>/v1 · /v2 Versioning<br/>Routing · Base Throttle<br/>Swagger / OpenAPI served"]
end

%% ═══════════════════════════════════════════════════
%% MIDDLEWARE PIPELINE
%% ═══════════════════════════════════════════════════
subgraph MW["🛡 Middleware Pipeline (sequential)"]
CORS["CORS Policy Enforcer"]
REQ_ID["Request Tracer<br/>Correlation ID · OpenTelemetry Span"]
MAINT["Maintenance Mode"]
FF["Feature Flags<br/>(per-request evaluation)" ]
RATE["Rate Limiter<br/>(tiered: anon · user · admin · webhook)<br/>Sliding Window via Redis"]
ROUTER["Route Resolver<br/>(conditional — exactly one path)"]
PUB_MW["Public MW<br/>(no auth required)"]
USER_MW["User MW<br/>(JWT signature + expiry verify)"]
ADMIN_MW["Admin MW<br/>(JWT + RBAC claims verify)"]
WH_MW["Webhook MW<br/>(rate limited · IP allowlist)"]
GUARDS["Permission Guards<br/>RBAC + Resource-level AuthZ"]
VALIDATE["Input Validation<br/>DTO schemas · XSS sanitize · SQL escape"]
WH_VALIDATE["Webhook Payload Validation<br/>(provider-specific schemas)"]
end

%% ═══════════════════════════════════════════════════
%% FEATURE MODULES
%% ═══════════════════════════════════════════════════
subgraph FEATURES["🧩 Feature Modules"]
AUTH["Auth<br/>(login · register · refresh · logout)"]
USERS["Users<br/>(profile · preferences)"]
PROJECTS["Projects<br/>(CRUD · status · assignment)"]
REQUESTS["Requests<br/>(client requests)"]
QUOTES["Quotes<br/>(estimates · approval)"]
PAYMENTS["Payments<br/>(checkout · verify · refund)"]
PORTFOLIO["Portfolio<br/>(public showcase)"]
MEDIA["Media<br/>(upload · manage)"]
MSG["Messaging<br/>(chat · threads)"]
NOTIF["Notifications<br/>(prefs · history · mark-read)"]
BLOG["Blog<br/>(posts · categories · tags)"]
CONTACT["Contact<br/>(form · inquiry storage)"]
PROGRESS["Progress<br/>(milestones · updates · timeline)"]
end

%% ═══════════════════════════════════════════════════
%% ADMIN DOMAIN
%% ═══════════════════════════════════════════════════
subgraph ADMIN["👨‍💼 Admin Domain"]
ADMIN_PROXY["Admin Proxy<br/>(wraps every action with audit)<br/>(implemented via interceptors)"]
ADMIN_AUDIT["Audit Trail Logger"]
ADMIN_DASH["Dashboard<br/>(stats · graphs · system status)"]
ADMIN_WH_MGMT["Webhook Management<br/>(retry · inspect · purge DLQ)"]
end

%% ═══════════════════════════════════════════════════
%% WEBHOOK INGESTION
%% ═══════════════════════════════════════════════════
subgraph WEBHOOKS["🔁 Webhook Ingestion"]
WH_ENDPOINT["Webhook Endpoint<br/>(provider-specific routes)"]
SIG_VERIFY["Signature Verifier<br/>(HMAC-SHA256 / RSA per provider)"]
WH_ENQUEUE["Enqueue → webhooks exchange"]
WH_LOG["Webhook Logger<br/>(persists event logs to Primary DB)"]
WH_DASH["Webhook Logs / Retry UI"]
end

%% ═══════════════════════════════════════════════════
%% CORE INFRASTRUCTURE
%% ═══════════════════════════════════════════════════
subgraph CORE["🧱 Core Infrastructure"]
CONFIG["Config Module<br/>(env + secrets injection)"]
DB_W["DB Write Pool<br/>(→ Primary only)"]
DB_R["DB Read Pool<br/>(→ Replica only)"]
CACHE["Cache Layer<br/>(TTL · invalidation)"]
QUEUE["Queue Publisher<br/>(confirms · retry)"]
OUTBOX["Transactional Outbox<br/>(entity + event in same TX)"]
OUTBOX_POLL["Outbox Poller<br/>(standalone deployable worker)<br/>(polls PRIMARY → publishes to MQ<br/>marks rows published<br/>at-least-once guarantee)"]
LOG["Structured Logger<br/>(JSON → log aggregator)"]
AUDIT_DIRECT["Audit Writer<br/>(direct DB insert — NO event emission)"]
METRICS["Metrics Exporter<br/>(Prometheus · Grafana dashboards)"]
TRACING["Distributed Tracing<br/>(OpenTelemetry → Jaeger)"]
HEALTH["Health + Readiness Probes<br/>(K8s compatible)"]
IDEMPOT["Idempotency Store<br/>(Redis fast-check + DB durable<br/>TTL auto-expiry)"]
ALERT["Alerting Engine<br/>(PagerDuty · Slack · email)"]
MIGRATE["DB Migrations<br/>(Prisma Migrate<br/>versioned · idempotent)"]
end

%% ═══════════════════════════════════════════════════
%% ASYNC WORKERS
%% ═══════════════════════════════════════════════════
subgraph WORKERS["⚙️ Async Workers<br/>(all consume from RabbitMQ<br/>graceful shutdown · prefetch limits)"]
EMAIL_W["Email Worker<br/>(exponential backoff · 5 retries)"]
NOTIF_W["Notification Worker<br/>(push via VAPID · in-app · Redis Pub/Sub fan-out)"]
AUDIT_W["Audit Persistence Worker<br/>(batch insert)"]
MEDIA_W["Media Processing Worker<br/>(thumbnails · transcoding · metadata)"]
PORTFOLIO_W["Portfolio Sync Worker<br/>(Syncs private media to public bucket)"]
ANALYTICS_W["Analytics Batch Worker<br/>(aggregate · report)"]
WH_WORKER["Webhook Processor<br/>(idempotent · provider-specific handlers)"]
CDN_W["CDN Invalidation Worker<br/>(batch path invalidation)"]
end

%% ═══════════════════════════════════════════════════
%% REALTIME LAYER
%% ═══════════════════════════════════════════════════
subgraph WS["🔌 Realtime Layer"]
WS_AUTH["WS Handshake Auth<br/>(JWT verify on upgrade request)"]
WS_SRV["WebSocket Server<br/>(rooms · presence · heartbeat)"]
end

%% ═══════════════════════════════════════════════════
%% DLQ
%% ═══════════════════════════════════════════════════
DLQ[("Dead Letter Queue<br/>(persisted · TTL · admin visible)")]

%% ═══════════════════════════════════════════════════════════
%% F L O W S
%% ═══════════════════════════════════════════════════════════

%% ═════════════════════════════════════════════════
%% FLOW 1 — Entry Pipeline
%% ═════════════════════════════════════════════════
LB -->|"HTTP"| API_GW
LB -->|"WS upgrade"| WS_AUTH
API_GW --> CORS --> REQ_ID --> MAINT --> FF --> RATE --> ROUTER

%% ═════════════════════════════════════════════════
%% FLOW 2 — External Events Enter via API Gateway
%% ═════════════════════════════════════════════════
PAY -- "payment event" --> API_GW
THIRD -- "provider event" --> API_GW

%% ═════════════════════════════════════════════════
%% FLOW 3 — Route Resolution
%% (exactly ONE path per request)
%% ═════════════════════════════════════════════════
ROUTER -->|"anonymous"| PUB*MW
ROUTER -->|"user JWT"| USER_MW
ROUTER -->|"admin JWT"| ADMIN_MW
ROUTER -->|"/webhooks/*"| WH*MW
ROUTER -->|"/ws/*"| WS_AUTH

%% ═════════════════════════════════════════════════
%% FLOW 4 — MW → Guards → Validation → Modules
%% ═════════════════════════════════════════════════
PUB_MW --> GUARDS
USER_MW --> GUARDS
ADMIN_MW --> GUARDS
GUARDS --> VALIDATE

%% Public routes (read-heavy, no auth)
VALIDATE -->|"public"| AUTH & PORTFOLIO & BLOG & CONTACT

%% User routes (authenticated)
VALIDATE -->|"user"| USERS & PROJECTS & REQUESTS & QUOTES & PAYMENTS & MEDIA & MSG & NOTIF & PROGRESS

%% Admin routes (all audited via proxy)
VALIDATE -->|"admin"| ADMIN_PROXY

%% ═════════════════════════════════════════════════
%% FLOW 5 — Webhook Path
%% (validated + signature verified)
%% ═════════════════════════════════════════════════
WH_MW --> WH_VALIDATE --> WH_ENDPOINT
WH_ENDPOINT --> SIG_VERIFY
SIG_VERIFY -->|"✅ valid"| WH_LOG & WH_ENQUEUE
WH_LOG --> DB_W
WH_ENQUEUE --> MQ
SIG_VERIFY -->|"❌ invalid → log"| WH_DASH
SIG_VERIFY -->|"❌ invalid → alert"| ALERT

%% ═════════════════════════════════════════════════
%% FLOW 6 — Admin Proxy → Audit → ALL Modules
%% (every admin action is audit-logged)
%% ═════════════════════════════════════════════════
ADMIN_PROXY --> ADMIN_AUDIT
ADMIN_AUDIT --> AUDIT_DIRECT
ADMIN_PROXY --> USERS & PROJECTS & PAYMENTS & MEDIA & BLOG
ADMIN_PROXY --> REQUESTS & QUOTES & NOTIF & PROGRESS
ADMIN_PROXY --> MSG & CONTACT & PORTFOLIO
ADMIN_PROXY --> ADMIN_DASH
ADMIN_PROXY --> ADMIN_WH_MGMT

%% ═════════════════════════════════════════════════
%% FLOW 7 — Admin Dashboard Reads
%% ═════════════════════════════════════════════════
ADMIN_DASH --> DB_R & CACHE

%% ═════════════════════════════════════════════════
%% FLOW 8 — DLQ → Admin Visibility + Retry
%% ═════════════════════════════════════════════════
DLQ --> ADMIN_WH_MGMT
ADMIN_WH_MGMT --> WH_DASH
ADMIN_WH_MGMT -->|"retry / re-enqueue"| MQ
ADMIN_WH_MGMT --> LOG & METRICS

%% ═════════════════════════════════════════════════
%% FLOW 9 — RabbitMQ → Workers (topic routing)
%% ═════════════════════════════════════════════════
MQ -->|"routing: webhook._"| WH_WORKER
MQ -->|"routing: email._"| EMAIL*W
MQ -->|"routing: notification.*"| NOTIF*W
MQ -->|"routing: audit.*"| AUDIT*W
MQ -->|"routing: media.*"| MEDIA*W
MQ -->|"routing: portfolio.*"| PORTFOLIO*W
MQ -->|"routing: analytics.*"| ANALYTICS*W
ANALYTICS_W -->|"writes materialized views"| DB_W
MQ -->|"routing: cdn.*"| CDN_W
MQ -->|"max retries exceeded"| DLQ

%% ═════════════════════════════════════════════════
%% FLOW 10 — Worker Processing
%% ═════════════════════════════════════════════════
WH_WORKER --> IDEMPOT
WH_WORKER --> DB_W & LOG

EMAIL_W -->|"⚡ circuit breaker"| SMTP
EMAIL_W -->|"on failure → requeue with backoff"| MQ

NOTIF_W --> REDIS_P
NOTIF_W --> DB_W

AUDIT_W --> AUDIT_DIRECT

MEDIA_W -->|"⚡ circuit breaker"| PRIVATE_STORAGE
MEDIA_W --> DB_W
MEDIA_W -->|"emit cdn.invalidate"| MQ

PORTFOLIO_W -->|"DB Read"| DB_R
PORTFOLIO_W -->|"Copy cross-bucket"| PRIVATE_STORAGE
PORTFOLIO_W -->|"Write to public"| PUBLIC_STORAGE

CDN_W -->|"⚡ circuit breaker"| CDN_NODE

ANALYTICS_W --> DB_W & CACHE

%% ═════════════════════════════════════════════════
%% FLOW 11 — Transactional Outbox Pattern
%% (reads + writes PRIMARY — no replica)
%% ═════════════════════════════════════════════════
OUTBOX --> DB_W
OUTBOX_POLL -->|"poll + mark published"| DB_W
OUTBOX_POLL -->|"publish events"| MQ

%% ═════════════════════════════════════════════════
%% FLOW 12 — CDN Content Delivery (origin pull)
%% (CDN only pulls from public storage)
%% ═════════════════════════════════════════════════
PUBLIC_STORAGE -->|"origin pull"| CDN_NODE

CORE["🧱 Core Infrastructure"]
CONFIG["Config Module<br/>(env + secrets injection)"]
CONFIG --> CORS & MAINT & FF & RATE

%% ═════════════════════════════════════════════════
%% CORE WIRING — DB Pools → PostgreSQL
%% ═════════════════════════════════════════════════
DB_W --> PGW
DB_R --> PGR1
MIGRATE --> PGW

%% ═════════════════════════════════════════════════
%% CORE WIRING — Cache + Queue → External
%% ═════════════════════════════════════════════════
CACHE --> REDIS_C
QUEUE --> MQ

%% ═════════════════════════════════════════════════
%% CORE WIRING — Rate Limiter → Redis (shared state)
%% ═════════════════════════════════════════════════
RATE --> REDIS_C

%% ═════════════════════════════════════════════════
%% CORE WIRING — Idempotency → Redis + DB (durable)
%% ═════════════════════════════════════════════════
IDEMPOT --> REDIS_C
IDEMPOT --> DB_W

%% ═════════════════════════════════════════════════
%% CORE WIRING — Health + Observability
%% ═════════════════════════════════════════════════
HEALTH --> PGW & PGR1 & REDIS_C & REDIS_P & MQ & SMTP
METRICS --> HEALTH & LOG
ALERT --> METRICS

%% ═════════════════════════════════════════════════
%% FEATURES → INFRA — Read/Write Split + Outbox
%% ═════════════════════════════════════════════════
AUTH --> DB_W & DB_R & CACHE & OUTBOX
USERS --> DB_W & DB_R & CACHE & OUTBOX
PROJECTS --> DB_W & DB_R & CACHE & OUTBOX
REQUESTS --> DB_W & DB_R & CACHE & OUTBOX
QUOTES --> DB_W & DB_R & CACHE & OUTBOX
PORTFOLIO --> DB_W & DB_R & CACHE & OUTBOX
BLOG --> DB_W & DB_R & CACHE & OUTBOX
CONTACT --> DB_W & DB_R & CACHE & OUTBOX
NOTIF --> DB_W & DB_R & CACHE & OUTBOX
PROGRESS --> DB_W & DB_R & CACHE & OUTBOX

%% ═════════════════════════════════════════════════
%% PAYMENTS — Circuit Breaker + Idempotency
%% ═════════════════════════════════════════════════
PAYMENTS -->|"⚡ circuit breaker"| PAY
PAYMENTS --> DB_W & DB_R & CACHE & OUTBOX & IDEMPOT

%% ═════════════════════════════════════════════════
%% MEDIA — Circuit Breaker + Outbox
%% ═════════════════════════════════════════════════
MEDIA -->|"⚡ circuit breaker"| PRIVATE_STORAGE
MEDIA --> DB_W & DB_R & CACHE & OUTBOX

%% ═════════════════════════════════════════════════
%% MESSAGING — Realtime via Redis Pub/Sub fan-out
%% ═════════════════════════════════════════════════
MSG --> DB_W & DB_R & CACHE & OUTBOX & REDIS_P

%% ═════════════════════════════════════════════════
%% PROJECTS — Third-Party with Circuit Breaker
%% ═════════════════════════════════════════════════
PROJECTS -->|"⚡ circuit breaker"| THIRD

%% ═════════════════════════════════════════════════
%% WEBSOCKET — Auth Handshake + Pub/Sub Fan-Out
%% ═════════════════════════════════════════════════
WS_AUTH -->|"JWT verify on upgrade"| WS_SRV
WS_SRV -->|"publish presence · typing"| REDIS_P
REDIS_P -->|"fan-out to all instances"| WS_SRV

%% ═════════════════════════════════════════════════
%% OBSERVABILITY — Cross-Cutting (all layers)
%% ═════════════════════════════════════════════════
FEATURES --> LOG & METRICS & TRACING
ADMIN --> LOG & METRICS & TRACING
WORKERS --> LOG & METRICS & TRACING

%% ═════════════════════════════════════════════════
%% AUDIT WRITER — Direct DB (NO feedback loop)
%% ═════════════════════════════════════════════════
AUDIT_DIRECT --> DB_W

%% ═════════════════════════════════════════════════
%% UTILITY LIBRARIES — Cross-Cutting
%% (used by Feature Modules + Workers as needed)
%% ═════════════════════════════════════════════════
subgraph UTILS["🔧 Utility Libraries"]
PDF_LIB["PDF Generator<br/>(quotes · invoices · receipts)"]
SEARCH_LIB["Search & Filter Builder"]
CRYPTO_LIB["Crypto<br/>(hashing · encryption · HMAC · TOTP)"]
TURNSTILE_LIB["Turnstile Guard<br/>(Cloudflare Turnstile)"]
MAIL_LIB["Mail Provider<br/>(SES · SMTP · SendGrid)"]
STORAGE_LIB["Storage Provider<br/>(S3 · Cloudinary · Local)"]
CB_LIB["Circuit Breaker"]
end

%% Utility Library Wiring
QUOTES --> PDF_LIB
PAYMENTS --> PDF_LIB
AUTH --> CRYPTO_LIB & TURNSTILE_LIB
CONTACT --> TURNSTILE_LIB
EMAIL_W --> MAIL_LIB
MEDIA --> STORAGE_LIB
MEDIA_W --> STORAGE_LIB
PAYMENTS --> CB_LIB
MEDIA --> CB_LIB
PROJECTS --> CB_LIB
EMAIL_W --> CB_LIB
MEDIA_W --> CB_LIB
CDN_W --> CB_LIB
