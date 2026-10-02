import request from 'supertest';
import { setupApp, teardownApp, getApp, getBasePath } from './setup';

/**
 * Rate limiting E2E: verifies gateway responds to health without rate limit rejection.
 * If rate limiting is added to the gateway later, add tests that assert 429 after N requests.
 */
describe('Gateway - Rate Limiting (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET /api/v1/health returns 200 and healthy status', async () => {
      const prefix = getBasePath();
      const res = await request(getApp().getHttpServer()).get(`${prefix}/health`).expect(200);
      expect(res.body?.data?.status).toBe('healthy');
    });
  });

  describe('Rate limit behavior', () => {
    it('multiple GET /api/v1/health requests all return 200 with healthy body', async () => {
      const prefix = getBasePath();
      const server = getApp().getHttpServer();
      const requests = Array.from({ length: 5 }, () => request(server).get(`${prefix}/health`));
      const results = await Promise.all(requests);
      results.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body?.data?.status).toBe('healthy');
      });
    });
  });
});
