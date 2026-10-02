# syntax=docker/dockerfile:1.7-labs
# Shared monorepo build — install once (manifests only), compile once, slim deploy, then fast runtime targets.
# Dev images install Chromium + the whole workspace into one fat image (~70m).
# Prod must NOT repeat that: no Chromium in the build, no source-triggered reinstall.
# Deploy merges only *missing* monorepo store links (webpack externals like amqplib).
#
# Usage:
#   docker buildx bake -f docker/prod-monorepo/docker-bake.hcl --load all-runtime
#   docker build --target auth -f docker/prod-monorepo/Dockerfile -t ghcr.io/nestlancer/auth:latest .

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# ── Deps: lockfile + package.json only (NOT source). Cached until dependencies change. ──
# `--parents` keeps services/auth/package.json layout. A glob COPY into ./services/
# flattens every package.json on top of the same file and breaks the workspace.
FROM base AS monorepo-deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json prisma.config.ts tsconfig.base.json ./
COPY --parents gateway/package.json \
               ws-gateway/package.json \
               services/*/package.json \
               workers/*/package.json \
               libs/*/package.json \
               ./
COPY prisma/ ./prisma/
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN --mount=type=cache,id=nestlancer-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch --frozen-lockfile && \
    pnpm install --frozen-lockfile --offline --prod=false
RUN pnpm prisma generate

# ── Compile: source copy + turbo. No ARG before this RUN (ARG changes bust compile). ──
FROM monorepo-deps AS monorepo-compile
COPY gateway/ ./gateway/
COPY ws-gateway/ ./ws-gateway/
COPY services/ ./services/
COPY workers/ ./workers/
COPY libs/ ./libs/
RUN apk add --no-cache bash
RUN --mount=type=cache,id=nestlancer-turbo,target=/app/.turbo \
    pnpm build

# ── Slim prod node_modules trees (ARG only affects deploy, not compile) ──
FROM monorepo-compile AS monorepo-build
ARG NESTLANCER_DEPLOY_PARALLEL=6
ENV NESTLANCER_DEPLOY_PARALLEL=$NESTLANCER_DEPLOY_PARALLEL
ARG NESTLANCER_BUILD_TARGET=""
ENV NESTLANCER_BUILD_TARGET=$NESTLANCER_BUILD_TARGET
ARG NESTLANCER_BUILD_TARGETS=""
ENV NESTLANCER_BUILD_TARGETS=$NESTLANCER_BUILD_TARGETS
# Escape hatch: NESTLANCER_DEPLOY_FULL_STORE_MERGE=1 restores the old (very slow) full .pnpm merge.
ARG NESTLANCER_DEPLOY_FULL_STORE_MERGE=0
ENV NESTLANCER_DEPLOY_FULL_STORE_MERGE=$NESTLANCER_DEPLOY_FULL_STORE_MERGE
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
COPY docker/prod-monorepo/deploy-all.sh /tmp/deploy-all.sh
RUN chmod +x /tmp/deploy-all.sh && /tmp/deploy-all.sh

# ── Shared runtime base ──
FROM node:20-alpine AS runtime-base
RUN apk add --no-cache dumb-init curl
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nestlancer && \
    adduser --system --uid 1001 nestlancer

# Chromium once, shared by payments / quotes / document-worker (Puppeteer PDFs).
# Installing it in each target duplicates ~800MB on disk.
FROM runtime-base AS runtime-chromium
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# ── Gateway targets ──
FROM runtime-base AS gateway
ENV PORT=3000
ENV HEALTH_PATH=/api/v1/health/live
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/gateway/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/gateway/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/gateway/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-base AS ws-gateway
ENV PORT=3100
ENV HEALTH_PATH=/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/ws-gateway/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/ws-gateway/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/ws-gateway/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

# ── Microservices (image target name = service folder name) ──
FROM runtime-base AS auth
ENV PORT=3001
ENV HEALTH_PATH=/api/v1/auth/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/auth/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/auth/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/auth/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-base AS users
ENV PORT=3002
ENV HEALTH_PATH=/api/v1/users/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/users/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/users/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/users/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-chromium AS payments
ENV PORT=3003
ENV HEALTH_PATH=/api/v1/payments/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/payments/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/payments/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/payments/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/libs/pdf/assets ./assets
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/libs/pdf/assets ./libs/pdf/assets
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-base AS webhooks
ENV PORT=3004
ENV HEALTH_PATH=/api/v1/webhooks/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/webhooks/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/webhooks/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/webhooks/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-base AS admin
ENV PORT=3005
ENV HEALTH_PATH=/api/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/admin/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/admin/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/admin/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/libs/pdf/assets ./assets
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/libs/pdf/assets ./libs/pdf/assets
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-base AS requests
ENV PORT=3006
ENV HEALTH_PATH=/api/v1/requests/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/requests/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/requests/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/requests/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-chromium AS quotes
ENV PORT=3007
ENV HEALTH_PATH=/api/v1/quotes/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/quotes/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/quotes/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/quotes/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/libs/pdf/assets ./assets
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/libs/pdf/assets ./libs/pdf/assets
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-base AS projects
ENV PORT=3008
ENV HEALTH_PATH=/api/v1/projects/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/projects/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/projects/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/projects/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-base AS progress
ENV PORT=3009
ENV HEALTH_PATH=/api/v1/progress/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/progress/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/progress/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/progress/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-base AS messaging
ENV PORT=3010
ENV HEALTH_PATH=/api/v1/messages/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/messaging/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/messaging/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/messaging/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-base AS notifications
ENV PORT=3011
ENV HEALTH_PATH=/api/v1/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/notifications/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/notifications/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/notifications/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-base AS media
ENV PORT=3012
ENV HEALTH_PATH=/api/v1/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/media/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/media/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/media/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-base AS portfolio
ENV PORT=3013
ENV HEALTH_PATH=/api/v1/portfolio/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/portfolio/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/portfolio/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/portfolio/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-base AS blog
ENV PORT=3014
ENV HEALTH_PATH=/api/v1/posts/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/blog/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/blog/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/blog/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-base AS contact
ENV PORT=3015
ENV HEALTH_PATH=/api/v1/contact/health
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/contact/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/contact/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/contact/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-base AS health
ENV PORT=3016
ENV HEALTH_PATH=/api/v1/health/live
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/services/health/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/health/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/health/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD sh -c 'curl -sf "http://127.0.0.1:${PORT}${HEALTH_PATH}" || exit 1'
CMD ["dumb-init", "node", "dist/main.js"]

# ── Workers (metrics HEALTHCHECK on :9464 — required by cAdvisor/Alertmanager) ──
FROM node:20-alpine AS worker-runtime-base
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nestlancer && \
    adduser --system --uid 1001 nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:9464/metrics').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

FROM worker-runtime-base AS analytics-worker
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/workers/analytics-worker/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/analytics-worker/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/analytics-worker/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/libs/pdf/assets ./assets
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/libs/pdf/assets ./libs/pdf/assets
USER nestlancer
CMD ["dumb-init", "node", "dist/main.js"]

FROM worker-runtime-base AS audit-worker
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/workers/audit-worker/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/audit-worker/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/audit-worker/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
CMD ["dumb-init", "node", "dist/main.js"]

FROM worker-runtime-base AS cdn-worker
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/workers/cdn-worker/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/cdn-worker/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/cdn-worker/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
CMD ["dumb-init", "node", "dist/main.js"]

FROM worker-runtime-base AS email-worker
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/workers/email-worker/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/email-worker/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/email-worker/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/workers/email-worker/src/templates ./src/templates
ENV TEMPLATES_PATH=/app/src/templates
USER nestlancer
CMD ["dumb-init", "node", "dist/main.js"]

FROM worker-runtime-base AS media-worker
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/workers/media-worker/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/media-worker/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/media-worker/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
CMD ["dumb-init", "node", "dist/main.js"]

FROM worker-runtime-base AS notification-worker
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/workers/notification-worker/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/notification-worker/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/notification-worker/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
CMD ["dumb-init", "node", "dist/main.js"]

FROM worker-runtime-base AS outbox-poller
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/workers/outbox-poller/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/outbox-poller/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/outbox-poller/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
CMD ["dumb-init", "node", "dist/main.js"]

FROM worker-runtime-base AS webhook-worker
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/workers/webhook-worker/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/webhook-worker/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/webhook-worker/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
CMD ["dumb-init", "node", "dist/main.js"]

FROM runtime-chromium AS document-worker
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/workers/document-worker/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/document-worker/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/document-worker/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/libs/pdf/assets ./assets
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/libs/pdf/assets ./libs/pdf/assets
USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:9464/metrics').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["dumb-init", "node", "dist/main.js"]

FROM worker-runtime-base AS export-worker
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/workers/export-worker/dist ./dist
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/export-worker/node_modules ./node_modules
COPY --from=monorepo-build --chown=nestlancer:nestlancer /deploy/export-worker/package.json ./package.json
COPY --from=monorepo-build --chown=nestlancer:nestlancer /app/prisma ./prisma
USER nestlancer
CMD ["dumb-init", "node", "dist/main.js"]
