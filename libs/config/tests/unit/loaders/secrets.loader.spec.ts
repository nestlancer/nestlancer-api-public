import { loadSecrets } from '../../../src/loaders/secrets.loader';
import { Logger } from '@nestjs/common';

jest.mock('@nestjs/common');

describe('loadSecrets', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load required secrets if they are set in environment', async () => {
    process.env.JWT_ACCESS_SECRET = 'access123';
    process.env.DATABASE_URL = 'postgres://localhost';
    process.env.JWT_REFRESH_SECRET = 'refresh123';

    const secrets = await loadSecrets();

    expect(secrets).toHaveProperty('JWT_ACCESS_SECRET', 'access123');
    expect(secrets).toHaveProperty('DATABASE_URL', 'postgres://localhost');
    expect(secrets).toHaveProperty('JWT_REFRESH_SECRET', 'refresh123');

    expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringContaining('Secrets validated'));
  });

  it('should warn if required secrets are missing', async () => {
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.DATABASE_URL;
    delete process.env.JWT_REFRESH_SECRET;

    const secrets = await loadSecrets();

    expect(secrets).toEqual({});
    expect(Logger.prototype.warn).toHaveBeenCalledWith(
      expect.stringContaining('Required secret JWT_ACCESS_SECRET is not set'),
    );
  });
});
