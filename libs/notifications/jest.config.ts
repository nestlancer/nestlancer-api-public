import baseConfig from '../../jest.config.base';

export default {
  ...baseConfig,
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.spec.ts'],
};
