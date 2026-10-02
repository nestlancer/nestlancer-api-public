import type { Config } from 'jest';

const config: Config = {
  displayName: 'progress-e2e',
  rootDir: '..',
  testRegex: 'e2e/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  // Allow transforming ESM-only uuid so we can use a mock for determinism and avoid Jest ESM issues.
  transformIgnorePatterns: ['/node_modules/(?!.*uuid)'],
  moduleNameMapper: {
    // Use a deterministic uuid mock for ESM-only uuid in E2E, per 602 (mocks for determinism only).
    '^uuid$': '<rootDir>/e2e/__mocks__/uuid.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30_000,
  maxWorkers: 1,
  forceExit: true,
  verbose: true,
};

export default config;
