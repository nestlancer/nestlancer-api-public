import { loadEnvConfig } from '../../../src/loaders/env.loader';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

describe('loadEnvConfig', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    (path.resolve as jest.Mock).mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should return empty object if no env file exists', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const config = loadEnvConfig();
    expect(config).toEqual({});
  });

  it('should load config from environment specific file if it exists', () => {
    (fs.existsSync as jest.Mock).mockImplementation((file) => file.includes('.env.test'));
    (fs.readFileSync as jest.Mock).mockReturnValue('KEY1=value1\nKEY2=value2');

    const config = loadEnvConfig();

    expect(config).toEqual({ KEY1: 'value1', KEY2: 'value2' });
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('.env.test'), 'utf-8');
  });

  it('should fallback to .env if environment specific file does not exist', () => {
    (fs.existsSync as jest.Mock).mockImplementation((file) => file.endsWith('.env'));
    (fs.readFileSync as jest.Mock).mockReturnValue('FALLBACK=true');

    const config = loadEnvConfig();

    expect(config).toEqual({ FALLBACK: 'true' });
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('.env'), 'utf-8');
  });

  it('should ignore empty lines and comments', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const fileContent = `
# This is a comment
VALID=config

# Another comment
ALSO=valid
`;
    (fs.readFileSync as jest.Mock).mockReturnValue(fileContent);

    const config = loadEnvConfig();
    expect(config).toEqual({ VALID: 'config', ALSO: 'valid' });
  });

  it('should trim whitespace and remove surrounding quotes', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(' QUOTED = "value" \n SINGLE = \'value\' ');

    const config = loadEnvConfig();
    expect(config).toEqual({ QUOTED: 'value', SINGLE: 'value' });
  });
});
