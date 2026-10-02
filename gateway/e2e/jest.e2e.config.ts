import type { Config } from 'jest';

const config: Config = {
  displayName: 'gateway-e2e',
  rootDir: '..',
  testRegex: 'e2e/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  // ESM-only uuid: use mock so Jest can load @nestlancer/common without transforming node_modules
  transformIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/../libs/testing/src/uuid.mock.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30_000,
  maxWorkers: 1,
  forceExit: true,
  verbose: true,
};

export default config;
