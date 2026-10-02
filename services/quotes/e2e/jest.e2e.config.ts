import type { Config } from 'jest';

const config: Config = {
  displayName: 'quotes-e2e',
  rootDir: '..',
  testRegex: 'e2e/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  // Allow transforming ESM-only uuid so we use the real lib (pnpm nests at .pnpm/uuid@x/node_modules/uuid)
  transformIgnorePatterns: ['/node_modules/(?!.*uuid)'],
  moduleNameMapper: {
    // Use a deterministic uuid mock for ESM-only uuid in E2E, per 602 (mocks for determinism).
    '^uuid$': '<rootDir>/e2e/__mocks__/uuid.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30_000,
  maxWorkers: 1,
  forceExit: true,
  verbose: true,
};

export default config;
