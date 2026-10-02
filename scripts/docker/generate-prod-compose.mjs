#!/usr/bin/env node
/**
 * Generates docker-compose.prod.yml from workloads.manifest.json.
 * Run: node scripts/docker/generate-prod-compose.mjs
 *
 * Every service gets hard mem/CPU ceilings so a 6c/12GB VPS cannot
 * thrash SSH if the Compose path is used.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  healthCheckUrl,
  WORKER_METRICS_HEALTHCHECK,
} from './service-health-endpoints.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(
  readFileSync(join(root, 'scripts/docker/workloads.manifest.json'), 'utf8'),
);

// Prefix for prod container names so dev (nl-*) and prod (nl-prod-*) can
// coexist on the same VPS without container-name or port collisions.
const PROD_PREFIX = 'nl-prod';

// Host-port offset: prod gateway listens on 4000 instead of 3000, metrics on
// 23xxx/24xxx/25xxx instead of 13xxx/14xxx/15xxx.  Internal container ports
// stay the same (services still bind to 3001, etc.).
const GATEWAY_HOST_PORT = 4000;
const WS_GATEWAY_HOST_PORT = 4100;
const METRICS_OFFSET = 10000; // 13000 → 23000, 14001 → 24001, 15001 → 25001

const serviceEnvLines = {
  auth: 'AUTH_SERVICE_URL: http://svc-auth:3001',
  users: 'USERS_SERVICE_URL: http://svc-users:3002',
  payments: 'PAYMENTS_SERVICE_URL: http://svc-payments:3003',
  webhooks: 'WEBHOOKS_SERVICE_URL: http://svc-webhooks:3004',
  admin: 'ADMIN_SERVICE_URL: http://svc-admin:3005',
  requests: 'REQUESTS_SERVICE_URL: http://svc-requests:3006',
  quotes: 'QUOTES_SERVICE_URL: http://svc-quotes:3007',
  projects: 'PROJECTS_SERVICE_URL: http://svc-projects:3008',
  progress: 'PROGRESS_SERVICE_URL: http://svc-progress:3009',
  messaging: 'MESSAGING_SERVICE_URL: http://svc-messaging:3010',
  notifications: 'NOTIFICATIONS_SERVICE_URL: http://svc-notifications:3011',
  media: 'MEDIA_SERVICE_URL: http://svc-media:3012',
  portfolio: 'PORTFOLIO_SERVICE_URL: http://svc-portfolio:3013',
  blog: 'BLOG_SERVICE_URL: http://svc-blog:3014',
  contact: 'CONTACT_SERVICE_URL: http://svc-contact:3015',
  health: 'HEALTH_SERVICE_URL: http://svc-health:3016',
};

/** Produce lighter-than-dev caps for prod (node dist, not nest watch). */
const RESOURCE_CLASSES = {
  gateway: {
    mem: '512m',
    cpus: '0.50',
    reserveMem: '128M',
    reserveCpu: '0.10',
    nodeHeap: 384,
  },
  svc: {
    mem: '384m',
    cpus: '0.35',
    reserveMem: '96M',
    reserveCpu: '0.05',
    nodeHeap: 256,
  },
  light: {
    mem: '256m',
    cpus: '0.25',
    reserveMem: '64M',
    reserveCpu: '0.05',
    nodeHeap: 192,
  },
  worker: {
    mem: '256m',
    cpus: '0.25',
    reserveMem: '64M',
    reserveCpu: '0.05',
    nodeHeap: 192,
  },
  pdf: {
    mem: '512m',
    cpus: '0.50',
    reserveMem: '128M',
    reserveCpu: '0.10',
    nodeHeap: 256,
  },
  sidecar: {
    mem: '128m',
    cpus: '0.20',
    reserveMem: '32M',
    reserveCpu: '0.05',
    nodeHeap: null,
  },
};

const LIGHT_SERVICES = new Set([
  'webhooks',
  'progress',
  'media',
  'portfolio',
  'blog',
  'contact',
  'health',
]);
const PDF_WORKERS = new Set(['document-worker', 'export-worker']);

function resourceClassFor(workloadId, { worker } = {}) {
  if (workloadId === 'gateway' || workloadId === 'ws-gateway') {
    return RESOURCE_CLASSES.gateway;
  }
  if (worker) {
    return PDF_WORKERS.has(workloadId)
      ? RESOURCE_CLASSES.pdf
      : RESOURCE_CLASSES.worker;
  }
  return LIGHT_SERVICES.has(workloadId)
    ? RESOURCE_CLASSES.light
    : RESOURCE_CLASSES.svc;
}

function resourceLines(cls, indent = '    ') {
  const memUpper = cls.mem.replace('m', 'M');
  return [
    `${indent}mem_limit: ${cls.mem}`,
    `${indent}memswap_limit: ${cls.mem}`,
    `${indent}cpus: ${cls.cpus}`,
    `${indent}deploy:`,
    `${indent}  resources:`,
    `${indent}    limits:`,
    `${indent}      cpus: '${cls.cpus}'`,
    `${indent}      memory: ${memUpper}`,
    `${indent}    reservations:`,
    `${indent}      cpus: '${cls.reserveCpu}'`,
    `${indent}      memory: ${cls.reserveMem}`,
  ].join('\n');
}

function imageRef(id) {
  return `\${NESTLANCER_IMAGE_REGISTRY:-${manifest.imageRegistry}}/${id}:\${NESTLANCER_IMAGE_TAG:-latest}`;
}

function prodContainerName(id) {
  return `${PROD_PREFIX}-${id}`;
}

function otelServiceName(id) {
  return `${PROD_PREFIX}-${id}`;
}

function observabilityEnvLines(otelName, extra = {}, nodeHeap = 256) {
  const lines = [
    '    environment:',
    `      OTEL_SERVICE_NAME: ${otelName}`,
    "      TRACING_ENABLED: 'true'",
    "      METRICS_ENABLED: 'true'",
    "      METRICS_PORT: '9464'",
    "      METRICS_BIND_HOST: '0.0.0.0'",
  ];
  if (nodeHeap != null) {
    lines.push(`      NODE_OPTIONS: '--max-old-space-size=${nodeHeap}'`);
  }
  for (const [k, v] of Object.entries(extra)) {
    lines.push(`      ${k}: ${v}`);
  }
  return lines;
}

function metricsPortLine(hostPort) {
  const offsetPort = hostPort + METRICS_OFFSET;
  return `      - '\${METRICS_BIND_HOST:-0.0.0.0}:${offsetPort}:9464'`;
}

function prodWorkloadBlock(workload, opts = {}) {
  const { port, metricsHostPort, extraEnv, worker, exposeAppPort } = opts;
  const otelName = otelServiceName(workload.id);
  const cls = resourceClassFor(workload.id, { worker });
  const envExtra = { ...(extraEnv || {}) };
  if (port) {
    envExtra.PORT = `"${port}"`;
  }

  const cname = prodContainerName(workload.id);
  const lines = [
    `  ${workload.composeService}:`,
    `    <<: *prod-service`,
    `    image: ${imageRef(workload.id)}`,
    `    container_name: ${cname}`,
    resourceLines(cls),
    ...observabilityEnvLines(otelName, envExtra, cls.nodeHeap),
    `    ports:`,
  ];

  if (exposeAppPort && port) {
    lines.push(`      - '${port}:${port}'`);
  }
  if (metricsHostPort) {
    lines.push(metricsPortLine(metricsHostPort));
  }

  if (port && !worker) {
    lines.push(
      `    healthcheck:`,
      `      test: ['CMD', 'curl', '-f', '${healthCheckUrl(workload.id)}']`,
      `      interval: 30s`,
      `      timeout: 10s`,
      `      start_period: 45s`,
      `      retries: 5`,
    );
  }

  if (worker) {
    // Workers expose Prometheus on 9464 (no HTTP liveness route). Docker HEALTHCHECK
    // is required so cAdvisor reports healthy and Alertmanager does not false-fire.
    lines.push(
      `    healthcheck:`,
      `      test: ['CMD', 'node', '-e', ${JSON.stringify(WORKER_METRICS_HEALTHCHECK)}]`,
      `      interval: 30s`,
      `      timeout: 10s`,
      `      start_period: 45s`,
      `      retries: 5`,
      `    depends_on:`,
      `      - gateway`,
    );
  }

  return lines.join('\n');
}

const header = `# AUTO-GENERATED — edit scripts/docker/workloads.manifest.json then:
#   node scripts/docker/generate-prod-compose.mjs
#
# Production stack: pre-built images (no bind mounts). Secrets via Infisical → .env.infisical
#   bash scripts/docker/compose-prod.sh up -d
#
# Hard mem/CPU limits on every service (SSH-safe on 6c/12GB VPS).

x-prod-service: &prod-service
  env_file:
    - .env.infisical
  # Images ship these under .pnpm but do not link them at node_modules/@opentelemetry.
  entrypoint:
    - /bin/sh
    - -c
    - |
      set -e
      cd /app
      mkdir -p node_modules/@opentelemetry
      link_one() {
        src=$$(ls -d node_modules/.pnpm/$$1 2>/dev/null | head -1 || true)
        [ -n "$$src" ] || return 0
        target="/app/$$src/node_modules/@opentelemetry/$$2"
        dest="node_modules/@opentelemetry/$$2"
        [ -e "$$target" ] || return 0
        [ -e "$$dest" ] || ln -sfn "$$target" "$$dest"
      }
      link_one '@opentelemetry+api@*' api
      link_one '@opentelemetry+sdk-node@*' sdk-node
      link_one '@opentelemetry+auto-instrumentations-node@*' auto-instrumentations-node
      link_one '@opentelemetry+exporter-trace-otlp-http@*' exporter-trace-otlp-http
      link_one '@opentelemetry+resources@*' resources
      link_one '@opentelemetry+semantic-conventions@*' semantic-conventions
      exec docker-entrypoint.sh "$$@"
    - --
  # Image CMD is dropped when entrypoint is overridden (Compose 5). Set it here.
  command:
    - dumb-init
    - node
    - dist/main.js
  networks:
    - nestlancer-prod
  restart: unless-stopped
  logging:
    driver: json-file
    options:
      max-size: '10m'
      max-file: '3'

networks:
  nestlancer-prod:
    name: nestlancer-prod
    driver: bridge

services:
`;

const gateway = manifest.gateways.find((g) => g.id === 'gateway');
const wsGateway = manifest.gateways.find((g) => g.id === 'ws-gateway');
const gwCls = RESOURCE_CLASSES.gateway;

const gwMetricsPort = gateway.metricsHostPort + METRICS_OFFSET;
const wsMetricsPort = wsGateway.metricsHostPort + METRICS_OFFSET;

const gatewayBlock = `  gateway:
    <<: *prod-service
    image: ${imageRef('gateway')}
    container_name: ${prodContainerName('gateway')}
${resourceLines(gwCls)}
    environment:
      OTEL_SERVICE_NAME: ${otelServiceName('gateway')}
      TRACING_ENABLED: 'true'
      METRICS_ENABLED: 'true'
      METRICS_PORT: '9464'
      METRICS_BIND_HOST: '0.0.0.0'
      NODE_OPTIONS: '--max-old-space-size=${gwCls.nodeHeap}'
${Object.values(serviceEnvLines)
  .map((l) => `      ${l}`)
  .join('\n')}
    ports:
      - '${GATEWAY_HOST_PORT}:3000'
      - '\${METRICS_BIND_HOST:-0.0.0.0}:${gwMetricsPort}:9464'
    healthcheck:
      test: ['CMD', 'curl', '-f', '${healthCheckUrl('gateway')}']
      interval: 30s
      timeout: 10s
      start_period: 60s
      retries: 5

  ws-gateway:
    <<: *prod-service
    image: ${imageRef('ws-gateway')}
    container_name: ${prodContainerName('ws-gateway')}
${resourceLines(gwCls)}
${observabilityEnvLines(otelServiceName('ws-gateway'), {}, gwCls.nodeHeap).join('\n')}
    ports:
      - '${WS_GATEWAY_HOST_PORT}:3100'
      - '\${METRICS_BIND_HOST:-0.0.0.0}:${wsMetricsPort}:9464'
    healthcheck:
      test: ['CMD', 'curl', '-f', '${healthCheckUrl('ws-gateway')}']
      interval: 30s
      timeout: 10s
      start_period: 45s
      retries: 5
    depends_on:
      gateway:
        condition: service_healthy
`;

const serviceBlocks = manifest.services
  .map((s) =>
    prodWorkloadBlock(s, {
      port: s.port,
      metricsHostPort: s.metricsHostPort,
      extraEnv: s.extraEnv,
    }),
  )
  .join('\n\n');

const workerBlocks = manifest.workers
  .map((w) =>
    prodWorkloadBlock(w, {
      metricsHostPort: w.metricsHostPort,
      extraEnv: w.extraEnv,
      worker: true,
    }),
  )
  .join('\n\n');

const sidecar = RESOURCE_CLASSES.sidecar;
const promtailBlock = `
  # ── Promtail (App VPS sidecar — ships nl-* logs → Loki on Infra VPS) ─────
  promtail:
    image: grafana/promtail:3.0.0
    container_name: ${prodContainerName('promtail')}
${resourceLines(sidecar)}
    env_file:
      - .env.infisical
    environment:
      LOKI_PUSH_URL: \${LOKI_PUSH_URL:-http://100.115.123.41:3100/loki/api/v1/push}
      OBSERVABILITY_ENV: production
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./config/promtail.yml:/etc/promtail/config.yml:ro
      - promtail-positions:/tmp/promtail
    command:
      - -config.file=/etc/promtail/config.yml
      - -config.expand-env=true
    healthcheck:
      test: ['CMD-SHELL', 'bash -c "echo >/dev/tcp/127.0.0.1/9080"']
      interval: 30s
      timeout: 10s
      start_period: 20s
      retries: 5
    networks:
      - nestlancer-prod
    restart: unless-stopped

volumes:
  promtail-positions:
`;

const out =
  header + gatewayBlock + '\n\n' + serviceBlocks + '\n\n' + workerBlocks + promtailBlock + '\n';
writeFileSync(join(root, 'docker-compose.prod.yml'), out);
console.log('Wrote docker-compose.prod.yml');
