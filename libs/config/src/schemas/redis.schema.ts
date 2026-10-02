import { z } from 'zod';
export const redisConfigSchema = z.object({
  REDIS_URL: z.string().url(),
  REDIS_PUBSUB_URL: z.string().url().optional(),
  REDIS_MAX_RETRIES: z.coerce.number().default(3),
  REDIS_RETRY_DELAY: z.coerce.number().default(1000),
});
