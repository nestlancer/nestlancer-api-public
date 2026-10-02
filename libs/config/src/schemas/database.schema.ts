import { z } from 'zod';
export const databaseConfigSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_READ_URL: z.string().url().optional(),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),
  DATABASE_QUERY_TIMEOUT: z.coerce.number().default(5000),
});
