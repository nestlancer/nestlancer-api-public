FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.5 --activate

# Copy turborepo and workspace configs
COPY turbo.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./

# Copy packages and service
COPY libs/ ./libs/
COPY services/health/ ./services/health/

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @nestlancer/health-service build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV production

# Install curl for health checks
RUN apk add --no-cache curl

COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/services/health/package.json ./services/health/
COPY --from=builder /app/services/health/dist ./services/health/dist
COPY --from=builder /app/services/health/node_modules ./services/health/node_modules

WORKDIR /app/services/health

EXPOSE 3000

CMD ["node", "dist/main.js"]
