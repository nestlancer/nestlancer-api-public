import type { Config } from 'jest';

const config: Config = {
  projects: [
    '<rootDir>/libs/*/jest.config.ts',
    '<rootDir>/services/*/jest.config.ts',
    '<rootDir>/workers/*/jest.config.ts',
    '<rootDir>/gateway/jest.config.ts',
    '<rootDir>/ws-gateway/jest.config.ts',
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/*.interface.ts',
    '!**/*.type.ts',
    '!**/*.enum.ts',
    '!**/*.dto.ts',
    '!**/*.constants.ts',
    '!**/*.d.ts',
    '!**/index.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/prisma/**',
    '!**/libs/testing/**',
    '!**/*.config.ts',
    '!**/*.config.js',
  ],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  detectOpenHandles: true,
  forceExit: true,
  verbose: true,
};

export default config;
