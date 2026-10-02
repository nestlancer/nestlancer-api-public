import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI config. Runtime apps use libs/database with DATABASE_URL.
 * Never hardcode credentials here — export DATABASE_URL (or Infisical) first.
 */
const databaseUrl = process.env.DATABASE_URL ?? process.env.MIGRATION_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL (or MIGRATION_DATABASE_URL) is required for Prisma CLI. Export via Infisical or your local .env.',
  );
}

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bash seed/seed.sh --env=dev --phase=core,content --skip-export',
  },
  datasource: {
    url: databaseUrl,
  },
});
