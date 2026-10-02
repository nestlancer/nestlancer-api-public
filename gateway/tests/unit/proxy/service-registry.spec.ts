import {
  getServiceConfig,
  getServiceNames,
  isServiceRegistered,
  SERVICE_REGISTRY,
} from '../../../src/proxy/service-registry';

describe('ServiceRegistry', () => {
  describe('getServiceConfig', () => {
    it('should return config for a registered service', () => {
      const config = getServiceConfig('auth');
      expect(config).toBeDefined();
      expect(config?.url).toBe(process.env.AUTH_SERVICE_URL || 'http://localhost:3001');
      expect(config?.timeout).toBe(15000);
      expect(config?.healthEndpoint).toBe('/api/v1/auth/health');
    });

    it('should return undefined for an unregistered service', () => {
      const config = getServiceConfig('non-existent');
      expect(config).toBeUndefined();
    });
  });

  describe('getServiceNames', () => {
    it('should return all registered service names', () => {
      const names = getServiceNames();
      const expectedNames = [
        'auth',
        'users',
        'payments',
        'webhooks',
        'admin',
        'requests',
        'quotes',
        'projects',
        'progress',
        'messaging',
        'notifications',
        'media',
        'portfolio',
        'blog',
        'contact',
        'health',
      ];
      expect(names).toEqual(expectedNames);
      expect(Object.keys(SERVICE_REGISTRY)).toEqual(expectedNames);
    });
  });

  describe('isServiceRegistered', () => {
    it('should return true for a registered service', () => {
      expect(isServiceRegistered('auth')).toBe(true);
      expect(isServiceRegistered('users')).toBe(true);
    });

    it('should return false for an unregistered service', () => {
      expect(isServiceRegistered('non-existent')).toBe(false);
    });
  });
});
