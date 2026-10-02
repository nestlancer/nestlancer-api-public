import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import * as path from 'path';

const rootDir = path.resolve(__dirname);
// Use require for JSON to avoid TS2732 in some environments
const tsconfig = require('./tsconfig.base.json');

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Dynamic path mapping from tsconfig using absolute path as prefix
  moduleNameMapper: {
    ...pathsToModuleNameMapper(tsconfig.compilerOptions.paths, { prefix: rootDir + '/' }),
    // Specific mock overrides
    '^uuid$': path.join(rootDir, 'libs/testing/src/uuid.mock.ts'),
  },
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: path.join(rootDir, 'tsconfig.test.json'),
        diagnostics: false,
        // Transpile-only mode — skips cross-module type resolution, same as
        // `tsc --transpileOnly`. Dramatically reduces per-suite compile time
        // (from ~70-100s down to ~10-15s per suite). Type safety is enforced
        // separately by the build step's full tsc compilation.
        isolatedModules: true,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  setupFiles: [path.join(rootDir, 'tests/setup/load-env.ts')],
  clearMocks: true,
  restoreMocks: true,
  workerIdleMemoryLimit: '512MB',
  // Prevents jest from hanging after tests finish due to leaked handles/timers.
  // Without this, jest waits ~5-10s before force-killing each hanging worker.
  forceExit: true,
};

export default config;
