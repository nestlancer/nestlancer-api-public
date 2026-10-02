/**
 * Jest configuration for all cross-cutting system tests (smoke + e2e).
 *
 * Test layout
 * ───────────
 *   tests/system/
 *   ├── smoke/
 *   │   ├── infra/        Platform wiring + gateway routing
 *   │   ├── services/     Per-service reachability & auth-enforcement checks
 *   │   └── workers/      Worker topology / queue-binding checks
 *   ├── e2e/
 *   │   ├── services/     Full CRUD + business-flow tests per service
 *   │   └── workers/      End-to-end message publishing + consumer verification
 *   └── setup/            Shared helpers (auth tokens, HTTP utils, env loading)
 *
 * Targeting subsets (via --testPathPattern):
 *   pnpm test:system                → all tests
 *   pnpm test:system:smoke          → only smoke tests
 *   pnpm test:system:e2e            → only e2e tests
 *   pnpm test:system:infra          → smoke/infra tests only
 *   pnpm test:system:workers        → worker tests only (smoke + e2e)
 *   pnpm test:system:services       → all service tests (smoke + e2e)
 *   pnpm test:system -- --testPathPattern=e2e/services/auth     → one service e2e
 *   pnpm test:system -- --testPathPattern=smoke/services/auth   → one service smoke
 *
 * Intentionally separate from per-package jest.e2e.config.ts files so that
 * per-package E2E suites (`pnpm test:e2e`) are unaffected.
 *
 * Module path aliases mirror `tsconfig.base.json` so imports such as
 * `@nestlancer/testing` resolve correctly when running from the repo root.
 */

import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import * as path from 'path';

// Use require so this file compiles without importing tsconfig.base.json as a TS module.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tsconfigBase = require('../../tsconfig.base.json');

const rootDir = path.resolve(__dirname, '../..');

const config: Config = {
  displayName: 'system-e2e',

  // All paths are relative to the monorepo root so `@nestlancer/*` aliases resolve.
  rootDir,

  // Match both smoke spec files and full e2e spec files.
  testMatch: [
    '<rootDir>/tests/system/**/*.smoke.spec.ts',
    '<rootDir>/tests/system/**/*.e2e.spec.ts',
  ],

  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // Relaxed tsconfig: allows unused vars in test helpers, no strict null checks.
        tsconfig: path.join(rootDir, 'tsconfig.test.json'),
        diagnostics: false,
      },
    ],
  },

  moduleNameMapper: {
    // Map @nestlancer/* aliases defined in tsconfig.base.json → source paths.
    ...pathsToModuleNameMapper(tsconfigBase.compilerOptions.paths, {
      prefix: rootDir + '/',
    }),
    // uuid v7 is an ESM-only package; use the shared mock so ts-jest can load it.
    '^uuid$': path.join(rootDir, 'libs/testing/src/uuid.mock.ts'),
  },

  moduleFileExtensions: ['ts', 'js', 'json', 'node'],

  // Load .env.e2e and validate required vars BEFORE any test code runs.
  // Using setupFiles (not globalSetup) so env vars are present in the test worker.
  setupFiles: [path.join(rootDir, 'tests/system/setup/env.ts')],

  // System tests run sequentially — shared infra state, no parallelism benefit.
  maxWorkers: 1,

  // Generous per-test timeout; the WS smoke has a 10 s internal guard,
  // Postgres/Redis get 8 s — keep this above the longest individual timeout.
  testTimeout: 30_000,

  // Always exit after tests complete (prevents open handle hangs from ioredis,
  // amqplib, or socket.io-client connections not fully torn down).
  forceExit: true,

  verbose: true,

  // No coverage collection — this is a smoke suite, not a coverage run.
  collectCoverage: false,
};

export default config;
