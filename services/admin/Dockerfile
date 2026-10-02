FROM nestlancer/service-base:latest

WORKDIR /app

# Copy service source
COPY services/admin ./services/admin

# Build the service
RUN pnpm --filter @nestlancer/admin-service build

# Expose port
EXPOSE 3014

# Set production environment
ENV NODE_ENV=production

# Start the service
CMD ["node", "services/admin/dist/main"]
