/**
 * System E2E environment loader — used as a Jest `setupFiles` entry.
 *
 * Runs in every test worker before the test framework is installed, so we can
 * only use CommonJS require, not top-level await or Jest globals.
 *
 * Priority order:
 *   1. Environment variables already set in the shell (CI secrets, docker-compose env).
 *   2. `.env.e2e` at the repo root.
 *
 * Fails fast with an actionable message when any required variable is absent so
 * developers see "Missing env var X" instead of an obscure connection error.
 */

import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

// Force e2e mode before NestJS config libs boot (they read NODE_ENV).
process.env.NODE_ENV = 'e2e';

const envPath = path.resolve(__dirname, '../../../.env.e2e');
const result = dotenv.config({ path: envPath, override: false });

if (result.error) {
  // Not fatal — values might already be exported in the shell.
  process.stderr.write(
    `[system-e2e] Warning: could not load ${envPath}: ${result.error.message}\n`,
  );
}

// ── Required variables ──────────────────────────────────────────────────────
// Keep this list minimal: only vars that ALL system tests share.
// Per-test optional deps (e.g. WS_PORT) are handled inside individual specs.
const REQUIRED: string[] = ['DATABASE_URL', 'REDIS_CACHE_URL', 'RABBITMQ_URL', 'JWT_ACCESS_SECRET'];

const missing = REQUIRED.filter((v) => !process.env[v]);

if (missing.length > 0) {
  const hint = [
    '',
    '  Ensure one of the following:',
    `    • ${envPath} exists with all required keys, OR`,
    '    • Variables are exported in the shell before running pnpm test:system',
    '',
    '  Required variables:',
    ...REQUIRED.map((v) => `    ${v}${process.env[v] ? ' ✓' : ' ✗ MISSING'}`),
    '',
  ].join('\n');

  throw new Error(
    `[system-e2e] Missing required environment variables: ${missing.join(', ')}\n${hint}`,
  );
}
