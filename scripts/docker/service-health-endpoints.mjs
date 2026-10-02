/**
 * Per-workload HTTP liveness paths for Docker HEALTHCHECK and compose healthcheck.
 * Keep in sync with gateway/src/proxy/service-registry.ts healthEndpoint values.
 */
export const SERVICE_HEALTH_ENDPOINTS = {
  gateway: { port: 3000, path: '/api/v1/health/live' },
  'ws-gateway': { port: 3100, path: '/health' },
  auth: { port: 3001, path: '/api/v1/auth/health' },
  users: { port: 3002, path: '/api/v1/users/health' },
  payments: { port: 3003, path: '/api/v1/payments/health' },
  webhooks: { port: 3004, path: '/api/v1/webhooks/health' },
  admin: { port: 3005, path: '/api/health' },
  requests: { port: 3006, path: '/api/v1/requests/health' },
  quotes: { port: 3007, path: '/api/v1/quotes/health' },
  projects: { port: 3008, path: '/api/v1/projects/health' },
  progress: { port: 3009, path: '/api/v1/progress/health' },
  messaging: { port: 3010, path: '/api/v1/messages/health' },
  notifications: { port: 3011, path: '/api/v1/health' },
  media: { port: 3012, path: '/api/v1/health' },
  portfolio: { port: 3013, path: '/api/v1/portfolio/health' },
  blog: { port: 3014, path: '/api/v1/posts/health' },
  contact: { port: 3015, path: '/api/v1/contact/health' },
  health: { port: 3016, path: '/api/v1/health/live' },
};

export function healthCheckUrl(workloadId) {
  const cfg = SERVICE_HEALTH_ENDPOINTS[workloadId];
  if (!cfg) {
    throw new Error(`No health endpoint configured for workload: ${workloadId}`);
  }
  return `http://localhost:${cfg.port}${cfg.path}`;
}

/** Worker liveness: metrics server on 9464 (no HTTP health route). */
export const WORKER_METRICS_HEALTHCHECK =
  "fetch('http://127.0.0.1:9464/metrics').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))";
