import request from 'supertest';
import { createTestJwt } from '../../../libs/testing/src/helpers/test-auth.helper';
import { setupApp, teardownApp, getApp, getGlobalPrefix } from './setup';

const prefix = getGlobalPrefix();

function authHeader(userId: string, role: 'USER' | 'ADMIN' = 'USER') {
  const token = createTestJwt(
    { sub: userId, email: `${userId}@test.com`, role },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

function adminAuthHeader() {
  // Use seeded admin user id so SystemConfig.updatedBy FK resolves (dev seed: test-admin-001).
  return authHeader('test-admin-001', 'ADMIN');
}

describe('Admin Service - E2E', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET protected route without token returns 401 (service started and route exists)', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/dashboard/overview`)
        .expect('Content-Type', /json/);
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('message');
    });

    it('GET non-existent path returns 404', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/nonexistent-route`)
        .expect('Content-Type', /json/);
      expect(res.status).toBe(404);
    });
  });

  describe('Auth and authorization', () => {
    it('GET /dashboard/overview without token returns 401', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/dashboard/overview`)
        .expect('Content-Type', /json/);
      expect(res.status).toBe(401);
      expect(res.body?.error?.message).toBeDefined();
    });

    it('GET /dashboard/overview with USER role returns 403', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/dashboard/overview`)
        .set(authHeader('user-1', 'USER'))
        .expect('Content-Type', /json/);
      expect(res.status).toBe(403);
      expect(res.body?.error?.code).toBe('ADMIN_001');
    });

    it('GET /audit without token returns 401 and error body', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/audit`)
        .expect('Content-Type', /json/);
      expect(res.status).toBe(401);
      expect(res.body?.error?.message).toBeDefined();
    });

    it('GET /system/config with USER role returns 403', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/system/config`)
        .set(authHeader('user-1', 'USER'))
        .expect('Content-Type', /json/);
      expect(res.status).toBe(403);
      expect(res.body?.error?.code).toBe('ADMIN_001');
    });
  });

  describe('Dashboard (admin success)', () => {
    it('GET /dashboard/overview with ADMIN returns 200 and response shape', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/dashboard/overview`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body).toHaveProperty('data');
      const data = res.body.data;
      expect(data).toHaveProperty('period');
      expect(data.period).toHaveProperty('start');
      expect(data.period).toHaveProperty('end');
      expect(data.period).toHaveProperty('days');
      expect(data).toHaveProperty('summary');
      expect(typeof data.summary).toBe('object');
    });

    it('GET /dashboard/users with ADMIN returns 200 and data', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/dashboard/users`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
    });

    it('GET /dashboard/revenue with ADMIN returns 200 and data shape', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/dashboard/revenue`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(typeof res.body.data).toBe('object');
    });

    it('GET /dashboard/projects with ADMIN returns 200 and data', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/dashboard/projects`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
    });

    it('GET /dashboard/activity with ADMIN returns 200 and array', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/dashboard/activity`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /dashboard/performance with ADMIN returns 200 and data shape', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/dashboard/performance`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(typeof res.body.data).toBe('object');
    });

    it('GET /dashboard/alerts with ADMIN returns 200 and data array', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/dashboard/alerts`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('data');
      expect(Array.isArray(res.body.data.data)).toBe(true);
    });
  });

  describe('Audit (admin success and errors)', () => {
    it('GET /audit with ADMIN returns 200 and paginated shape', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/audit?page=1&limit=10`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('data');
      expect(Array.isArray(res.body.data.data)).toBe(true);
      expect(res.body.data).toHaveProperty('pagination');
      expect(res.body.data.pagination).toHaveProperty('page', 1);
      expect(res.body.data.pagination).toHaveProperty('limit', 10);
      expect(res.body.data.pagination).toHaveProperty('total');
      expect(res.body.data.pagination).toHaveProperty('totalPages');
    });

    it('GET /audit/stats with ADMIN returns 200 and stats shape', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/audit/stats`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('totalLogs');
    });

    it('GET /audit/:id with non-existent id returns 404 and error body', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/audit/non-existent-audit-id-99999`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('message');
    });

    it('GET /audit/user/:userId with ADMIN returns 200 and array', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/audit/user/some-user-id`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /audit/resource/:type/:id with ADMIN returns 200 and array', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/audit/resource/Project/some-project-id`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /audit/export with ADMIN returns 200 or 202 and acceptance body', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/audit/export`)
        .set(adminAuthHeader())
        .send({ format: 'JSON', from: '2024-01-01', to: '2024-12-31' })
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/);
      expect([200, 201, 202]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toMatch(/^(success|partial)$/);
    });
  });

  describe('Email templates (admin success and errors)', () => {
    it('GET /system/email-templates with ADMIN returns 200 and array', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/system/email-templates`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /system/email-templates/:id with non-existent id returns 404 and error', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/system/email-templates/non-existent-template-id`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('message');
    });

    it('GET /system/email-templates/:id/preview with non-existent id returns 404', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/system/email-templates/non-existent-template-id/preview`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Impersonation (auth and authorization)', () => {
    it('POST /users/:userId/impersonate without token returns 401', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/some-user-id/impersonate`)
        .send({ reason: 'E2E test', ticketId: 'TKT-1' })
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/);
      expect(res.status).toBe(401);
      expect(res.body?.error?.message).toBeDefined();
    });

    it('POST /users/:userId/impersonate with USER role returns 403', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/some-user-id/impersonate`)
        .set(authHeader('user-1', 'USER'))
        .send({ reason: 'E2E test', ticketId: 'TKT-1' })
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/);
      expect(res.status).toBe(403);
      expect(res.body?.error?.code).toBe('ADMIN_001');
    });

    it('POST /users/:userId/impersonate with ADMIN and non-existent userId returns 404', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/non-existent-user-id-99999/impersonate`)
        .set(adminAuthHeader())
        .send({ reason: 'E2E test', ticketId: 'TKT-1' })
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('message');
    });

    it('GET /users/impersonate/sessions with ADMIN returns 200 and array', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/users/impersonate/sessions`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /users/impersonate/end/:sessionId with non-existent sessionId returns 404', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/impersonate/end/non-existent-session-id`)
        .set(adminAuthHeader())
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('message');
    });
  });

  describe('System config (admin success)', () => {
    it('GET /system/config with ADMIN returns 200 and config object', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/system/config`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(typeof res.body.data).toBe('object');
    });

    it('GET /system/features with ADMIN returns 200 and list', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/system/features`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /system/jobs with ADMIN returns 200 and data', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/system/jobs`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
    });

    it('GET /system/logs with ADMIN returns 200 and data', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/system/logs`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
    });

    it('POST /system/cache/clear with ADMIN returns 200 and message', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/system/cache/clear`)
        .set(adminAuthHeader())
        .send({})
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/);
      expect([200, 201]).toContain(res.status);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
    });

    it('PATCH /system/config with ADMIN and valid body returns 200', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/${prefix}/system/config`)
        .set(adminAuthHeader())
        .send({ key: 'E2E_TEST_KEY', value: 'e2e-test-value' })
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('Webhooks (admin)', () => {
    it('GET /webhooks/health with ADMIN returns 200 and status', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/webhooks/health`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject({ status: 'ok', service: 'webhooks-admin' });
    });

    it('GET /webhooks with ADMIN returns 200 and array', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/webhooks`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /webhooks/events with ADMIN returns 200 and events array', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/webhooks/events`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('events');
      expect(Array.isArray(res.body.data.events)).toBe(true);
    });

    it('GET /webhooks/:id with non-existent id returns 404', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/webhooks/non-existent-webhook-id`)
        .set(adminAuthHeader())
        .expect('Content-Type', /json/);
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('message');
    });

    it('POST /webhooks with ADMIN and valid body returns 201 and webhook with id', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/webhooks`)
        .set(adminAuthHeader())
        .send({
          name: 'E2E Test Webhook',
          url: 'https://example.com/webhook',
          events: ['project.created'],
          secret: 'test-secret',
        })
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('url', 'https://example.com/webhook');
    });
  });
});
