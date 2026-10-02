import type { Config } from 'jest';

const config: Config = {
  displayName: 'webhooks-e2e',
  rootDir: '..',
  testRegex: 'e2e/.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^uuid$': '<rootDir>/../../libs/testing/src/uuid.mock.ts',
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
