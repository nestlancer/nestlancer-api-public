/**
 * Service Registry - Maps service names to their URLs
 * Centralized configuration for microservice discovery
 */

export interface ServiceConfig {
  url: string;
  timeout: number;
  healthEndpoint: string;
}

export const SERVICE_REGISTRY: Record<string, ServiceConfig> = {
  // prefix: api/v1/auth  |  @Controller()  |  health at /api/v1/auth/health
  auth: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    timeout: 15000,
    healthEndpoint: '/api/v1/auth/health',
  },
  // prefix: api/v1  |  @Controller('users')  |  health at /api/v1/users/health
  users: {
    url: process.env.USERS_SERVICE_URL || 'http://localhost:3002',
    timeout: Number(process.env.USERS_SERVICE_TIMEOUT_MS || 15_000),
    healthEndpoint: '/api/v1/users/health',
  },
  // prefix: api + URI v1  |  @Controller('payments')  |  health at /api/v1/payments/health
  payments: {
    url: process.env.PAYMENTS_SERVICE_URL || 'http://localhost:3003',
    timeout: 20000,
    healthEndpoint: '/api/v1/payments/health',
  },
  // prefix: api/v1/webhooks  |  various controllers  |  health at /api/v1/webhooks/health
  webhooks: {
    url: process.env.WEBHOOKS_SERVICE_URL || 'http://localhost:3004',
    timeout: 10000,
    healthEndpoint: '/api/v1/webhooks/health',
  },
  // prefix: api  |  @Controller()  |  health at /api/health
  admin: {
    url: process.env.ADMIN_SERVICE_URL || 'http://localhost:3005',
    timeout: Number(process.env.ADMIN_SERVICE_TIMEOUT_MS || 15_000),
    healthEndpoint: '/api/health',
  },
  // prefix: api/v1  |  @Controller('requests')  |  health at /api/v1/requests/health
  requests: {
    url: process.env.REQUESTS_SERVICE_URL || 'http://localhost:3006',
    timeout: 15000,
    healthEndpoint: '/api/v1/requests/health',
  },
  // prefix: api/v1  |  @Controller('quotes')  |  health at /api/v1/quotes/health
  quotes: {
    url: process.env.QUOTES_SERVICE_URL || 'http://localhost:3007',
    timeout: Number(process.env.QUOTES_SERVICE_TIMEOUT_MS || 60_000),
    healthEndpoint: '/api/v1/quotes/health',
  },
  // prefix: api/v1  |  @Controller('projects')  |  health at /api/v1/projects/health
  projects: {
    url: process.env.PROJECTS_SERVICE_URL || 'http://localhost:3008',
    timeout: 15000,
    healthEndpoint: '/api/v1/projects/health',
  },
  // prefix: api + URI v1  |  @Controller('progress')  |  health at /api/v1/progress/health
  progress: {
    url: process.env.PROGRESS_SERVICE_URL || 'http://localhost:3009',
    timeout: 15000,
    healthEndpoint: '/api/v1/progress/health',
  },
  // prefix: api + URI v1  |  @Controller('messages') + @Controller('conversations')
  messaging: {
    url: process.env.MESSAGING_SERVICE_URL || 'http://localhost:3010',
    timeout: 15000,
    healthEndpoint: '/api/v1/messages/health',
  },
  // prefix: api/v1  |  @Controller()  |  health at /api/v1/health
  notifications: {
    url: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3011',
    timeout: Number(process.env.NOTIFICATIONS_SERVICE_TIMEOUT_MS || 15_000),
    healthEndpoint: '/api/v1/health',
  },
  // prefix: api/v1  |  @Controller()  |  health at /api/v1/health
  media: {
    url: process.env.MEDIA_SERVICE_URL || 'http://localhost:3012',
    timeout: 30000,
    healthEndpoint: '/api/v1/health',
  },
  // prefix: api + URI v1  |  @Controller('portfolio')  |  health at /api/v1/portfolio/health
  portfolio: {
    url: process.env.PORTFOLIO_SERVICE_URL || 'http://localhost:3013',
    timeout: 15000,
    healthEndpoint: '/api/v1/portfolio/health',
  },
  // prefix: api + URI v1  |  @Controller('posts')  |  health at /api/v1/posts/health
  blog: {
    url: process.env.BLOG_SERVICE_URL || 'http://localhost:3014',
    timeout: 15000,
    healthEndpoint: '/api/v1/posts/health',
  },
  // prefix: api/v1  |  @Controller('contact')  |  health at /api/v1/contact/health
  contact: {
    url: process.env.CONTACT_SERVICE_URL || 'http://localhost:3015',
    timeout: Number(process.env.CONTACT_SERVICE_TIMEOUT_MS || 15_000),
    healthEndpoint: '/api/v1/contact/health',
  },
  // prefix: api/v1/health  |  @Controller()  |  health at /api/v1/health
  health: {
    url: process.env.HEALTH_SERVICE_URL || 'http://localhost:3016',
    timeout: Number(process.env.HEALTH_SERVICE_TIMEOUT_MS || 15_000),
    healthEndpoint: '/api/v1/health',
  },
};

/**
 * Get service configuration by name
 */
export function getServiceConfig(serviceName: string): ServiceConfig | undefined {
  return SERVICE_REGISTRY[serviceName];
}

/**
 * Get all registered service names
 */
export function getServiceNames(): string[] {
  return Object.keys(SERVICE_REGISTRY);
}

/**
 * Check if a service is registered
 */
export function isServiceRegistered(serviceName: string): boolean {
  return serviceName in SERVICE_REGISTRY;
}
