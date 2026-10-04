<div align="center">

# Docker

### Image bases, gateway/proxy images, and the production monorepo build. For running these images, see [`docs/operations/`](../docs/operations/README.md); for the dev watch-mode stack, see [`docs/development/local-workflow.md`](../docs/development/local-workflow.md).

</div>

| Path | Purpose |
| :-- | :-- |
| [`dev.Dockerfile`](dev.Dockerfile) | Shared dev image used by **every** container in `docker-compose.dev.yml`. Installs dependencies + generates the Prisma client only — source code is bind-mounted at runtime, not baked in, so edits take effect without a rebuild. |
| [`service-base/Dockerfile.base`](service-base/Dockerfile.base) | Multi-stage base Dockerfile parameterized by `SERVICE_NAME` build arg — used to build each of the 16 production service images |
| [`worker-base/Dockerfile.base`](worker-base/Dockerfile.base) | Same pattern as `service-base`, parameterized by worker name — used to build each of the 10 production worker images |
| [`gateway/Dockerfile`](gateway/Dockerfile) | Production image for the API gateway |
| [`ws-gateway/Dockerfile`](ws-gateway/Dockerfile) | Production image for the WebSocket gateway |
| [`prod-monorepo/`](prod-monorepo/) | The actual production build path (see below) — `service-base`/`worker-base`/`gateway`/`ws-gateway` Dockerfiles above describe the per-workload shape, but production images are built via this shared monorepo pipeline for build-cache efficiency across all 28 workloads |
| [`caddy/`](caddy/) | Caddy reverse-proxy config: [`Caddyfile`](caddy/Caddyfile) (dev), [`Caddyfile.prod`](caddy/Caddyfile.prod) (production), and [`certs/`](caddy/certs/README.md) (origin TLS certs — see its own README for the full Cloudflare Origin Certificate setup flow) |

## Production monorepo build (`prod-monorepo/`)

Production images are built via a single shared Docker Buildx Bake pipeline rather than 28
independent `docker build` invocations, so dependency installation and compilation happen once and
are shared across all workload images:

| File | Purpose |
| :-- | :-- |
| [`Dockerfile`](prod-monorepo/Dockerfile) | Shared monorepo build: install once (manifests only) → compile once → slim `pnpm deploy` per workload → fast runtime stage per workload. Deliberately excludes Chromium and other dev-only weight that the dev image carries. |
| [`deploy-all.sh`](prod-monorepo/deploy-all.sh) | Runs inside the build stage; parallelizes `pnpm deploy` per workload (`NESTLANCER_DEPLOY_PARALLEL`, default 6), then copies the generated Prisma client and only the runtime npm packages actually needed by bundled `@nestlancer/*` code into each `/deploy/<slug>/` tree |
| [`docker-bake.hcl`](prod-monorepo/docker-bake.hcl) | Buildx Bake target definitions with durable BuildKit cache + resumable checkpoints. Typical invocations: `docker buildx bake -f docker/prod-monorepo/docker-bake.hcl --load all-runtime` (all 28 images), `... gateways` (just gateway + ws-gateway), or a single target name |

In practice you normally don't invoke `docker buildx bake` directly — use the `pnpm docker:prod:*`
scripts (see [`docs/reference/commands.md`](../docs/reference/commands.md)), which wrap this build
pipeline along with image tagging, pushing, and Compose generation.

## Generated production assets

`docker-compose.prod.yml` (root) is **generated**, not hand-written — it's produced by
`pnpm docker:prod:generate` (`scripts/docker/generate-prod-compose.mjs`) from
[`scripts/docker/workloads.manifest.json`](../scripts/docker/workloads.manifest.json), the single
source of truth for the 28 production workloads (ports, image names, Compose service names). Edit
the manifest, regenerate, don't hand-edit the generated Compose file.
