<div align="center">

# Monitoring

### Metrics, logs, and tracing for the deployed stack — a two-VPS model (App VPS + Infra VPS over Tailscale).

</div>

---

## 📖 Table of Contents

- [Topology](#topology)
- [Metrics (Prometheus)](#metrics-prometheus)
- [Logs (Loki + Promtail)](#logs-loki--promtail)
- [Tracing (Jaeger)](#tracing-jaeger)
- [Verifying the setup](#verifying-the-setup)
- [Known gap](#known-gap)

---

## Topology

Nestlancer runs two separate VPS hosts connected over Tailscale:

- **App VPS** — runs the application containers (gateway, ws-gateway, 16 services, 10 workers; the
  `nl-*` Docker containers). Each exposes a `/metrics` endpoint on its own port (see
  [`scripts/docker/workloads.manifest.json`](../../scripts/docker/workloads.manifest.json) for the
  canonical port list) and ships logs via a `nl-promtail` sidecar.
- **Infra VPS** — runs Prometheus (scrapes the App VPS), Loki (receives logs from Promtail), and
  Jaeger (receives traces, UI on port `16686`).

The example configs under [`config/`](../../config/) are templates to copy onto the **Infra VPS**,
not files consumed directly by this repo's own Docker Compose stack:

| File | Purpose |
| :-- | :-- |
| [`config/app-metrics-targets.example.env`](../../config/app-metrics-targets.example.env) | `APP_VPS_HOST` / `APP_METRICS_TARGETS` env values for the Infra VPS's Prometheus config |
| [`config/prometheus-scrape.example.yml`](../../config/prometheus-scrape.example.yml) | Prometheus `scrape_configs` job (`nestlancer-apps`) pointing at all 28 workload ports on the App VPS |
| [`config/alertmanager-rules.example.yml`](../../config/alertmanager-rules.example.yml) | Example alert rules (e.g. a workload's metrics target going down) |
| [`config/promtail.yml`](../../config/promtail.yml) | The actual Promtail config used by the `nl-promtail` sidecar container on the App VPS — reads Docker logs from `nl-*` containers, pushes to Loki on the Infra VPS |
| [`config/promtail-snippet.example.yml`](../../config/promtail-snippet.example.yml) | Bare-metal/non-Compose Promtail config variant |

## Metrics (Prometheus)

Each of the 28 workloads (gateway, ws-gateway, 16 services, 10 workers) exposes Prometheus-format
metrics (`nestlancer_*` and `nodejs_*` series) via [`libs/metrics`](../components/libs/metrics.md).
To wire a fresh App VPS's Tailscale IP into the Infra VPS's Prometheus config:

```bash
pnpm monitoring:targets   # prints APP_METRICS_TARGETS=<ip>:13000:gateway,<ip>:13100:ws-gateway,...
```

This runs [`scripts/monitoring/generate-app-metrics-targets.sh`](../../scripts/monitoring/generate-app-metrics-targets.sh),
which reads `APP_VPS_HOST` from `.env.infisical` (falling back to `tailscale ip -4` if unset) and
prints the full target list for all 28 ports. Paste the output into the Infra VPS's
`prometheus-scrape.example.yml`-based config.

## Logs (Loki + Promtail)

The `nl-promtail` sidecar (config: `config/promtail.yml`) tails Docker container logs for every
`nl-*` container on the App VPS and pushes them to Loki on the Infra VPS, authenticated via
`LOKI_USERNAME`/`LOKI_PASSWORD` if set.

## Tracing (Jaeger)

Enabled via `TRACING_ENABLED=true` + `JAEGER_OTLP_URL` (see
[`libs/tracing`](../components/libs/tracing.md)). The Jaeger UI runs on the Infra VPS, port
`16686`.

## Verifying the setup

```bash
pnpm verify:monitoring
```

Runs [`scripts/monitoring/verify-monitoring.sh`](../../scripts/monitoring/verify-monitoring.sh),
which checks (and clearly labels pass/fail/warn for each): the local gateway health endpoint, the
`nl-promtail` container, container count (~28 expected), the gateway's `/metrics` endpoint, a
sample of per-workload metrics ports, Prometheus reachability and `nestlancer_*` series presence,
Loki reachability and recent log queries, and tracing configuration. This requires network access
to the Infra VPS (via Tailscale) and will report warnings rather than false passes if that
infrastructure is unreachable from where you run it.

## Known gap

`scripts/monitoring/generate-app-metrics-targets.sh`'s header comment references
`observability-implementation-plan.md` ("see observability-implementation-plan.md") — this file
does not exist on `main` (neither in the working tree nor anywhere in `main`'s 2-commit history).
This is a pre-existing stale reference on `main`, not something introduced or removed during the
2026-10 documentation reset; flagged here rather than fabricated or recreated from guesswork.
