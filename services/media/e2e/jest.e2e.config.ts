import type { Config } from 'jest';

const config: Config = {
  displayName: 'media-e2e',
  rootDir: '..',
  testRegex: 'e2e/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  transformIgnorePatterns: ['/node_modules/(?!.*uuid)'],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/e2e/__mocks__/uuid.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30_000,
  maxWorkers: 1,
  forceExit: true,
  verbose: true,
};

export default config;
