<div align="center">

# Backend components

</div>

---

Everything under this folder documents a piece of **code that actually runs** in the monorepo —
as opposed to `docs/architecture/` (how the pieces fit together) or `docs/api/` (the HTTP
contract each service exposes). Start at [docs/README.md](../README.md) for the full doc map.

| Category | Count | Index | What it is |
| --- | --- | --- | --- |
| Gateways | 2 | [gateway.md](gateway.md) · [ws-gateway.md](ws-gateway.md) | HTTP API Gateway and WebSocket Gateway — the only components with public ingress |
| Microservices | 16 | [services/README.md](services/README.md) | Independently deployable NestJS apps, one bounded context each |
| Workers | 10 | [workers/README.md](workers/README.md) | RabbitMQ consumers that process outbox events (email, notifications, exports, …) |
| Shared libraries | 28 | [libs/README.md](libs/README.md) | `@nestlancer/*` workspace packages (639 exported symbols total, extracted from source) |

## How these docs are generated

Service, worker, and library pages under this folder are produced by
`scripts/docs/generate-component-docs.mjs` (see [scripts reference](../reference/scripts.md))
directly from the source tree: controller files are parsed for real HTTP routes, `package.json`
files are read for real workspace/external dependencies, and library `index.ts` barrels are
walked to list real exported symbols. Hand-curated prose (one-line descriptions, "used by"
callers, domain event names) is layered on top where static extraction can't infer intent. Re-run
the generator after any source change that should be reflected here.

## Reading order for newcomers

1. [Architecture overview](../architecture/overview.md) — the big picture first
2. [Gateway](gateway.md) — where every external request enters
3. Pick one [service](services/README.md) relevant to your task and read it end-to-end
4. Skim [libraries](libs/README.md) you'll actually import before reinventing something that
   already exists in `libs/`
5. [Workers](workers/README.md) only if your change touches an async side effect

[← Back to documentation index](../README.md)
