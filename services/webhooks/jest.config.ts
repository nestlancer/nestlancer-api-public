import type { Config } from 'jest';
import baseConfig from '../../jest.config.base';

const config: Config = {
  ...baseConfig,
  displayName: 'webhooks',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.spec.ts'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
};

export default config;
