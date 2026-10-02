FROM node:20-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.5 --activate

COPY turbo.json pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY libs/ ./libs/
COPY services/quotes/ ./services/quotes/
COPY prisma/ ./prisma/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @nestlancer/database generate
RUN pnpm --filter @nestlancer/quotes-service build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Install chromium for puppeteer (PDF generation)
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs ./libs
COPY --from=builder /app/services/quotes/package.json ./services/quotes/
COPY --from=builder /app/services/quotes/dist ./services/quotes/dist
COPY --from=builder /app/services/quotes/node_modules ./services/quotes/node_modules
COPY --from=builder /app/prisma ./prisma

WORKDIR /app/services/quotes
EXPOSE 3000
CMD ["node", "dist/main.js"]
