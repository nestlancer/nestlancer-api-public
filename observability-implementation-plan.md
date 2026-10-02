# Observability Implementation Plan — Nestlancer Backend API

| Field                        | Value                                                      |
| ---------------------------- | ---------------------------------------------------------- |
| **Version**                  | 2.0                                                        |
| **Status**                   | Approved for implementation                                |
| **Last updated**             | July 2026                                                  |
| **Source gap analysis**      | [`observation-report.md`](./observation-report.md)         |
| **Reference implementation** | `demo-api/` (proven pipeline; not deployed to production)  |
| **Scope**                    | App VPS only — this repository (`nestlancer-backend-api/`) |

---

## Table of Contents

1. [Problem Statement & Goals](#1-problem-statement--goals)
2. [Scope & Boundaries](#2-scope--boundaries)
3. [Architecture Overview](#3-architecture-overview)
4. [Current State Summary](#4-current-state-summary)
5. [Design Decisions](#5-design-decisions)
6. [Success Criteria](#6-success-criteria)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Work Packages (Detailed)](#8-work-packages-detailed)
9. [Per-Workload Checklist](#9-per-workload-checklist)
10. [File Change Inventory](#10-file-change-inventory)
11. [Configuration Reference](#11-configuration-reference)
12. [Verification & Quality Gates](#12-verification--quality-gates)
13. [Rollout Strategy](#13-rollout-strategy)
14. [Risks, Dependencies & Open Items](#14-risks-dependencies--open-items)
15. [Appendices](#15-appendices)

---

## 1. Problem Statement & Goals

### 1.1 Problem

The Nestlancer backend is **functionally complete but operationally blind**. Libraries for logging, metrics, and tracing exist (`@nestlancer/logger`, `@nestlancer/metrics`, `@nestlancer/tracing`), but the **export pipeline is missing**:

| Signal      | Emits today?                                    | Reaches Grafana/Loki/Jaeger?          |
| ----------- | ----------------------------------------------- | ------------------------------------- |
| **Logs**    | Yes — JSON to stdout                            | **No** — no Promtail sidecar          |
| **Metrics** | Partial — workers only; HTTP collectors unwired | **No** — no `/metrics` endpoint       |
| **Traces**  | Correlation IDs only                            | **No** — no OpenTelemetry OTLP export |

Prometheus, Loki, and Jaeger run on a separate **Infra VPS** and are already deployed. They have nothing useful to collect from the real backend today. The `demo-api/` stack proves the pipeline works; the main backend lacks the operational glue.

**Root cause (from [`observation-report.md`](./observation-report.md)):**

1. Metrics are collected in code but never exposed or scraped.
2. No Promtail → no centralized logs for `nl-*` containers.
3. No distributed tracing export — Jaeger UI stays empty.
4. Compose/K8s publish app ports only — no metrics port scheme.
5. No verification tooling or infra handoff docs for the real stack.

### 1.2 Goals

| #   | Goal            | Measurable outcome                                                                                     |
| --- | --------------- | ------------------------------------------------------------------------------------------------------ |
| G1  | **Metrics**     | All 28 workloads expose `GET /metrics` on port `9464`; Infra Prometheus scrapes via Tailscale          |
| G2  | **Logs**        | Promtail ships `nl-*` container logs to Infra Loki; Grafana queries `{container=~"nl-.*"}` return data |
| G3  | **Traces**      | OpenTelemetry exports spans to Infra Jaeger; cross-service requests visible in Jaeger UI               |
| G4  | **Operability** | `scripts/verify-monitoring.sh` passes after deploy; operator runbook exists                            |
| G5  | **Consistency** | Metric names, env vars, and bootstrap patterns unified across all workloads                            |

### 1.3 Non-Goals

- Installing or configuring Prometheus, Loki, Grafana, Jaeger, or Alertmanager on the Infra VPS
- Building new Grafana dashboards (infra team; dashboards already expect `nestlancer_*` metric names)
- Replacing Infisical for secret management
- Refactoring business logic unrelated to observability

---

## 2. Scope & Boundaries

### 2.1 In Scope (App VPS — this repo)

| Area          | Deliverable                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Metrics       | Dedicated `/metrics` HTTP server per workload; host port publishing; HTTP request counters wired |
| Logs          | Promtail sidecar; `config/promtail.yml`; Docker log rotation; logger enrichment                  |
| Traces        | OpenTelemetry NodeSDK bootstrap; OTLP export; correlation ID ↔ trace ID bridge                   |
| Infra handoff | `config/app-metrics-targets.example.env`, scrape/alert templates for Infra team                  |
| Tooling       | `generate-app-metrics-targets.sh`, `verify-monitoring.sh`, `pnpm verify:monitoring`              |
| K8s           | Metrics ports, worker Services, missing worker manifests                                         |

### 2.2 Out of Scope (Infra VPS)

| Tool         | Port               | Infra team owns                                                 |
| ------------ | ------------------ | --------------------------------------------------------------- |
| Prometheus   | `:9090`            | Scrape config using `APP_METRICS_TARGETS`                       |
| Loki         | `:3100`            | Receives pushes from app Promtail                               |
| Jaeger       | `:4318` / `:16686` | Receives OTLP traces                                            |
| Grafana      | `:3000`            | Dashboards (already reference `nestlancer_http_requests_total`) |
| Alertmanager | `:9093`            | Alert rules from handoff YAML                                   |

### 2.3 Hard Prerequisite

**Tailscale connectivity** between Infra VPS and App VPS. Prometheus must scrape the **App VPS Tailscale IP**, not Docker bridge IPs like `172.22.0.1` (known failure mode from demo-api).

---

## 3. Architecture Overview

### 3.1 Workload Inventory

| Layer              | Count  | App ports | Metrics host ports |
| ------------------ | ------ | --------- | ------------------ |
| API Gateway        | 1      | 3000      | 13000              |
| WS Gateway         | 1      | 3100      | 13100              |
| HTTP Microservices | 16     | 3001–3016 | 14001–14016        |
| Background Workers | 10     | —         | 15001–15010        |
| **Total**          | **28** |           |                    |

Container naming: `nl-gateway`, `nl-ws-gateway`, `nl-svc-*`, `nl-worker-*`.

### 3.2 Target Signal Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  App VPS (this repo)                                                        │
│                                                                             │
│  nl-gateway ──┬── :3000 API                                                 │
│               └── :9464 /metrics ──host──► :13000 ──────────────┐           │
│  nl-svc-*  ───┬── :300x API                                     │           │
│               └── :9464 /metrics ──host──► :1400x ──────────────┤ Tailscale │
│  nl-worker-* ─── :9464 /metrics ──host──► :1500x ──────────────┤ scrape    │
│                                                                 │           │
│  stdout (JSON) ──► Docker json-file ──► nl-promtail ──────────┼──► Loki   │
│  OTel SDK ──OTLP HTTP ──────────────────────────────────────────┼──► Jaeger │
└─────────────────────────────────────────────────────────────────┼───────────┘
                                                                  ▼
                                                    ┌─────────────────────────┐
                                                    │  Infra VPS (out of scope)│
                                                    │  Prometheus · Loki ·     │
                                                    │  Jaeger · Grafana        │
                                                    └─────────────────────────┘
```

### 3.3 Shared Libraries (today)

| Library               | Path            | Current capability                       | Target                                                |
| --------------------- | --------------- | ---------------------------------------- | ----------------------------------------------------- |
| `@nestlancer/logger`  | `libs/logger/`  | JSON stdout; gateway access logs         | + `correlationId`, `traceId`, `service` in every line |
| `@nestlancer/metrics` | `libs/metrics/` | prom-client registry; unwired collectors | + metrics server; global `MetricsInterceptor`         |
| `@nestlancer/tracing` | `libs/tracing/` | Correlation ID middleware only           | + OpenTelemetry SDK + OTLP export                     |
| `@nestlancer/config`  | `libs/config/`  | Partial env support                      | + `observability.schema.ts`                           |

### 3.4 Request Flow (for trace context)

```
Client → Gateway (:3000) → Microservice (:3001–3016) → PostgreSQL / Redis
                              ↓
                         Outbox → Outbox Poller → RabbitMQ → Workers
WebSocket: Client → WS Gateway (:3100) → internal service calls
```

---

## 4. Current State Summary

> Full gap analysis: [`observation-report.md`](./observation-report.md)

### 4.1 Critical Gaps (P0)

| Gap                                                 | Impact                                                                |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| No `/metrics` HTTP endpoint                         | Prometheus cannot scrape; Grafana Application Metrics dashboard empty |
| `MetricsInterceptor` never registered               | HTTP request counters never increment                                 |
| `HttpMetricsCollector.recordRequest()` never called | Duplicate dead instrumentation                                        |
| No Promtail sidecar                                 | Logs stay on App VPS disk                                             |
| No OpenTelemetry SDK                                | Jaeger shows no traces                                                |

### 4.2 High Gaps (P1)

| Gap                                                                       | Impact                                                |
| ------------------------------------------------------------------------- | ----------------------------------------------------- |
| No metrics host ports in compose/K8s                                      | Infra cannot reach metrics even after endpoint exists |
| No `APP_METRICS_TARGETS` generator                                        | Manual, error-prone Prometheus config                 |
| No `verify-monitoring.sh`                                                 | No post-deploy confidence check                       |
| K8s: no worker Service YAMLs; missing `document-worker` + `export-worker` | Workers unscrapeable in K3s                           |

### 4.3 Module Coverage Gaps

| Workload            | Missing module                   |
| ------------------- | -------------------------------- |
| `messaging`         | `MetricsModule`, `TracingModule` |
| `ws-gateway`        | `MetricsModule`                  |
| `blog`, `portfolio` | `TracingModule`                  |

### 4.4 What Already Works (do not rebuild)

- `LoggerModule.forRoot()` — 28/28 workloads
- JSON log format via `NestlancerLoggerService`
- `MetricsModule` — 24/28 (worker business metrics in notification, outbox, audit, webhook)
- `TracingModule` + `CorrelationIdMiddleware` — partial (7/18 HTTP services in `main.ts`)
- `smoke-health.sh` — health endpoints only

---

## 5. Design Decisions

| ID  | Decision                                                | Rationale                                          | Alternative rejected         |
| --- | ------------------------------------------------------- | -------------------------------------------------- | ---------------------------- |
| D1  | Dedicated metrics server on `:9464` per container       | Security isolation; works for workers without HTTP | Nest controller on app port  |
| D2  | Metric prefix `nestlancer_` for HTTP metrics            | Matches existing Grafana dashboards                | Keep `http_requests_total`   |
| D3  | `MetricsInterceptor` as global `APP_INTERCEPTOR`        | Single source of truth for HTTP metrics            | Dual collector + interceptor |
| D4  | OTel bootstrap **before** `NestFactory.create()`        | Required for auto-instrumentation                  | Post-init SDK start          |
| D5  | Single Promtail sidecar reading `docker.sock`           | Proven in demo-api; one agent per host             | Per-container log forwarder  |
| D6  | Port scheme `13000 / 13100 / 14001–14016 / 15001–15010` | Matches demo-api; documented infra contract        | Dynamic port allocation      |
| D7  | `JAEGER_OTLP_URL` replaces unused `JAEGER_URL`          | Config accuracy                                    | Keep dead config key         |
| D8  | Infra handoff YAML in `config/`                         | Version-controlled contract with infra team        | External wiki only           |

### 5.1 Metrics Port Scheme

| Workload                    | Container port | Host port   |
| --------------------------- | -------------- | ----------- |
| Gateway                     | 9464           | 13000       |
| WS Gateway                  | 9464           | 13100       |
| auth … health (3001–3016)   | 9464           | 14001–14016 |
| analytics … webhook workers | 9464           | 15001–15010 |

Worker host ports (alphabetical):

| Worker    | Port  | Worker       | Port  |
| --------- | ----- | ------------ | ----- |
| analytics | 15001 | media        | 15007 |
| audit     | 15002 | notification | 15008 |
| cdn       | 15003 | outbox       | 15009 |
| document  | 15004 | webhook      | 15010 |
| email     | 15005 |              |       |
| export    | 15006 |              |       |

### 5.2 Metric Naming

| Current                                | Target                                             |
| -------------------------------------- | -------------------------------------------------- |
| `http_requests_total` (collector)      | `nestlancer_http_requests_total`                   |
| `http_request_duration_seconds`        | `nestlancer_http_request_duration_seconds`         |
| Worker metrics (`outbox_*`, `audit.*`) | Keep as-is in Phase 1; document in Grafana runbook |

### 5.3 Tracing Packages (`libs/tracing`)

```
@opentelemetry/sdk-node
@opentelemetry/auto-instrumentations-node
@opentelemetry/exporter-trace-otlp-http
@opentelemetry/resources
@opentelemetry/semantic-conventions
```

Pattern: adapt `demo-api/src/tracing.ts` — dynamic imports, `fs` instrumentation disabled, graceful shutdown.

---

## 6. Success Criteria

### 6.1 Definition of Done (program level)

- [ ] All 28 workloads respond `200` on `GET /metrics` with Prometheus text format
- [ ] `nestlancer_http_requests_total` increments on gateway traffic
- [ ] Loki returns logs for `{container=~"nl-gateway"}` within 5 minutes of traffic
- [ ] Jaeger shows a trace spanning gateway → auth (or similar) when `TRACING_ENABLED=true`
- [ ] `pnpm verify:monitoring` exits 0 against dev compose stack
- [ ] `docs/observability.md` operator runbook published
- [ ] Infra team has `APP_METRICS_TARGETS` with correct App VPS Tailscale IP

### 6.2 Per-Phase Exit Criteria

| Phase                | Exit criteria                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| **P1 Metrics**       | `curl localhost:13000/metrics` returns `nodejs_*` + `nestlancer_*`; interceptor records failed requests |
| **P2 Compose ports** | All 28 host metrics ports reachable locally; `generate-app-metrics-targets.sh` outputs valid env        |
| **P3 Logs**          | `nl-promtail` running; Loki query returns JSON logs with `level`, `message`, `timestamp`                |
| **P4 Traces**        | Jaeger UI shows `nl-gateway` service; `traceId` appears in log JSON                                     |
| **P5 Tooling**       | `verify-monitoring.sh` checks metrics, Loki, Prometheus targets, trace config                           |
| **P6 K8s**           | ServiceMonitor or documented scrape config for all workloads including workers                          |

---

## 7. Implementation Roadmap

### 7.1 Sprint Plan (estimated 4 sprints)

```
Sprint 1 ──► Metrics foundation (critical path)
Sprint 2 ──► Compose ports + log shipping
Sprint 3 ──► Distributed tracing + logger enrichment
Sprint 4 ──► K8s, tooling, standardization
```

| Sprint | Focus                                                        | Effort   | Dependencies                   |
| ------ | ------------------------------------------------------------ | -------- | ------------------------------ |
| **S1** | Metrics server, interceptor wiring, module gaps, unit tests  | 5–8 days | Infra Tailscale IP confirmed   |
| **S2** | Compose metrics ports, Promtail, log rotation, config schema | 3–5 days | S1 merged                      |
| **S3** | OTel bootstrap, correlation bridge, all `main.ts` tracing    | 5–8 days | S1 (metrics server for verify) |
| **S4** | K8s manifests, verify scripts, bootstrap DRY, docs           | 5–8 days | S1–S3                          |

### 7.2 Critical Path

```
Prerequisites (0.5d)
    → WP-1 Metrics server + HTTP wiring     ← BLOCKS EVERYTHING ELSE
    → WP-4 Compose metrics ports            ← unblocks Infra Prometheus
    → WP-5 Target generator script
    → WP-2 Promtail + log rotation
    → WP-3 OpenTelemetry + correlation bridge
    → WP-6 K8s manifests
    → WP-7 Verification + CI
    → WP-8 Standardization (can run incrementally)
```

### 7.3 MVP vs Full Delivery

| Milestone              | Includes                                            | Unblocks                           |
| ---------------------- | --------------------------------------------------- | ---------------------------------- |
| **MVP (end of S1+S2)** | Metrics exposed + scraped; logs in Loki             | Grafana dashboards, basic alerts   |
| **Full (end of S4)**   | Traces in Jaeger; K8s ready; verify script; runbook | Production rollout, SLO monitoring |

---

## 8. Work Packages (Detailed)

### WP-0 — Prerequisites (0.5 day)

| Task                                                                                | Owner       | Status |
| ----------------------------------------------------------------------------------- | ----------- | ------ |
| Confirm Infra VPS endpoints: Loki push URL, Jaeger OTLP URL, Prometheus scrape path | Ops + Infra | ☐      |
| Verify App VPS Tailscale IP (not `172.22.0.1`)                                      | Ops         | ☐      |
| Add observability env vars to Infisical `dev` / `prod`                              | Platform    | ☐      |
| Create branch `feat/observability-pipeline`                                         | Engineering | ☐      |

---

### WP-1 — Metrics Exposure & HTTP Wiring (P0 — Sprint 1)

**Reference:** `demo-api/src/metrics-server.ts`

#### 1.1 Shared metrics server (`libs/metrics`)

Create `libs/metrics/src/metrics-server.ts`:

```typescript
export function startMetricsServer(
  metricsService: MetricsService,
  options?: { port?: number; bindHost?: string },
): http.Server | null;
```

- `GET /metrics` → `metricsService.getMetrics()` with `Content-Type: text/plain; version=0.0.4`
- Respect `METRICS_ENABLED !== 'false'`
- Bind to `METRICS_BIND_HOST` (default `0.0.0.0`)

Create `libs/metrics/src/bootstrap.ts`:

```typescript
export function bootstrapMetrics(app: INestApplication): void;
```

- HTTP apps: call after `app.listen()`
- Workers: call after `app.init()`

Export both from `libs/metrics/src/index.ts`.

#### 1.2 Wire all 28 `main.ts` files

| Pattern                                  | When                             |
| ---------------------------------------- | -------------------------------- |
| `bootstrapMetrics(app)` after `listen()` | Gateway, WS gateway, 16 services |
| `bootstrapMetrics(app)` after `init()`   | 10 workers                       |

#### 1.3 HTTP metrics collection

- Add `MetricsModule.forRoot()` registering `{ provide: APP_INTERCEPTOR, useClass: MetricsInterceptor }`
- Fix `MetricsInterceptor`:
  - Record metrics on error paths (`catchError` + `finalize`)
  - Labels: `method`, `status` (match Grafana queries)
  - Optional `route` label with path normalization (`/users/:id` not `/users/123`)
- Deprecate `HttpMetricsCollector` for HTTP (single source: interceptor)
- Gateway: ensure proxy routes counted (middleware fallback if interceptors miss proxied traffic)

#### 1.4 Close module gaps

- [ ] `services/messaging/src/app.module.ts` — add `MetricsModule`, `TracingModule`
- [ ] `ws-gateway/src/app.module.ts` — add `MetricsModule`

#### 1.5 Unit tests

- [ ] `libs/metrics/tests/unit/metrics-server.spec.ts`
- [ ] `libs/metrics/tests/unit/bootstrap.spec.ts`
- [ ] Extend `metrics.interceptor.spec.ts` for error paths

**Acceptance:** `curl localhost:9464/metrics` (or mapped host port after WP-4) returns Prometheus text with `nodejs_` default metrics and worker business metrics where applicable.

---

### WP-2 — Log Shipping (P1 — Sprint 2)

**Reference:** `demo-api/config/promtail.yml`, `demo-api/docker-compose.dev.yml`

#### 2.1 Create `config/` directory and Promtail config

`config/promtail.yml`:

- Docker SD via `/var/run/docker.sock`
- Filter: container name `nl-.*` (exclude `nl-demo-.*`)
- Labels: `container`, `service`, `env`
- Push to `${LOKI_PUSH_URL}` with optional basic auth

`config/promtail-snippet.example.yml` — bare-metal reference.

#### 2.2 Docker Compose updates

Files: `docker-compose.dev.yml`, `docker-compose.prod.yml`

- Add `nl-promtail` service (`grafana/promtail:latest`)
- Add to `x-dev-service` template:

```yaml
logging:
  driver: json-file
  options:
    max-size: '10m'
    max-file: '3'
```

#### 2.3 Logger enrichment (`libs/logger`)

- Add `service`, `correlationId`, `traceId`, `spanId` to JSON output
- Honor `LOG_LEVEL` for all levels (not just `debug`)
- Standardize `app.useLogger(app.get(NestlancerLoggerService))` in all 28 `main.ts`

#### 2.4 Config schema

Create `libs/config/src/schemas/observability.schema.ts`:

| Env var                           | Getter                                |
| --------------------------------- | ------------------------------------- |
| `JAEGER_OTLP_URL`                 | `jaegerOtlpUrl`                       |
| `LOKI_PUSH_URL`                   | `lokiPushUrl`                         |
| `LOKI_USERNAME` / `LOKI_PASSWORD` | `lokiUsername`, `lokiPassword`        |
| `METRICS_BIND_HOST`               | `metricsBindHost`                     |
| `OTEL_SERVICE_NAME`               | (via existing optional getter or new) |

**Acceptance:** `docker logs nl-promtail` shows successful pushes; Grafana Loki query `{container="nl-gateway"}` returns recent JSON logs.

---

### WP-3 — Distributed Tracing (P1 — Sprint 3)

**Reference:** `demo-api/src/tracing.ts`

#### 3.1 OpenTelemetry bootstrap

Create `libs/tracing/src/otel-bootstrap.ts`:

```typescript
export async function initTracing(serviceName: string): Promise<void>;
export async function shutdownTracing(): Promise<void>;
```

- No-op when `TRACING_ENABLED !== 'true'`
- OTLP HTTP exporter to `JAEGER_OTLP_URL` or `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
- `service.name` = per-workload `OTEL_SERVICE_NAME`

#### 3.2 Integrate in all `main.ts` (first lines, before `NestFactory.create`)

```typescript
import { initTracing } from '@nestlancer/tracing';
await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-gateway');
```

#### 3.3 Correlation ↔ trace bridge

- `CorrelationIdMiddleware`: wrap in `TracingService.run()`; propagate `traceparent`
- Register correlation middleware in all HTTP services missing it (9 services + ws-gateway)
- WS gateway: trace ID on Socket.IO handshake and message handlers

#### 3.4 Close tracing module gaps

- [ ] `services/messaging`, `blog`, `portfolio` — add `TracingModule.forRoot()`

#### 3.5 Documentation

- Update `docs/components/libs/tracing.md` to match implementation
- Deprecate `JAEGER_URL` in favor of `JAEGER_OTLP_URL`

**Acceptance:** Jaeger shows `nl-gateway` → `nl-svc-auth` trace; logs contain `traceId`.

---

### WP-4 — Infrastructure & Port Publishing (P1 — Sprint 2)

#### 4.1 Docker Compose metrics ports

For each of 28 workloads, add:

```yaml
ports:
  - '${GATEWAY_PORT:-3000}:3000'
  - '${GATEWAY_METRICS_HOST_PORT:-13000}:9464'
environment:
  METRICS_PORT: '9464'
  OTEL_SERVICE_NAME: 'nl-gateway'
  METRICS_BIND_HOST: '${METRICS_BIND_HOST:-0.0.0.0}'
```

Apply port scheme from §5.1.

#### 4.2 Kubernetes (`deploy/k3s/base/workloads/`)

| Task                                  | Detail                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Add container port `9464` (`metrics`) | All 26 existing Deployments                                                 |
| Add port 9464 to Service YAMLs        | All HTTP service Services                                                   |
| Create worker Service YAMLs ×10       | ClusterIP exposing `:9464`                                                  |
| Create missing deployments            | `worker-document`, `worker-export`                                          |
| ServiceMonitor or PodMonitor          | If Prometheus Operator installed                                            |
| ConfigMap env                         | `OTEL_SERVICE_NAME`, `METRICS_PORT`, `TRACING_ENABLED`, `METRICS_BIND_HOST` |

#### 4.3 Infra handoff docs (in repo, deployed on Infra VPS by infra team)

- `config/app-metrics-targets.example.env`
- `config/prometheus-scrape.example.yml`
- `config/alertmanager-rules.example.yml` — e.g. `up{job="nestlancer"} == 0`

**Acceptance:** Infra Prometheus shows all 28 targets `up` using App VPS Tailscale IP.

---

### WP-5 — Tooling & Verification (P1 — Sprint 4)

**Reference:** `demo-api/scripts/verify-monitoring.sh`, `demo-api/scripts/generate-app-metrics-targets.sh`

#### 5.1 `scripts/generate-app-metrics-targets.sh`

- Detect Tailscale IP (`tailscale ip -4` or env override)
- Output `APP_METRICS_TARGETS` for 28 workloads (ports 13000, 13100, 14001–14016, 15001–15010)
- Filter container prefix `nl-*` (not `nl-demo-*`)

#### 5.2 `scripts/verify-monitoring.sh`

Checks:

1. Local metrics endpoints (sample + full optional)
2. `nestlancer_http_requests_total` present and growing
3. Promtail container running; no 401 from Loki
4. Prometheus target health (when `PROMETHEUS_URL` set)
5. Loki log query `{container=~"nl-.*"}`
6. Trace env vars set; OTLP endpoint TCP reachable

Exit non-zero on critical failures.

#### 5.3 Root `package.json`

```json
"verify:monitoring": "bash scripts/verify-monitoring.sh"
```

#### 5.4 Optional dev traffic generator

Adapt `demo-api/scripts/continuous-traffic.sh` for dev/staging metric/trace population.

#### 5.5 Operator runbook

Create `docs/observability.md` — env vars, port scheme, troubleshooting (401 Loki, wrong scrape IP, empty Jaeger).

**Acceptance:** `pnpm verify:monitoring` passes on fully running dev stack.

---

### WP-6 — Collector Wiring & Worker Metrics (P2 — Sprint 4, incremental)

Optional but recommended after WP-1:

| Collector                  | Wire in                              |
| -------------------------- | ------------------------------------ |
| `QueueMetricsCollector`    | `libs/queue` publish/consume/DLQ     |
| `DatabaseMetricsCollector` | Prisma middleware in `libs/database` |
| `CacheMetricsCollector`    | `libs/cache` hit/miss                |

Add business counters to workers without them: analytics, cdn, document, email, export, media.

---

### WP-7 — Standardization & Cleanup (P2 — Sprint 4+)

#### 7.1 Shared bootstrap helpers (`libs/common/src/bootstrap/`)

```typescript
bootstrapObservability(app, options); // logger, metrics, interceptors
bootstrapHttp(app, options); // CORS, helmet, pipes, filters
```

Refactor 28 `main.ts` incrementally.

#### 7.2 Dead code decisions

| Item                                | Action                                    |
| ----------------------------------- | ----------------------------------------- |
| `HttpMetricsCollector` (HTTP)       | Deprecate; interceptor is source of truth |
| `libs/logger` formatters/transports | Wire or remove                            |
| Unused DB/cache/queue collectors    | Wire in WP-6 or remove                    |

#### 7.3 Dev compose worker healthchecks

Lightweight checks: process alive + metrics endpoint reachable.

---

## 9. Per-Workload Checklist

Each workload requires all items before marking complete.

| #   | Task                                            | gateway | ws-gw | svc×16 | worker×10 |
| --- | ----------------------------------------------- | :-----: | :---: | :----: | :-------: |
| 1   | `initTracing(serviceName)` before `NestFactory` |    ☐    |   ☐   |   ☐    |     ☐     |
| 2   | `bootstrapMetrics(app)` after listen/init       |    ☐    |   ☐   |   ☐    |     ☐     |
| 3   | `app.useLogger(NestlancerLoggerService)`        |    ☐    |   ☐   |   ☐    |     ☐     |
| 4   | `CorrelationIdMiddleware` (HTTP/WS)             |    ☐    |   ☐   |   ☐    |    N/A    |
| 5   | `MetricsModule` in app.module                   |    ☐    |   ☐   |   ☐    |     ☐     |
| 6   | `TracingModule` in app.module                   |    ☐    |   ☐   |   ☐    |     ☐     |
| 7   | `MetricsInterceptor` via `forRoot()`            |    ☐    |   ☐   |   ☐    |    N/A    |
| 8   | Metrics host port in compose                    |    ☐    |   ☐   |   ☐    |     ☐     |
| 9   | `OTEL_SERVICE_NAME` env set                     |    ☐    |   ☐   |   ☐    |     ☐     |
| 10  | K8s metrics port + Service                      |    ☐    |   ☐   |   ☐    |     ☐     |

**Pre-complete:** `LoggerModule` — 28/28 ✅

**Known gaps (fix in WP-1 / WP-3):** messaging (#5, #6); ws-gateway (#5); blog, portfolio (#6).

---

## 10. File Change Inventory

### 10.1 New files

| File                                                  | Work package |
| ----------------------------------------------------- | ------------ |
| `libs/metrics/src/metrics-server.ts`                  | WP-1         |
| `libs/metrics/src/bootstrap.ts`                       | WP-1         |
| `libs/tracing/src/otel-bootstrap.ts`                  | WP-3         |
| `libs/config/src/schemas/observability.schema.ts`     | WP-2         |
| `config/promtail.yml`                                 | WP-2         |
| `config/promtail-snippet.example.yml`                 | WP-2         |
| `config/app-metrics-targets.example.env`              | WP-4         |
| `config/prometheus-scrape.example.yml`                | WP-4         |
| `config/alertmanager-rules.example.yml`               | WP-4         |
| `scripts/generate-app-metrics-targets.sh`             | WP-5         |
| `scripts/verify-monitoring.sh`                        | WP-5         |
| `docs/observability.md`                               | WP-5         |
| `deploy/k3s/base/workloads/worker-document-*.yaml`    | WP-4         |
| `deploy/k3s/base/workloads/worker-export-*.yaml`      | WP-4         |
| `deploy/k3s/base/workloads/worker-*-service.yaml` ×10 | WP-4         |

### 10.2 Key modifications

| File                                                       | Changes                                 |
| ---------------------------------------------------------- | --------------------------------------- |
| `libs/metrics/src/metrics.module.ts`                       | Dynamic `forRoot()` + `APP_INTERCEPTOR` |
| `libs/metrics/src/interceptors/metrics.interceptor.ts`     | Error paths, label alignment            |
| `libs/tracing/src/middleware/correlation-id.middleware.ts` | ALS + traceparent                       |
| `libs/logger/src/logger.service.ts`                        | Enriched JSON fields, level gating      |
| `libs/config/src/config.service.ts`                        | Observability getters                   |
| All 28 `*/src/main.ts`                                     | Observability bootstrap                 |
| `docker-compose.dev.yml`, `docker-compose.prod.yml`        | Metrics ports, Promtail, log rotation   |
| `deploy/k3s/base/workloads/*.yaml`                         | Metrics port 9464, env vars             |
| Root `package.json`                                        | `verify:monitoring` script              |

### 10.3 demo-api reference map (do not copy blindly)

| demo-api file                             | Port to main backend                 |
| ----------------------------------------- | ------------------------------------ |
| `src/metrics-server.ts`                   | `libs/metrics/src/metrics-server.ts` |
| `src/tracing.ts`                          | `libs/tracing/src/otel-bootstrap.ts` |
| `config/promtail.yml`                     | Filter `nl-*` not `nl-demo-*`        |
| `scripts/verify-monitoring.sh`            | Container prefix `nl-*`              |
| `scripts/generate-app-metrics-targets.sh` | 28 workloads, real container names   |
| `docker-compose.dev.yml`                  | Port scheme + Promtail service       |

---

## 11. Configuration Reference

Add to Infisical `dev` / `prod` and document in `.env.example`:

```bash
# ── Logging ──────────────────────────────────────────────────────────
LOG_LEVEL=info

# ── Metrics ──────────────────────────────────────────────────────────
METRICS_ENABLED=true
METRICS_PORT=9464
METRICS_BIND_HOST=0.0.0.0          # or Tailscale IP for restricted bind

# Per-container (compose / K8s)
OTEL_SERVICE_NAME=nl-gateway       # nl-svc-auth | nl-worker-email | ...
APP_NAME=nestlancer

# ── Tracing → Infra Jaeger ───────────────────────────────────────────
TRACING_ENABLED=true
JAEGER_OTLP_URL=http://<infra-tailscale-ip>:4318/v1/traces
# OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=  # alias

# ── Log shipping → Infra Loki ─────────────────────────────────────────
LOKI_PUSH_URL=http://<infra-tailscale-ip>:3100/loki/api/v1/push
LOKI_USERNAME=
LOKI_PASSWORD=

# ── Verification (scripts point at Infra VPS) ─────────────────────────
PROMETHEUS_URL=http://<infra-tailscale-ip>:9090
APP_METRICS_TARGETS=                 # generated by scripts/generate-app-metrics-targets.sh
```

### Production tracing sampling (recommended)

```bash
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1          # 10% in prod; 1.0 in dev
```

---

## 12. Verification & Quality Gates

### 12.1 Local developer check

```bash
docker compose -f docker-compose.dev.yml up -d --build
curl -sf http://127.0.0.1:13000/metrics | head
pnpm verify:monitoring
```

### 12.2 Pre-merge gate (PR)

- [ ] Unit tests pass for metrics server, bootstrap, interceptor
- [ ] At least gateway + one service expose `/metrics` in CI compose job (optional)
- [ ] No secrets committed in `config/*.example.*`

### 12.3 Pre-staging gate

- [ ] `verify-monitoring.sh` passes
- [ ] Infra team confirms Prometheus targets `up`
- [ ] Loki returns logs for `nl-gateway`

### 12.4 Pre-production gate

- [ ] Trace sampling configured
- [ ] Alert rules imported on Infra Alertmanager
- [ ] Rollback tested (`METRICS_ENABLED=false`, `TRACING_ENABLED=false`)

### 12.5 Manual Grafana validation

- [ ] Application Metrics dashboard — HTTP request rate visible
- [ ] Loki — `{container=~"nl-gateway"}` with `correlationId`
- [ ] Jaeger — cross-service trace gateway → downstream service

---

## 13. Rollout Strategy

### Stage 1 — Dev (docker-compose.dev.yml)

1. WP-1 → local `curl` metrics
2. WP-4.1 → `generate-app-metrics-targets.sh` → update Infra `APP_METRICS_TARGETS` with **App VPS Tailscale IP**
3. WP-2 → Loki log flow
4. WP-3 → Jaeger traces
5. WP-5 → `verify-monitoring.sh` must pass

### Stage 2 — Staging / K3s

1. WP-4.2 K8s manifests
2. Canary: deploy `nl-svc-health` first
3. Batch rollout: gateways → core services (auth, users, payments) → remaining services → workers

### Stage 3 — Production

1. Enable tracing with 10% sampling
2. Import alert rules from `config/alertmanager-rules.example.yml`
3. Monitor `nestlancer_http_requests_total` cardinality; add path normalization if needed

### Rollback (zero app impact)

| Toggle                  | Effect                             |
| ----------------------- | ---------------------------------- |
| `METRICS_ENABLED=false` | Stops metrics server               |
| `TRACING_ENABLED=false` | Skips OTel; correlation IDs remain |
| Remove `nl-promtail`    | Logs stay local only               |

---

## 14. Risks, Dependencies & Open Items

### 14.1 Risk register

| Risk                                       | Likelihood | Impact                | Mitigation                                             |
| ------------------------------------------ | ---------- | --------------------- | ------------------------------------------------------ |
| Prometheus scrapes wrong IP (`172.22.0.1`) | High       | Metrics empty         | `generate-app-metrics-targets.sh`; document in runbook |
| High-cardinality route labels              | Medium     | Prometheus memory     | Path normalization in interceptor                      |
| OTel auto-instrumentation overhead         | Medium     | Latency               | Disable `fs` instrumentation; sampling in prod         |
| Promtail `docker.sock` access              | Low        | Security              | Read-only mount; non-root where possible               |
| 28× `main.ts` drift                        | Medium     | Incomplete rollout    | Shared bootstrap helper (WP-7); per-workload checklist |
| Metric rename breaks dashboards            | Low        | Empty panels          | `nestlancer_` prefix matches existing Grafana          |
| Infisical sync delay                       | Medium     | Missing env at deploy | Document required vars in `docs/observability.md`      |

### 14.2 External dependencies

| Dependency                     | Required for |
| ------------------------------ | ------------ |
| Tailscale App ↔ Infra          | All signals  |
| Infra Loki accepting pushes    | WP-2         |
| Infra Jaeger OTLP `:4318`      | WP-3         |
| Infra Prometheus scrape config | WP-4         |

### 14.3 Open questions (resolve in WP-0)

| #   | Question                                 | Default if unresolved                     |
| --- | ---------------------------------------- | ----------------------------------------- |
| Q1  | Is Prometheus Operator installed on K3s? | Document manual scrape config             |
| Q2  | Loki auth enabled on Infra?              | Support `LOKI_USERNAME` / `LOKI_PASSWORD` |
| Q3  | Production trace sampling rate?          | 10% (`OTEL_TRACES_SAMPLER_ARG=0.1`)       |
| Q4  | Bind metrics to Tailscale IP only?       | `0.0.0.0` in dev; Tailscale in prod       |

---

## 15. Appendices

### Appendix A — Porting Checklist from demo-api

| demo-api capability               | Main backend action              | WP   |
| --------------------------------- | -------------------------------- | ---- |
| `startMetricsServer()`            | `libs/metrics` bootstrap         | WP-1 |
| Metrics host ports 13000+         | `docker-compose.*.yml`           | WP-4 |
| `nl-demo-promtail`                | `nl-promtail`, filter `nl-*`     | WP-2 |
| `initTracing()`                   | `libs/tracing/otel-bootstrap.ts` | WP-3 |
| `verify-monitoring.sh`            | Adapt container names            | WP-5 |
| `generate-app-metrics-targets.sh` | 28 real workloads                | WP-5 |
| `traffic-sim`                     | Optional dev script              | WP-5 |

### Appendix B — Module Coverage Matrix (current)

| App                  | Logger | Metrics | Tracing | Corr. MW | /metrics |
| -------------------- | :----: | :-----: | :-----: | :------: | :------: |
| gateway              |   ✓    |    ✓    |    ✓    |    ✓     |    ✗     |
| ws-gateway           |   ✓    |  **✗**  |    ✓    |    ✗     |    ✗     |
| auth–health (14 svc) |   ✓    |    ✓    |   ✓\*   | partial  |    ✗     |
| messaging            |   ✓    |  **✗**  |  **✗**  |    ✗     |    ✗     |
| blog, portfolio      |   ✓    |    ✓    |  **✗**  |    ✗     |    ✗     |
| all 10 workers       |   ✓    |    ✓    |    ✓    |   N/A    |    ✗     |

\*Tracing module imported but middleware missing in several `main.ts` files.

### Appendix C — Implementation Order (quick reference)

```
WP-0 Prerequisites
  → WP-1 Metrics (CRITICAL)
  → WP-4.1 Compose ports
  → WP-5.1 Target generator
  → WP-2 Logs
  → WP-3 Traces
  → WP-4.2 K8s
  → WP-5 Verification + docs
  → WP-6 Collectors (incremental)
  → WP-7 Standardization (incremental)
```

---

_Plan v2.0 — derived from [`observation-report.md`](./observation-report.md), codebase audit (28 workloads, 27 libs), and `demo-api/` reference implementation._
