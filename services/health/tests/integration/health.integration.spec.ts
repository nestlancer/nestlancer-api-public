import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AllExceptionsFilter, TransformResponseInterceptor } from '@nestlancer/common';
import { createTestJwt } from '@nestlancer/testing/helpers/test-auth.helper';

import { DatabaseHealthService } from '../../src/services/database-health.service';
import { CacheHealthService } from '../../src/services/cache-health.service';
import { QueueHealthService } from '../../src/services/queue-health.service';
import { StorageHealthService } from '../../src/services/storage-health.service';
import { ExternalServicesHealthService } from '../../src/services/external-services-health.service';
import { WorkersHealthService } from '../../src/services/workers-health.service';
import { WebsocketHealthService } from '../../src/services/websocket-health.service';
import { SystemMetricsService } from '../../src/services/system-metrics.service';
import { FeatureFlagsHealthService } from '../../src/services/feature-flags-health.service';
import { ServiceRegistryHealthService } from '../../src/services/service-registry-health.service';

function loadDevEnv() {
  const envPath = resolve(__dirname, '../../../../.env.development');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...value] = trimmed.split('=');
      if (key) {
        process.env[key.trim()] = value
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  });
}

describe('Health Service (Integration)', () => {
  let app: INestApplication;

  // Spies/Mocks
  const dbMock = {
    check: jest.fn().mockResolvedValue({ status: 'healthy', responseTime: 10, details: {} }),
  };
  const cacheMock = {
    check: jest.fn().mockResolvedValue({ status: 'healthy', responseTime: 5, details: {} }),
  };
  const queueMock = {
    check: jest.fn().mockResolvedValue({ status: 'healthy', responseTime: 12, details: {} }),
  };
  const storageMock = {
    check: jest.fn().mockResolvedValue({ status: 'healthy', responseTime: 20, details: {} }),
  };
  const externalMock = {
    check: jest.fn().mockResolvedValue({ status: 'healthy', responseTime: 15, details: {} }),
  };
  const workersMock = {
    check: jest.fn().mockResolvedValue({ status: 'healthy', responseTime: 8, details: {} }),
  };
  const wsMock = {
    check: jest.fn().mockResolvedValue({ status: 'healthy', responseTime: 2, details: {} }),
  };
  const registryMock = {
    check: jest.fn().mockResolvedValue({ status: 'healthy', responseTime: 4, details: {} }),
  };
  const featureMock = {
    check: jest.fn().mockResolvedValue({ status: 'success', flags: { newUI: true } }),
  };
  const metricsMock = {
    getMetrics: jest
      .fn()
      .mockReturnValue({ cpu: { usage: 10 }, memory: { used: 100 }, process: {}, disk: {} }),
  };

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL ||= 'postgresql://127.0.0.1:5432/postgres';
    process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-12345';
    process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-12345';
    process.env.REDIS_CACHE_URL ||= 'redis://127.0.0.1:6379';

    const { AppModule } = await import('../../src/app.module');

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseHealthService)
      .useValue(dbMock)
      .overrideProvider(CacheHealthService)
      .useValue(cacheMock)
      .overrideProvider(QueueHealthService)
      .useValue(queueMock)
      .overrideProvider(StorageHealthService)
      .useValue(storageMock)
      .overrideProvider(ExternalServicesHealthService)
      .useValue(externalMock)
      .overrideProvider(WorkersHealthService)
      .useValue(workersMock)
      .overrideProvider(WebsocketHealthService)
      .useValue(wsMock)
      .overrideProvider(ServiceRegistryHealthService)
      .useValue(registryMock)
      .overrideProvider(FeatureFlagsHealthService)
      .useValue(featureMock)
      .overrideProvider(SystemMetricsService)
      .useValue(metricsMock)
      .compile();

    app = moduleRef.createNestApplication();

    app.setGlobalPrefix('api/v1/health');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Public Endpoints', () => {
    describe('GET /api/v1/health (Aggregated Health)', () => {
      it('should return 200 OK and aggregated status when all services are healthy', async () => {
        dbMock.check.mockResolvedValueOnce({ status: 'healthy', responseTime: 10 });
        cacheMock.check.mockResolvedValueOnce({ status: 'healthy', responseTime: 5 });

        const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

        expect(response.body.status).toBe('healthy');
        expect(response.body.services).toBeDefined();
        expect(response.body.services.database.status).toBe('healthy');
        expect(response.body.services.cache.status).toBe('healthy');
        expect(response.body.checks).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      });

      it('should return 503 SERVICE UNAVAILABLE when critical service (db) is unhealthy', async () => {
        dbMock.check.mockResolvedValueOnce({ status: 'unhealthy', responseTime: 50 });
        cacheMock.check.mockResolvedValueOnce({ status: 'healthy', responseTime: 5 });

        const response = await request(app.getHttpServer()).get('/api/v1/health').expect(503);

        expect(response.body.status).toBe('unhealthy');
        expect(response.body.services.database.status).toBe('unhealthy');
      });
    });

    describe('GET /api/v1/health/detailed', () => {
      it('should return 200 OK with detailed flag and all service entries when healthy', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/health/detailed')
          .expect(200);

        expect(response.body.status).toBe('healthy');
        expect(response.body.detailed).toBe(true);
        expect(response.body.services).toBeDefined();
        expect(response.body.services.database).toBeDefined();
        expect(response.body.services.cache).toBeDefined();
        expect(response.body.services.queue).toBeDefined();
      });
    });

    describe('GET /api/v1/health/ready', () => {
      it('should return 200 OK when ready', async () => {
        const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);

        expect(response.body.status).toBe('ready');
      });

      it('should return 503 when not ready (e.g., db unhealthy)', async () => {
        dbMock.check.mockResolvedValueOnce({ status: 'unhealthy' });
        const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503);

        expect(response.body.status).toBe('not_ready');
      });
    });

    describe('GET /api/v1/health/live', () => {
      it('should return 200 OK', async () => {
        const response = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.status).toBe('alive');
      });
    });

    describe('HEAD /api/v1/health/ping', () => {
      it('should return 200 OK for minimal connectivity check', async () => {
        const res = await request(app.getHttpServer()).head('/api/v1/health/ping');
        expect(res.status).toBe(200);
      });
    });

    describe('Individual Services', () => {
      const services = [
        { path: 'database', mock: dbMock },
        { path: 'cache', mock: cacheMock },
        { path: 'queue', mock: queueMock },
        { path: 'storage', mock: storageMock },
        { path: 'external', mock: externalMock },
        { path: 'workers', mock: workersMock },
        { path: 'websocket', mock: wsMock },
        { path: 'registry', mock: registryMock },
      ];

      for (const service of services) {
        describe(`GET /api/v1/health/${service.path}`, () => {
          it('should return 200 OK when healthy', async () => {
            service.mock.check.mockResolvedValueOnce({ status: 'healthy' });
            const response = await request(app.getHttpServer())
              .get(`/api/v1/health/${service.path}`)
              .expect(200);
            expect(response.body.status).toBe('healthy');
          });

          it('should return 503 SERVICE UNAVAILABLE when unhealthy', async () => {
            service.mock.check.mockResolvedValueOnce({ status: 'unhealthy' });
            const response = await request(app.getHttpServer())
              .get(`/api/v1/health/${service.path}`)
              .expect(503);
            expect(response.body.status).toBe('unhealthy');
          });
        });
      }
    });

    describe('GET /api/v1/health/system', () => {
      it('should return 200 OK with mocked metrics', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/health/system')
          .expect(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.cpu.usage).toBe(10);
      });
    });

    describe('GET /api/v1/health/features', () => {
      it('should return 200 OK with mocked features', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/health/features')
          .expect(200);
        expect(response.body.status).toBe('success');
        expect(response.body.flags.newUI).toBe(true);
      });
    });
  });

  describe('Admin Debug (Authenticated)', () => {
    it('GET /api/v1/health/debug (Anonymous should fail)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health/debug');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/health/debug (Admin should succeed and use mocked data)', async () => {
      const adminToken = createTestJwt(
        { sub: 'admin-1', email: 'admin@nestlancer.com', role: 'ADMIN' },
        { secret: process.env.JWT_ACCESS_SECRET },
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/health/debug')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.dependencies.database.connected).toBe(true);
      expect(response.body.data.featureFlags.newUI).toBe(true);
    });

    it('GET /api/v1/health/debug (User should fail)', async () => {
      const userToken = createTestJwt(
        { sub: 'user-1', email: 'user@nestlancer.com', role: 'USER' },
        { secret: process.env.JWT_ACCESS_SECRET },
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/health/debug')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });
});
