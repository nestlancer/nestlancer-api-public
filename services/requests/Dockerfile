FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.5 --activate

COPY turbo.json pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY libs/ ./libs/
COPY services/requests/ ./services/requests/
COPY prisma/ ./prisma/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @nestlancer/database generate
RUN pnpm --filter @nestlancer/requests-service build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN apk add --no-cache curl

COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/services/requests/package.json ./services/requests/
COPY --from=builder /app/services/requests/dist ./services/requests/dist
COPY --from=builder /app/services/requests/node_modules ./services/requests/node_modules
COPY --from=builder /app/prisma ./prisma

WORKDIR /app/services/requests
EXPOSE 3000
CMD ["node", "dist/main.js"]
