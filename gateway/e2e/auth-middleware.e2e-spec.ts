import request from 'supertest';
import { createAuthHeader } from '@nestlancer/testing';
import { setupApp, teardownApp, getApp, getBasePath } from './setup';

describe('Gateway - Auth Middleware (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  const prefix = () => getBasePath();

  describe('Public routes', () => {
    it('GET /api/v1/health does not require auth and returns 200', async () => {
      await request(getApp().getHttpServer()).get(`${prefix()}/health`).expect(200);
    });

    it('POST /api/v1/auth/login does not require auth and returns 200 (mock downstream ok)', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`${prefix()}/auth/login`)
        .send({ email: 'test@example.com', password: 'password' })
        .expect(200);
      expect(res.body?.data?.status).toBe('ok');
    });
  });

  describe('Protected routes - unauthenticated', () => {
    it('GET /api/v1/users/profile without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).get(`${prefix()}/users/profile`);
      expect(res.status).toBe(401);
      expect(res.body?.message || res.body?.error?.message).toBe('Unauthorized');
    });

    it('GET /api/v1/users/profile with invalid token returns 401', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`${prefix()}/users/profile`)
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
      expect(res.body?.message || res.body?.error?.message).toBe('Unauthorized');
    });
  });

  describe('Protected routes - authenticated', () => {
    it('GET /api/v1/users/profile with valid token returns 200 and body', async () => {
      const authHeader = createAuthHeader({ sub: 'user-e2e-1', role: 'USER' });
      const res = await request(getApp().getHttpServer())
        .get(`${prefix()}/users/profile`)
        .set('Authorization', authHeader);
      expect(res.status).toBe(200);
      expect(res.body?.data?.status).toBe('ok');
    });
  });

  describe('Admin routes - authorization', () => {
    it('GET /api/v1/admin/dashboard/overview without token returns 401 and error message', async () => {
      const res = await request(getApp().getHttpServer()).get(
        `${prefix()}/admin/dashboard/overview`,
      );
      expect(res.status).toBe(401);
      expect(res.body?.message || res.body?.error?.message).toBe('Unauthorized');
    });

    it('GET /api/v1/admin/dashboard/overview with USER token returns 403', async () => {
      const authHeader = createAuthHeader({ sub: 'user-1', role: 'USER' });
      const res = await request(getApp().getHttpServer())
        .get(`${prefix()}/admin/dashboard/overview`)
        .set('Authorization', authHeader);
      expect(res.status).toBe(403);
      expect(res.body?.message || res.body?.error?.message).toBe('Forbidden');
    });

    it('GET /api/v1/admin/dashboard/overview with ADMIN token returns 200', async () => {
      const authHeader = createAuthHeader({ sub: 'admin-1', role: 'ADMIN' });
      const res = await request(getApp().getHttpServer())
        .get(`${prefix()}/admin/dashboard/overview`)
        .set('Authorization', authHeader);
      expect(res.status).toBe(200);
      expect(res.body?.data?.status).toBe('ok');
    });
  });
});
