#!/usr/bin/env node
/**
 * Apply Prisma SQL migrations without the Prisma CLI (workaround when `prisma migrate` fails).
 * Usage: DATABASE_URL=... node scripts/db/apply-pending-migrations.js
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const ROOT = path.resolve(__dirname, '../..');
const MIGRATIONS_DIR = path.join(ROOT, 'prisma', 'migrations');

async function main() {
  const databaseUrl =
    process.env.MIGRATION_DATABASE_URL ||
    process.env.DATABASE_MIGRATE_URL ||
    process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('MIGRATION_DATABASE_URL, DATABASE_MIGRATE_URL, or DATABASE_URL is required');
    process.exit(1);
  }

  const sanitizedUrl = databaseUrl.replace(/([?&])sslmode=[^&]*/g, '$1').replace(/\?&/, '?').replace(/\?$/, '');
  const useSsl = /sslmode=(?!disable)/i.test(databaseUrl);
  const pool = new Pool({
    connectionString: sanitizedUrl,
    ...(useSsl ? { ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' } } : {}),
  });
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        id VARCHAR(36) PRIMARY KEY,
        checksum VARCHAR(64) NOT NULL,
        finished_at TIMESTAMPTZ,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        logs TEXT,
        rolled_back_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      );
    `);

    const dirs = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    for (const dir of dirs) {
      const sqlPath = path.join(MIGRATIONS_DIR, dir, 'migration.sql');
      if (!fs.existsSync(sqlPath)) continue;

      const existing = await client.query(
        `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL`,
        [dir],
      );
      if (existing.rowCount > 0) {
        console.log(`skip ${dir} (already applied)`);
        continue;
      }

      const sql = fs
        .readFileSync(sqlPath, 'utf8')
        .replace(/CREATE SCHEMA IF NOT EXISTS "public";\s*/gi, '');
      console.log(`apply ${dir}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count)
           VALUES ($1, $2, $3, now(), 1)`,
          [crypto.randomUUID(), 'manual', dir],
        );
        await client.query('COMMIT');
        console.log(`ok ${dir}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('All pending migrations applied.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
