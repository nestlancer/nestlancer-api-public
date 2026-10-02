import type { Config } from 'jest';
import baseConfig from './jest.config';

const config: Config = {
  ...baseConfig,
  testMatch: ['**/*.int.spec.ts', '**/*.integration.spec.ts'],
  // Integration tests might need longer timeout
  testTimeout: 30000,
};

export default config;
