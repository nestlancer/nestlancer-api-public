import { z } from 'zod';

export const rateLimitConfigSchema = z.object({
  RATE_LIMIT_ANONYMOUS: z.coerce.number().default(100),
  RATE_LIMIT_ANONYMOUS_BURST: z.coerce.number().default(10),
  RATE_LIMIT_USER: z.coerce.number().default(1000),
  RATE_LIMIT_USER_BURST: z.coerce.number().default(30),
  RATE_LIMIT_PAID: z.coerce.number().default(5000),
  RATE_LIMIT_PAID_BURST: z.coerce.number().default(100),
  RATE_LIMIT_ADMIN: z.coerce.number().default(10000),
  RATE_LIMIT_ADMIN_BURST: z.coerce.number().default(200),
  RATE_LIMIT_WEBHOOK: z.coerce.number().default(5000),
});

export type RateLimitConfig = z.infer<typeof rateLimitConfigSchema>;
