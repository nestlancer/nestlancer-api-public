FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.5 --activate

COPY turbo.json pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY libs/ ./libs/
COPY services/projects/ ./services/projects/
COPY prisma/ ./prisma/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @nestlancer/database generate
RUN pnpm --filter @nestlancer/projects-service build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN apk add --no-cache curl

COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/services/projects/package.json ./services/projects/
COPY --from=builder /app/services/projects/dist ./services/projects/dist
COPY --from=builder /app/services/projects/node_modules ./services/projects/node_modules
COPY --from=builder /app/prisma ./prisma

WORKDIR /app/services/projects
EXPOSE 3000
CMD ["node", "dist/main.js"]
