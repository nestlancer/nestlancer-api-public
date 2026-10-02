# Production image for export-worker.
# Matches docker/worker-base/Dockerfile.base.

FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json prisma.config.ts tsconfig.base.json ./
COPY workers/export-worker/package.json ./workers/export-worker/
COPY libs/ ./libs/
COPY prisma/ ./prisma/

RUN --mount=type=cache,id=nestlancer-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod=false

FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/libs ./libs
COPY --from=deps /app/workers/export-worker ./workers/export-worker
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/pnpm-workspace.yaml ./
COPY --from=deps /app/turbo.json ./
COPY --from=deps /app/package.json /app/pnpm-lock.yaml ./
COPY --from=deps /app/prisma.config.ts ./
COPY --from=deps /app/tsconfig.base.json ./

COPY workers/export-worker/ ./workers/export-worker/
COPY libs/ ./libs/

ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
RUN pnpm prisma generate
RUN --mount=type=cache,id=nestlancer-turbo,target=/app/.turbo \
    pnpm turbo build --filter=./workers/export-worker
RUN pnpm deploy --filter=./workers/export-worker --prod /app/deploy \
    && src="$(find /app/node_modules/.pnpm -path '*/node_modules/.prisma/client' -type d | head -1)" \
    && prisma_pkg="$(find /app/deploy/node_modules/.pnpm -path '*/node_modules/@prisma/client/default.js' | head -1)" \
    && deploy_mod="$(dirname "$(dirname "$(dirname "$prisma_pkg")")")" \
    && mkdir -p "$deploy_mod/.prisma" \
    && cp -r "$src" "$deploy_mod/.prisma/client"

FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init curl
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nestlancer && \
    adduser --system --uid 1001 nestlancer

COPY --from=builder --chown=nestlancer:nestlancer /app/workers/export-worker/dist ./dist
COPY --from=builder --chown=nestlancer:nestlancer /app/deploy/node_modules ./node_modules
COPY --from=builder --chown=nestlancer:nestlancer /app/deploy/package.json ./package.json
COPY --from=builder --chown=nestlancer:nestlancer /app/prisma ./prisma

USER nestlancer
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:9464/metrics').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["dumb-init", "node", "dist/main.js"]
