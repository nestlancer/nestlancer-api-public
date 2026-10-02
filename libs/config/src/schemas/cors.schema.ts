import { z } from 'zod';

export const corsConfigSchema = z.object({
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  CORS_MAX_AGE: z.coerce.number().default(86400),
});

export type CorsConfig = z.infer<typeof corsConfigSchema>;
