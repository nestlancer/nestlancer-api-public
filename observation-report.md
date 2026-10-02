# Observability Gap Report — Main Backend vs demo-api

Comparison of **demo-api** monitoring smoke-test configs against the **main backend** (`nestlancer-backend-api`), focused on observability and deployment wiring. The demo was built specifically to validate monitoring; the main project has the libraries but not the operational glue.

---

## Summary

| Area                             | demo-api                                                           | Main backend                               |
| -------------------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| **Logs → Loki**                  | Promtail sidecar in compose                                        | No Promtail config                         |
| **Metrics → Prometheus**         | Dedicated `:9464` server + host port mapping                       | Metrics lib exists, but nothing is scraped |
| **Traces → Jaeger**              | Full OpenTelemetry OTLP export                                     | Correlation IDs only (no OTLP)             |
| **Docker compose observability** | Complete (ports, logging, traffic sim)                             | App ports only (3000–3016)                 |
| **Verification tooling**         | `verify-monitoring.sh`, `generate-app-metrics-targets.sh`          | Only `smoke-health.sh` (health endpoints)  |
| **Infra integration docs**       | `app-metrics-targets.example.env`, `prometheus-scrape.example.yml` | None in repo                               |

---

## 1. Metrics — Biggest Gap

### demo-api (working design)

- Every container runs a separate metrics HTTP server on port `9464` (`demo-api/src/metrics-server.ts`).
- `docker-compose.dev.yml` publishes metrics to the host with a clear scheme:
  - Gateway: `13000`, ws-gateway: `13100`, services: `14001–14016`, workers: `15001–15010`
- `METRICS_BIND_HOST` lets you bind to Tailscale IP or `0.0.0.0`.
- Scripts generate `APP_METRICS_TARGETS` for infra Prometheus.

### Main backend (disadvantages)

1. **No `/metrics` HTTP endpoint** — `MetricsModule` and collectors exist, but no server exposes them (gateway `main.ts` only starts the Nest app on port 3000).

2. **`MetricsInterceptor` is never wired** — it exists in `libs/metrics` but is not registered as `APP_INTERCEPTOR` anywhere. HTTP request counters are never incremented in production code.

3. **`HttpMetricsCollector.recordRequest()` is never called** — collectors are initialized but unused outside unit tests.

4. **No metrics ports in compose** — `docker-compose.dev.yml` and `docker-compose.prod.yml` only publish app ports (`3000`, `3100`, `3001–3016`). Nothing on `9464` or `13000+`.

5. **K8s manifests have no metrics** — `deploy/k3s/base/workloads/gateway-deployment.yaml` only exposes port `3000`; no `9464`, no ServiceMonitor.

6. **Metric naming mismatch** — demo uses `nestlancer_http_requests_total` (what Grafana expects). Main backend collectors use `http_requests_total` without the `nestlancer_` prefix, and the interceptor uses `nestlancer_` but is unused.

**Impact:** Prometheus cannot scrape your real backend. Grafana “Application Metrics” dashboards stay empty even if infra is configured.

---

## 2. Logs — Promtail Pipeline Missing

### demo-api

- Promtail sidecar in `docker-compose.dev.yml` (`nl-demo-promtail`).
- Reads Docker logs via `docker.sock`, filters `nl-demo-*` containers.
- Pushes to `LOKI_PUSH_URL` on infra VPS.
- JSON log driver with rotation (`max-size: 10m`, `max-file: 3`).

### Main backend (disadvantages)

1. **No Promtail service** in `docker-compose.dev.yml` or `docker-compose.prod.yml`.
2. **No `config/promtail.yml`** for `nl-*` containers (only exists under `demo-api/`).
3. **No log rotation** in compose — default Docker logging with no `json-file` limits.
4. **No `LOKI_PUSH_URL` or Loki auth vars** documented in the main project.

**Impact:** Container logs stay on the app VPS. Loki/Grafana log queries like `{container=~"nl-.*"}` return nothing unless Promtail is set up manually outside the repo.

**Note:** Log _format_ is similar — main backend already emits JSON via `NestlancerLoggerService` and HTTP lines via `RequestLoggerMiddleware`. The gap is shipping, not formatting.

---

## 3. Tracing — Correlation IDs Only

### demo-api

- Full OpenTelemetry SDK (`demo-api/src/tracing.ts`) with OTLP export to Jaeger.
- Per-container `SERVICE_ID` for distinct trace service names.
- `TRACING_ENABLED`, `JAEGER_OTLP_URL` in `.env`.

### Main backend (disadvantages)

1. **`@nestlancer/tracing` is correlation-ID middleware only** — no OpenTelemetry SDK, no OTLP exporter.
2. Docs claim “OpenTelemetry bootstrap” but implementation is just `CorrelationIdMiddleware` + `TracingService` (in-memory store).
3. Config has `JAEGER_URL` but nothing consumes it for trace export.
4. No `TRACING_ENABLED` bootstrap in any `main.ts`.

**Impact:** Jaeger UI shows no distributed traces from the real backend. You only get correlation IDs in logs.

---

## 4. Docker Compose — Operational Gaps

| Feature                 | demo-api                          | Main backend                                                             |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| Metrics port publishing | All 26 workloads                  | None                                                                     |
| Promtail sidecar        | Yes                               | No                                                                       |
| Traffic simulator       | `traffic-sim` container           | No                                                                       |
| Healthchecks            | Gateway                           | Gateway only (workers have none in dev)                                  |
| Log driver limits       | `json-file` 10m/3 files           | Default                                                                  |
| Env simplicity          | 16 focused vars in `.env.example` | Infisical `.env.infisical` (fine for secrets, but no observability vars) |

### Main backend advantages (not disadvantages)

- Bind-mount hot reload for dev.
- Real DB/Redis/RabbitMQ integration.
- Infisical secret management.
- Full business logic.

The demo trades those for observability testability.

---

## 5. Tooling and Infra Integration

### demo-api has; main backend lacks

| Tool                                      | Purpose                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| `scripts/verify-monitoring.sh`            | End-to-end check: local metrics, Prometheus targets, Loki logs, trace config |
| `scripts/generate-app-metrics-targets.sh` | Auto-generate `APP_METRICS_TARGETS` from Tailscale IP                        |
| `config/app-metrics-targets.example.env`  | Copy-paste for infra Prometheus                                              |
| `config/prometheus-scrape.example.yml`    | Scrape job template for Grafana dashboard                                    |
| `config/alertmanager-rules.example.yml`   | Alert rules for scrape failures                                              |
| `demo-api/llm-report.md`                  | Documents the metrics pull-path failure mode                                 |

### Main backend only has

- `scripts/deploy/smoke-health.sh` — checks `/api/v1/health/live` and `/ready` only.
- No script to verify Prometheus/Loki/Jaeger integration.

---

## 6. Infra Misconfiguration (from demo-api llm-report)

Even with demo-api’s better config, metrics were broken on infra because:

- `APP_METRICS_TARGETS` pointed at `172.22.0.1` (infra Docker gateway) instead of the app VPS Tailscale IP.
- Only `:9464` was reachable before full port publishing.

The **main backend would hit the same infra misconfiguration**, plus it does not expose metrics at all — so it is strictly worse than the demo today.

### Signal flow comparison

| Signal  | Direction                         | demo-api status                    | Main backend status |
| ------- | --------------------------------- | ---------------------------------- | ------------------- |
| Logs    | App VPS Promtail → Loki `:3100`   | Working                            | Not wired           |
| Traces  | App OTLP → Jaeger `:4318`         | Working (when enabled)             | Not wired           |
| Metrics | Infra Prometheus → App `/metrics` | Broken on infra IP; apps do export | Not exposed at all  |

Metrics need:

1. App containers to publish `/metrics` on the host (ideally on the Tailscale interface).
2. `APP_METRICS_TARGETS` to use the **app VPS Tailscale IP**, not `172.22.0.1`.

---

## Disadvantages Ranked by Severity

### Critical (production blind spots)

1. **Metrics are collected in code but never exposed or scraped** — dashboards and alerts cannot work.
2. **No Promtail → no centralized logs** for `nl-*` containers.
3. **No distributed tracing export** — cannot debug cross-service latency in Jaeger.

### High (ops friction)

4. **No metrics port scheme in compose/K8s** — even after adding a metrics server, infra cannot reach it.
5. **No verification scripts** — no quick way to confirm monitoring works after deploy.
6. **No `APP_METRICS_TARGETS` generator** for the real stack (`nl-gateway`, `nl-svc-*`, etc.).

### Medium (quality / maintainability)

7. **Metrics library is partially dead code** — interceptors and collectors exist but are not wired.
8. **Docs overpromise** — tracing docs mention OpenTelemetry; implementation does not match.
9. **Inconsistent metric names** — `http_requests_total` vs `nestlancer_http_requests_total`.
10. **No continuous traffic generator** for dev/staging observability testing.

---

## What to Port from demo-api → Main Backend

Prioritized checklist:

1. Add `startMetricsServer()` (or Nest metrics controller) to gateway, services, and workers.
2. Add metrics port publishing to `docker-compose.dev.yml` / prod compose (same `13000+` scheme).
3. Add Promtail sidecar + `config/promtail.yml` filtered for `nl-*` (not `nl-demo-*`).
4. Wire `MetricsInterceptor` or call `HttpMetricsCollector.recordRequest()` globally.
5. Add OpenTelemetry bootstrap to `libs/tracing` (like `demo-api/src/tracing.ts`).
6. Copy/adapt `verify-monitoring.sh` and `generate-app-metrics-targets.sh` for `nl-*` naming.
7. Fix infra `APP_METRICS_TARGETS` to use the app VPS Tailscale IP.

---

## Bottom Line

The main backend is **functionally complete** but **operationally unobservable** compared to demo-api. You have `@nestlancer/metrics` and `@nestlancer/tracing` as libraries, but the demo has the **full observability pipeline**: expose → publish → ship → verify → document.

The single biggest disadvantage: **Prometheus, Loki, and Jaeger on the infra VPS have nothing useful to collect from the real backend today**, while the demo at least exposes metrics and ships logs/traces once infra targets are fixed.

---

_Generated from comparison of `demo-api/` configs against main backend `docker-compose.dev.yml`, `libs/metrics`, `libs/tracing`, and deploy manifests._
