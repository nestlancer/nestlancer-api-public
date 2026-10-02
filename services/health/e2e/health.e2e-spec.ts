import request from 'supertest';
import { setupApp, teardownApp, getApp, getGlobalPrefix } from './setup';

const prefix = getGlobalPrefix();

describe('Health Service - Public endpoints (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET /live returns 200 and confirms process is alive', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/live`);
      expect(res.status).toBe(200);
      const payload = res.body?.data ?? res.body;
      expect(payload).toMatchObject({ status: 'alive' });
      expect(typeof payload.uptime).toBe('number');
    });

    it('HEAD /ping returns 200', async () => {
      const res = await request(getApp().getHttpServer()).head(`/${prefix}/ping`);
      expect(res.status).toBe(200);
    });
  });

  describe('Aggregated and readiness', () => {
    it('GET / returns 503 and aggregated health when dependencies are unhealthy', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/`);
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unhealthy');
      expect(res.body).toHaveProperty('services');
      expect(res.body).toHaveProperty('checks');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('environment');
    });

    it('GET /detailed returns 503 and detailed health with detailed flag', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/detailed`);
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unhealthy');
      expect(res.body.detailed).toBe(true);
      expect(res.body).toHaveProperty('services');
      expect(res.body).toHaveProperty('checks');
    });

    it('GET /ready returns 503 and not_ready when dependencies fail', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/ready`);
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('not_ready');
      expect(res.body).toHaveProperty('checks');
      expect(res.body.checks).toMatchObject({
        database: false,
        cache: false,
        queue: false,
      });
    });
  });

  describe('Component health endpoints', () => {
    it('GET /database returns 503 and status when unhealthy', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/database`);
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unhealthy');
      expect(res.body).toHaveProperty('responseTime');
    });

    it('GET /cache returns 503 and status when unhealthy', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/cache`);
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unhealthy');
    });

    it('GET /queue returns 503 and status when unhealthy', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/queue`);
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unhealthy');
    });

    it('GET /storage returns 503 and status when unhealthy', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/storage`);
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unhealthy');
    });

    it('GET /external returns 503 and status when unhealthy', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/external`);
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unhealthy');
    });

    it('GET /workers returns 200 with status in body (even when degraded)', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/workers`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBeDefined();
    });

    it('GET /websocket returns 503 and status when unhealthy', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/websocket`);
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unhealthy');
    });

    it('GET /registry returns 503 and status when unhealthy', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/registry`);
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('unhealthy');
    });
  });

  describe('Metrics and features', () => {
    it('GET /microservices returns 200 and inter-service health overview', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/microservices`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      // Response may be wrapped in { data } by interceptor; top-level or data must have status
      const payload = res.body?.data ?? res.body;
      expect(payload.status).toBe('healthy');
    });

    it('GET /system returns 200 and system metrics shape', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/system`);
      expect(res.status).toBe(200);
      const payload = res.body?.data ?? res.body;
      expect(payload.status).toBe('healthy');
      expect(payload).toHaveProperty('memory');
      expect(payload).toHaveProperty('cpu');
      expect(payload).toHaveProperty('disk');
      expect(payload).toHaveProperty('process');
    });

    it('GET /features returns 200 and feature flags health shape', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/features`);
      expect(res.status).toBe(200);
      const payload = res.body?.data ?? res.body;
      expect(payload).toHaveProperty('status');
      expect(payload).toHaveProperty('flags');
    });
  });
});

describe('Health Service - Admin Debug (E2E)', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    await setupApp();
    const { createTestJwt } = await import('../../../libs/testing/src/helpers/test-auth.helper');
    const secret = process.env.JWT_ACCESS_SECRET || 'test-secret-key-for-testing-only-32char';
    adminToken = createTestJwt(
      { sub: 'health-e2e-admin-1', email: 'admin@test.com', role: 'ADMIN' },
      { secret },
    );
    userToken = createTestJwt(
      { sub: 'health-e2e-user-1', email: 'user@test.com', role: 'USER' },
      { secret },
    );
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('GET /debug without token returns 401', async () => {
    const res = await request(getApp().getHttpServer()).get(`/${prefix}/debug`);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('message');
  });

  it('GET /debug with USER role returns 403', async () => {
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/debug`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('message');
  });

  it('GET /debug with ADMIN role returns 200 and debug body shape', async () => {
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/debug`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const data = res.body?.data ?? res.body;
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('server');
    expect(data.server).toHaveProperty('hostname');
    expect(data.server).toHaveProperty('platform');
    expect(data.server).toHaveProperty('nodeVersion');
    expect(data).toHaveProperty('process');
    expect(data).toHaveProperty('dependencies');
    expect(data.dependencies).toHaveProperty('database');
    expect(data.dependencies).toHaveProperty('cache');
    expect(data.dependencies).toHaveProperty('queue');
    expect(data).toHaveProperty('featureFlags');
  });
});
