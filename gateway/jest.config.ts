import type { Config } from 'jest';
import baseConfig from '../jest.config.base';

const config: Config = {
  ...baseConfig,
  displayName: 'gateway',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.spec.ts'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
};

export default config;
