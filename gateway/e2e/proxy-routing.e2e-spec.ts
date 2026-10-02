import request from 'supertest';
import { setupApp, teardownApp, getApp, getBasePath } from './setup';

describe('Gateway - Proxy Routing (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET /api/v1/health returns 200 and a bare gateway health body', async () => {
      const prefix = getBasePath();
      const res = await request(getApp().getHttpServer()).get(`${prefix}/health`).expect(200);
      expect(res.body?.data?.status).toBe('healthy');
      expect(res.body?.data?.uptime).toBeUndefined();
      expect(res.body?.data?.timestamp).toBeDefined();
    });

    it('GET /api/v1/health/live returns 200 and alive status without uptime', async () => {
      const prefix = getBasePath();
      const res = await request(getApp().getHttpServer()).get(`${prefix}/health/live`).expect(200);
      expect(res.body?.data?.status).toBe('alive');
      expect(res.body?.data?.uptime).toBeUndefined();
    });

    it('GET /api/v1/health/ready returns 200 and ready status (mocked downstream healthy)', async () => {
      const prefix = getBasePath();
      const res = await request(getApp().getHttpServer()).get(`${prefix}/health/ready`).expect(200);
      expect(res.body?.data?.status).toBe('ready');
      expect(res.body?.data?.timestamp).toBeDefined();
    });
  });

  describe('Routing (E2E)', () => {
    it('GET unknown route returns 404 and error body', async () => {
      const prefix = getBasePath();
      const res = await request(getApp().getHttpServer())
        .get(`${prefix}/nonexistent-route`)
        .expect(404);
      expect(res.body?.error?.message || res.body?.message).toBeDefined();
    });
  });
});
