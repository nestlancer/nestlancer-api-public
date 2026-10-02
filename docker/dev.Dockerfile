# ══════════════════════════════════════════════════════════════
# Nestlancer — Shared Dev Image
# ══════════════════════════════════════════════════════════════
# This image is used by ALL containers in docker-compose.dev.yml.
# Source code is NOT baked in — it is bind-mounted at runtime.
# Only dependencies and the Prisma client are installed here so
# that Docker layer caching avoids re-running pnpm install on
# every code change.
#
# Usage:
#   docker compose -f docker-compose.dev.yml build
#   docker compose -f docker-compose.dev.yml up -d
# ══════════════════════════════════════════════════════════════

FROM node:20-alpine

# ── System dependencies ─────────────────────────────────────
# python3/make/g++ are needed for native addons (bcrypt, sharp, etc.)
# chromium is required for on-demand PDF generation in quotes/payments services
RUN apk add --no-cache \
      python3 make g++ curl \
      chromium nss freetype harfbuzz ca-certificates ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# ── Enable pnpm via corepack ────────────────────────────────
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# ── Workspace manifests (layer-cached separately) ───────────
# Only copy package.json files first so that `pnpm install` is
# cached and only re-runs when dependencies actually change.
COPY pnpm-workspace.yaml \
     pnpm-lock.yaml \
     package.json \
     turbo.json \
     tsconfig.base.json \
     prisma.config.ts \
     ./

# ── Gateways ────────────────────────────────────────────────
COPY gateway/package.json          ./gateway/
COPY ws-gateway/package.json       ./ws-gateway/

# ── Services ────────────────────────────────────────────────
COPY services/admin/package.json         ./services/admin/
COPY services/auth/package.json          ./services/auth/
COPY services/blog/package.json          ./services/blog/
COPY services/contact/package.json       ./services/contact/
COPY services/health/package.json        ./services/health/
COPY services/media/package.json         ./services/media/
COPY services/messaging/package.json     ./services/messaging/
COPY services/notifications/package.json ./services/notifications/
COPY services/payments/package.json      ./services/payments/
COPY services/portfolio/package.json     ./services/portfolio/
COPY services/progress/package.json      ./services/progress/
COPY services/projects/package.json      ./services/projects/
COPY services/quotes/package.json        ./services/quotes/
COPY services/requests/package.json      ./services/requests/
COPY services/users/package.json         ./services/users/
COPY services/webhooks/package.json      ./services/webhooks/

# ── Workers ─────────────────────────────────────────────────
COPY workers/analytics-worker/package.json    ./workers/analytics-worker/
COPY workers/audit-worker/package.json        ./workers/audit-worker/
COPY workers/cdn-worker/package.json          ./workers/cdn-worker/
COPY workers/email-worker/package.json        ./workers/email-worker/
COPY workers/media-worker/package.json        ./workers/media-worker/
COPY workers/notification-worker/package.json ./workers/notification-worker/
COPY workers/outbox-poller/package.json       ./workers/outbox-poller/
COPY workers/webhook-worker/package.json      ./workers/webhook-worker/
COPY workers/document-worker/package.json     ./workers/document-worker/
COPY workers/export-worker/package.json       ./workers/export-worker/

# ── Libs (all package.json files) ───────────────────────────
COPY libs/alerts/package.json          ./libs/alerts/
COPY libs/audit/package.json           ./libs/audit/
COPY libs/auth-lib/package.json        ./libs/auth-lib/
COPY libs/cache/package.json           ./libs/cache/
COPY libs/circuit-breaker/package.json ./libs/circuit-breaker/
COPY libs/common/package.json          ./libs/common/
COPY libs/config/package.json          ./libs/config/
COPY libs/crypto/package.json          ./libs/crypto/
COPY libs/database/package.json        ./libs/database/
COPY libs/health-lib/package.json      ./libs/health-lib/
COPY libs/idempotency/package.json     ./libs/idempotency/
COPY libs/logger/package.json          ./libs/logger/
COPY libs/mail/package.json            ./libs/mail/
COPY libs/metrics/package.json         ./libs/metrics/
COPY libs/middleware/package.json      ./libs/middleware/
COPY libs/outbox/package.json          ./libs/outbox/
COPY libs/pdf/package.json             ./libs/pdf/
COPY libs/documents/package.json       ./libs/documents/
COPY libs/email/package.json           ./libs/email/
COPY libs/queue/package.json           ./libs/queue/
COPY libs/search/package.json          ./libs/search/
COPY libs/storage/package.json         ./libs/storage/
COPY libs/testing/package.json         ./libs/testing/
COPY libs/tracing/package.json         ./libs/tracing/
COPY libs/turnstile/package.json       ./libs/turnstile/
COPY libs/websocket/package.json       ./libs/websocket/

# ── Install all workspace dependencies ──────────────────────
RUN pnpm install --frozen-lockfile

# ── Prisma schema (for client generation) ───────────────────
# Only the schema dir is needed here — migrations and seeds are
# run from the host machine before containers start.
COPY prisma/ ./prisma/

# ── Generate Prisma client ───────────────────────────────────
# Uses a dummy DATABASE_URL — only the schema is parsed here.
# The real URL comes from Infisical (exported to .env.infisical) at runtime.
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
    pnpm prisma generate --schema prisma/schema

# ── Default CMD (overridden per-service in docker-compose.dev.yml) ──
CMD ["echo", "Use docker-compose.dev.yml — this image is a base only"]
