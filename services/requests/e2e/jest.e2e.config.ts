import type { Config } from 'jest';

const config: Config = {
  displayName: 'requests-e2e',
  rootDir: '..',
  testRegex: 'e2e/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  // Use deterministic UUIDs in E2E by mocking the ESM-only uuid package.
  // This avoids Jest/ts-jest issues with ESM in node_modules and keeps IDs stable for assertions.
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
