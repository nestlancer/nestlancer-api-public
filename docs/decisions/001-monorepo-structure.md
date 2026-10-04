## 📖 Table of Contents

- [Status](#status)
- [Date](#date)
- [Context](#context)
- [Decision](#decision)
- [Rationale](#rationale)
- [Alternatives Considered](#alternatives-considered)
- [Trade-offs](#trade-offs)
- [Consequences](#consequences)

---

## Status

Accepted

---

## Date

2025-12-01

---

## Context

Nestlancer requires shared code across 16 microservices, 10 workers, and 2 gateways. We need to decide on a repository strategy that enables code sharing, consistent tooling, and manageable CI/CD.

---

## Decision

Use **pnpm workspaces + Turborepo** for a monorepo containing all services, workers, and shared libraries.

### Structure

- `services/*` – 16 NestJS microservices
- `workers/*` – 8 RabbitMQ workers
- `libs/*` – 24 shared libraries
- `gateway/` – API Gateway
- `ws-gateway/` – WebSocket Gateway

---

## Rationale

- **Code sharing**: `libs/*` packages imported via `@nestlancer/*` workspace protocol
- **Consistent tooling**: Single ESLint, Prettier, TypeScript configuration
- **Single CI pipeline**: One workflow tests all affected packages
- **Atomic refactors**: Changes across services in a single commit
- **Build caching**: Turborepo's remote caching skips unchanged packages

---

## Alternatives Considered

1. **Nx** – Too opinionated, heavy tooling lock-in
2. **Lerna** – Deprecated for new projects, no build orchestration
3. **Polyrepo** – Excessive overhead for a single team, code duplication, version drift

---

## Trade-offs

- Larger repository size
- Need for build caching to maintain CI speed
- Learning curve for Turborepo pipeline configuration
- All services share the same Node.js version

---

## Consequences

- All packages use pnpm workspace protocol (`workspace:*`) for inter-dependencies
- Turborepo `turbo.json` defines task pipeline with topological ordering
- CI builds only affected packages using Turborepo's change detection
