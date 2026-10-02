import { getCorsConfig } from '../../src/cors.config';

describe('CORS Config', () => {
  it('should return CORS options with provided origins', () => {
    const origins = ['http://localhost:3000', 'https://example.com'];
    const config = getCorsConfig(origins);

    expect(config.origin).toEqual(origins);
    expect(config.methods).toContain('GET');
    expect(config.methods).toContain('OPTIONS');
    expect(config.credentials).toBe(true);
    expect(config.maxAge).toBe(86400);
  });
});
