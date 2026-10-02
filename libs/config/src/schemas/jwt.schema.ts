import { z } from 'zod';
export const jwtConfigSchema = z.object({
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  JWT_ALGORITHM: z.enum(['HS256', 'RS256']).default('HS256'),
});
