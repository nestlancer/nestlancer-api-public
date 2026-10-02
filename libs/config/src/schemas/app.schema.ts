import { z } from 'zod';

export const appConfigSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test', 'staging', 'e2e'])
      .default('development'),
    PORT: z.coerce.number().default(3000),
    GATEWAY_PORT: z.coerce.number().default(3000),
    APP_NAME: z.string().default('Nestlancer'),
    API_VERSION: z.string().default('v1'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
    LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),
    LOG_OUTPUT: z.enum(['console', 'file']).default('console'),
    LOG_FILE_PATH: z.string().optional(),
    CORRELATION_ID_HEADER: z.string().default('X-Request-ID'),
    FRONTEND_URL: z.string().default('http://localhost:3000'),

    // Database
    DATABASE_URL: z.string(),
    DATABASE_READ_URL: z.string().optional(),

    // Redis
    REDIS_CACHE_URL: z.string().optional(),
    REDIS_PUBSUB_URL: z.string().optional(),

    // RabbitMQ
    RABBITMQ_URL: z.string().optional(),

    // Auth
    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),

    // CORS
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
  })
  .passthrough();

export type AppConfig = z.infer<typeof appConfigSchema>;
