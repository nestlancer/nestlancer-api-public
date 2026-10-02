import type { Config } from 'jest';
import * as path from 'path';

const rootDir = path.resolve(__dirname, '..');

const config: Config = {
  displayName: 'health-e2e',
  rootDir,
  testRegex: 'e2e/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: path.join(rootDir, 'tsconfig.json') }],
  },
  // Allow transforming ESM-only uuid so we use the real lib (pnpm nests at .pnpm/uuid@x/node_modules/uuid)
  transformIgnorePatterns: ['/node_modules/(?!.*uuid)'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30_000,
  maxWorkers: 1,
  forceExit: true,
  verbose: true,
};

export default config;
