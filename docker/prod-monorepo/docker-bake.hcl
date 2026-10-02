# Build production runtime images with durable BuildKit cache + resumable checkpoints.
#
# Usage (from repo root):
#   docker buildx bake -f docker/prod-monorepo/docker-bake.hcl --load all-runtime
#   docker buildx bake -f docker/prod-monorepo/docker-bake.hcl --load gateways
#   docker buildx bake -f docker/prod-monorepo/docker-bake.hcl monorepo-builder
#   REGISTRY=ghcr.io/nestlancer TAG=1.0.0 docker buildx bake -f docker/prod-monorepo/docker-bake.hcl all-runtime
#
# Prefer ./scripts/docker/build-all-prod-images.sh (phased checkpoints by default).

variable "REGISTRY" {
  default = "ghcr.io/nestlancer"
}

variable "TAG" {
  default = "latest"
}

variable "CACHE_DIR" {
  default = ".cache/docker-buildkit"
}

variable "CONTEXT" {
  default = "."
}

variable "DOCKERFILE" {
  default = "docker/prod-monorepo/Dockerfile"
}

# Durable local cache IMPORT by default. Scripts add cache-to when exporting
# (checkpoints / single-image builds). Avoid default mode=max export on every
# runtime bake — re-exporting multi-GB graphs can hang for tens of minutes.
target "_base" {
  context    = CONTEXT
  dockerfile = DOCKERFILE
  cache-from = ["type=local,src=${CACHE_DIR}"]
}

function "tag" {
  params = [name]
  result = notequal("", REGISTRY) ? ["${REGISTRY}/${name}:${TAG}"] : ["nestlancer-${name}:${TAG}"]
}

# ── Checkpoints (warm durable cache; safe to re-run after interrupt) ──
target "monorepo-deps" {
  inherits = ["_base"]
  target   = "monorepo-deps"
  output   = ["type=cacheonly"]
}

target "monorepo-compile" {
  inherits = ["_base"]
  target   = "monorepo-compile"
  output   = ["type=cacheonly"]
}

# Full shared install+compile+deploy graph → durable cache only (no huge image load).
target "monorepo-builder" {
  inherits = ["_base"]
  target   = "monorepo-build"
  output   = ["type=cacheonly"]
}

# ── Gateways ──
target "gateway" {
  inherits = ["_base"]
  target   = "gateway"
  tags     = tag("gateway")
}

target "ws-gateway" {
  inherits = ["_base"]
  target   = "ws-gateway"
  tags     = tag("ws-gateway")
}

# ── Services ──
target "auth" {
  inherits = ["_base"]
  target   = "auth"
  tags     = tag("auth")
}

target "users" {
  inherits = ["_base"]
  target   = "users"
  tags     = tag("users")
}

target "payments" {
  inherits = ["_base"]
  target   = "payments"
  tags     = tag("payments")
}

target "webhooks" {
  inherits = ["_base"]
  target   = "webhooks"
  tags     = tag("webhooks")
}

target "admin" {
  inherits = ["_base"]
  target   = "admin"
  tags     = tag("admin")
}

target "requests" {
  inherits = ["_base"]
  target   = "requests"
  tags     = tag("requests")
}

target "quotes" {
  inherits = ["_base"]
  target   = "quotes"
  tags     = tag("quotes")
}

target "projects" {
  inherits = ["_base"]
  target   = "projects"
  tags     = tag("projects")
}

target "progress" {
  inherits = ["_base"]
  target   = "progress"
  tags     = tag("progress")
}

target "messaging" {
  inherits = ["_base"]
  target   = "messaging"
  tags     = tag("messaging")
}

target "notifications" {
  inherits = ["_base"]
  target   = "notifications"
  tags     = tag("notifications")
}

target "media" {
  inherits = ["_base"]
  target   = "media"
  tags     = tag("media")
}

target "portfolio" {
  inherits = ["_base"]
  target   = "portfolio"
  tags     = tag("portfolio")
}

target "blog" {
  inherits = ["_base"]
  target   = "blog"
  tags     = tag("blog")
}

target "contact" {
  inherits = ["_base"]
  target   = "contact"
  tags     = tag("contact")
}

target "health" {
  inherits = ["_base"]
  target   = "health"
  tags     = tag("health")
}

# ── Workers ──
target "analytics-worker" {
  inherits = ["_base"]
  target   = "analytics-worker"
  tags     = tag("analytics-worker")
}

target "audit-worker" {
  inherits = ["_base"]
  target   = "audit-worker"
  tags     = tag("audit-worker")
}

target "cdn-worker" {
  inherits = ["_base"]
  target   = "cdn-worker"
  tags     = tag("cdn-worker")
}

target "email-worker" {
  inherits = ["_base"]
  target   = "email-worker"
  tags     = tag("email-worker")
}

target "media-worker" {
  inherits = ["_base"]
  target   = "media-worker"
  tags     = tag("media-worker")
}

target "notification-worker" {
  inherits = ["_base"]
  target   = "notification-worker"
  tags     = tag("notification-worker")
}

target "outbox-poller" {
  inherits = ["_base"]
  target   = "outbox-poller"
  tags     = tag("outbox-poller")
}

target "webhook-worker" {
  inherits = ["_base"]
  target   = "webhook-worker"
  tags     = tag("webhook-worker")
}

target "document-worker" {
  inherits = ["_base"]
  target   = "document-worker"
  tags     = tag("document-worker")
}

target "export-worker" {
  inherits = ["_base"]
  target   = "export-worker"
  tags     = tag("export-worker")
}

# ── Groups ──
group "checkpoints" {
  targets = ["monorepo-deps", "monorepo-compile", "monorepo-builder"]
}

group "gateways" {
  targets = ["gateway", "ws-gateway"]
}

group "services" {
  targets = [
    "auth", "users", "payments", "webhooks", "admin", "requests", "quotes",
    "projects", "progress", "messaging", "notifications", "media",
    "portfolio", "blog", "contact", "health",
  ]
}

group "workers" {
  targets = [
    "analytics-worker", "audit-worker", "cdn-worker", "email-worker",
    "media-worker", "notification-worker", "outbox-poller", "webhook-worker",
    "document-worker", "export-worker",
  ]
}

group "all-runtime" {
  targets = ["gateways", "services", "workers"]
}
