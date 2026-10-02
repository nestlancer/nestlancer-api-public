import type { Config } from 'jest';

const config: Config = {
  displayName: 'blog-e2e',
  rootDir: '..',
  testRegex: 'e2e/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  // Use deterministic UUID mock for ESM-only uuid in E2E, per 602 (mocks for determinism / avoid Jest ESM issues).
  transformIgnorePatterns: ['/node_modules/(?!.*uuid)'],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/../../libs/testing/src/uuid.mock.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30_000,
  maxWorkers: 1,
  forceExit: true,
  verbose: true,
};

export default config;
