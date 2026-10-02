FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.5 --activate

COPY turbo.json pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY libs/ ./libs/
COPY workers/notification-worker/ ./workers/notification-worker/
COPY prisma/ ./prisma/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @nestlancer/database generate
RUN pnpm --filter @nestlancer/notification-worker build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN apk add --no-cache curl

COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/workers/notification-worker/package.json ./workers/notification-worker/
COPY --from=builder /app/workers/notification-worker/dist ./workers/notification-worker/dist
COPY --from=builder /app/workers/notification-worker/node_modules ./workers/notification-worker/node_modules
COPY --from=builder /app/prisma ./prisma

WORKDIR /app/workers/notification-worker
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:9464/metrics').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
