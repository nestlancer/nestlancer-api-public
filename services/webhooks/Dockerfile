FROM nestlancer/service-base:latest

WORKDIR /app

# Copy service specific source code
COPY services/webhooks ./services/webhooks/

# Build the service
RUN pnpm --filter @nestlancer/webhooks-service build

# Expose port
EXPOSE 3015

# Start command
CMD ["pnpm", "--filter", "@nestlancer/webhooks-service", "start:prod"]
