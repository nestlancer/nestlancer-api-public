# ── Stage 1: Dependencies ──
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json prisma.config.ts ./
COPY ws-gateway/package.json ./ws-gateway/
COPY libs/ ./libs/
COPY prisma/ ./prisma/

RUN pnpm install --frozen-lockfile --prod=false

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/libs ./libs
COPY --from=deps /app/ws-gateway ./ws-gateway
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/pnpm-workspace.yaml ./
COPY --from=deps /app/turbo.json ./
COPY --from=deps /app/package.json ./
COPY --from=deps /app/prisma.config.ts ./

COPY ws-gateway/ ./ws-gateway/
COPY libs/ ./libs/
COPY tsconfig.base.json ./

ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
RUN pnpm prisma generate
RUN pnpm turbo build --filter=@nestlancer/ws-gateway
RUN pnpm deploy --filter=@nestlancer/ws-gateway --prod /app/deploy \
    && src="$(find /app/node_modules/.pnpm -path '*/node_modules/.prisma/client' -type d | head -1)" \
    && prisma_pkg="$(find /app/deploy/node_modules/.pnpm -path '*/node_modules/@prisma/client/default.js' | head -1)" \
    && deploy_mod="$(dirname "$(dirname "$(dirname "$prisma_pkg")")")" \
    && mkdir -p "$deploy_mod/.prisma" \
    && cp -r "$src" "$deploy_mod/.prisma/client"

# ── Stage 3: Production ──
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=3100

WORKDIR /app

RUN addgroup --system --gid 1001 nestlancer && \
    adduser --system --uid 1001 nestlancer

COPY --from=builder --chown=nestlancer:nestlancer /app/ws-gateway/dist ./dist
COPY --from=builder --chown=nestlancer:nestlancer /app/deploy/node_modules ./node_modules
COPY --from=builder --chown=nestlancer:nestlancer /app/deploy/package.json ./package.json
COPY --from=builder --chown=nestlancer:nestlancer /app/prisma ./prisma

USER nestlancer

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD sh -c 'curl -sf http://127.0.0.1:3100/health || exit 1'

CMD ["dumb-init", "node", "dist/main.js"]
