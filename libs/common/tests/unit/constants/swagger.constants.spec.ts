import {
  isPublicDocumentationPath,
  isSwaggerEnabled,
  PUBLIC_DOCUMENTATION_PATH_SEGMENTS,
} from '../../../src/constants/swagger.constants';

describe('swagger.constants', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isPublicDocumentationPath', () => {
    it.each([
      '/docs/',
      '/docs/swagger-ui-bundle.js',
      '/api/v1/docs-specs/messaging',
      '/docs-gateway-json',
      'http://ignored/docs-json?x=1',
    ])('returns true for %s', (path) => {
      expect(isPublicDocumentationPath(path)).toBe(true);
    });

    it.each(['/api/v1/auth/login', '/api/v1/users/me', '/health/live'])(
      'returns false for %s',
      (path) => {
        expect(isPublicDocumentationPath(path)).toBe(false);
      },
    );

    it('covers all documented path segments', () => {
      for (const segment of PUBLIC_DOCUMENTATION_PATH_SEGMENTS) {
        expect(isPublicDocumentationPath(`/prefix${segment}/suffix`)).toBe(true);
      }
    });
  });

  describe('isSwaggerEnabled', () => {
    it('is enabled in development when unset', () => {
      delete process.env.SWAGGER_ENABLED;
      process.env.NODE_ENV = 'development';
      expect(isSwaggerEnabled()).toBe(true);
    });

    it('is disabled in production when unset', () => {
      delete process.env.SWAGGER_ENABLED;
      process.env.NODE_ENV = 'production';
      expect(isSwaggerEnabled()).toBe(false);
    });

    it('respects SWAGGER_ENABLED=true in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.SWAGGER_ENABLED = 'true';
      expect(isSwaggerEnabled()).toBe(true);
    });

    it('respects SWAGGER_ENABLED=false in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.SWAGGER_ENABLED = 'false';
      expect(isSwaggerEnabled()).toBe(false);
    });
  });
});
