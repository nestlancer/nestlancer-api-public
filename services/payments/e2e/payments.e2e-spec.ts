import request from 'supertest';
import { createTestJwt } from '../../../libs/testing/src/helpers/test-auth.helper';
import { setupApp, teardownApp, getApp, getGlobalPrefix, E2E_USER_ID, E2E_ADMIN_ID } from './setup';

const prefix = getGlobalPrefix();

function basePath() {
  return getApp().getHttpServer();
}

function authHeader(userId: string, role = 'USER') {
  const token = createTestJwt(
    { sub: userId, email: `${userId}@test.com`, role },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

describe('Payments Service - User & Admin Endpoints (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('User payments', () => {
    it('GET /payments without token returns 401', async () => {
      const res = await request(basePath()).get(`/${prefix}/payments`).expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /payments with valid token returns 200 and list shape (items and meta)', async () => {
      const res = await request(basePath())
        .get(`/${prefix}/payments`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.items)).toBe(true);
      expect(res.body?.meta).toBeDefined();
      expect(typeof res.body?.meta?.total).toBe('number');
      expect(typeof res.body?.meta?.page).toBe('number');
      expect(typeof res.body?.meta?.limit).toBe('number');
    });

    it('GET /payments/stats with valid token returns 200 and data', async () => {
      const res = await request(basePath())
        .get(`/${prefix}/payments/stats`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data).toBeDefined();
    });
  });

  describe('Admin payments', () => {
    it('GET /admin/payments without token returns 401', async () => {
      const res = await request(basePath()).get(`/${prefix}/admin/payments`).expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /admin/payments with USER role token returns 403', async () => {
      const res = await request(basePath())
        .get(`/${prefix}/admin/payments`)
        .set(authHeader(E2E_USER_ID, 'USER'))
        .expect(403);
      expect(res.body?.status).toBe('error');
    });

    it('GET /admin/payments with ADMIN role returns 200 and list shape', async () => {
      const res = await request(basePath())
        .get(`/${prefix}/admin/payments`)
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.items)).toBe(true);
      expect(res.body?.meta).toBeDefined();
    });

    it('GET /admin/payments/stats with ADMIN role returns 200 and data', async () => {
      const res = await request(basePath())
        .get(`/${prefix}/admin/payments/stats`)
        .set(authHeader(E2E_ADMIN_ID, 'ADMIN'))
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data).toBeDefined();
    });
  });
});
