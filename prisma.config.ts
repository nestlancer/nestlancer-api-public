import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bash seed/seed.sh --env=dev --phase=core,content --skip-export',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
