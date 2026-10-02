import { execFileSync } from 'child_process';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

let prismaClient: PrismaClient | null = null;
let migrationsApplied = false;

/** E2E seeds use DATABASE_URL; PrismaReadService prefers DATABASE_READ_URL from .env.e2e. */
export function alignReadReplicaWithPrimary(): void {
  if (process.env.DATABASE_URL) {
    process.env.DATABASE_READ_URL = process.env.DATABASE_URL;
  }
}

/**
 * Apply SQL migrations via scripts/db/apply-pending-migrations.js (Prisma CLI may be unavailable).
 */
export async function applyTestDatabaseMigrations(): Promise<void> {
  alignReadReplicaWithPrimary();
  if (migrationsApplied) return;

  const scriptPath = path.resolve(__dirname, '../../../../scripts/db/apply-pending-migrations.js');

  try {
    execFileSync(process.execPath, [scriptPath], {
      env: { ...process.env },
      stdio: 'pipe',
    });
    migrationsApplied = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Allow tests to skip when the target DB user cannot CREATE (remote shared e2e DB).
    console.warn(`[test-database] Migration apply failed: ${message}`);
    migrationsApplied = false;
  }
}

/** True when migrations ran successfully in this process. */
export function testMigrationsReady(): boolean {
  return migrationsApplied;
}

/**
 * Set up the test database: connect PrismaClient and run migrations.
 */
export async function setupTestDatabase(): Promise<PrismaClient> {
  alignReadReplicaWithPrimary();
  await applyTestDatabaseMigrations();

  const databaseUrl =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/nestlancer_test';

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);

  prismaClient = new PrismaClient({
    adapter,
    log: ['error'],
  });

  await prismaClient.$connect();
  return prismaClient;
}

/**
 * Tear down the test database: disconnect PrismaClient.
 */
export async function teardownTestDatabase(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}

/**
 * Reset the test database by truncating all tables (preserving schema).
 * Uses raw SQL to truncate all tables in the public schema.
 */
export async function resetTestDatabase(): Promise<void> {
  if (!prismaClient) return;

  const tables = await prismaClient.$queryRawUnsafe<Array<{ table_name: string }>>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name != '_prisma_migrations'
    `);

  const tableNames = tables.map((t) => `"${t.table_name}"`).join(', ');

  if (tableNames.length > 0) {
    await prismaClient.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} CASCADE`);
  }
}

/**
 * Get the current test PrismaClient instance.
 */
export function getTestPrismaClient(): PrismaClient | null {
  return prismaClient;
}
