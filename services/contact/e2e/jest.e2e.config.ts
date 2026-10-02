import type { Config } from 'jest';

const config: Config = {
  displayName: 'contact-e2e',
  rootDir: '..',
  testRegex: 'e2e/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  transformIgnorePatterns: ['/node_modules/(?!.*uuid)'],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/../../libs/testing/src/uuid.mock.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30_000,
  maxWorkers: 1,
  verbose: true,
  forceExit: true,
};

export default config;
