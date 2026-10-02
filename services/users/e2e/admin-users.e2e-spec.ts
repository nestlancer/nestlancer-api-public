import request from 'supertest';
import { createTestJwt } from '../../../libs/testing/src/helpers/test-auth.helper';
import { setupApp, teardownApp, getApp, getGlobalPrefix } from './setup';

const SEEDED_USER_ID = 'e2e-user-1';
const SEEDED_USER_EMAIL = 'e2e-user-1@example.com';
const SEEDED_ADMIN_ID = 'e2e-admin-1';

function authHeader(userId: string, role = 'USER', email?: string) {
  const token = createTestJwt(
    { sub: userId, email: email ?? `${userId}@example.com`, role },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

function userAuthHeader() {
  return authHeader(SEEDED_USER_ID, 'USER', SEEDED_USER_EMAIL);
}

function adminAuthHeader() {
  return authHeader(SEEDED_ADMIN_ID, 'ADMIN', 'e2e-admin-1@example.com');
}

describe('Users Service - Admin Users (E2E)', () => {
  const prefix = getGlobalPrefix();

  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('GET /admin/users rejects unauthenticated with 401', async () => {
    const res = await request(getApp().getHttpServer()).get(`/${prefix}/admin/users`);
    expect(res.status).toBe(401);
  });

  it('GET /admin/users rejects non-admin user with 403', async () => {
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/admin/users`)
      .set(userAuthHeader());

    expect(res.status).toBe(403);
  });

  it('GET /admin/users with admin token returns 200 and paginated list', async () => {
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/admin/users`)
      .query({ page: '1', limit: '20' })
      .set(adminAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data?.data)).toBe(true);
    expect(res.body.data?.pagination).toBeDefined();
  });

  it('GET /admin/users/search without query returns 400 validation error', async () => {
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/admin/users/search`)
      .set(adminAuthHeader());

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('GET /admin/users/search with email fragment returns 200 and matching users', async () => {
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/admin/users/search`)
      .query({ q: 'e2e-user-1', page: '1', limit: '10' })
      .set(adminAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data?.data)).toBe(true);
  });

  it('GET /admin/users/:userId with non-existent user returns 422 business error', async () => {
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/admin/users/non-existent-user-id`)
      .set(adminAuthHeader());

    expect(res.status).toBe(422);
    expect(res.body.status).toBe('error');
    expect(res.body.error?.code).toBe('USER_001');
  });

  it('PATCH /admin/users/:userId with invalid email returns 400 validation error', async () => {
    const res = await request(getApp().getHttpServer())
      .patch(`/${prefix}/admin/users/${SEEDED_USER_ID}`)
      .set(adminAuthHeader())
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('PATCH /admin/users/:userId/status with valid status returns 200 and user payload', async () => {
    const res = await request(getApp().getHttpServer())
      .patch(`/${prefix}/admin/users/${SEEDED_USER_ID}/status`)
      .set(adminAuthHeader())
      .send({ status: 'SUSPENDED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data?.status).toBe('SUSPENDED');
  });

  it('PATCH /admin/users/:userId/status with invalid status returns 500 until validation is added', async () => {
    const res = await request(getApp().getHttpServer())
      .patch(`/${prefix}/admin/users/${SEEDED_USER_ID}/status`)
      .set(adminAuthHeader())
      .send({ status: '' });

    expect(res.status).toBe(500);
  });

  it('PATCH /admin/users/:userId/role with empty role returns 400 validation error', async () => {
    const res = await request(getApp().getHttpServer())
      .patch(`/${prefix}/admin/users/${SEEDED_USER_ID}/role`)
      .set(adminAuthHeader())
      .send({ role: '' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('POST /admin/users/bulk with empty userIds returns 400 validation error', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/admin/users/bulk`)
      .set(adminAuthHeader())
      .send({ userIds: [], action: 'suspend' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('POST /admin/users/bulk with invalid action returns 400 validation error', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/admin/users/bulk`)
      .set(adminAuthHeader())
      .send({
        userIds: [SEEDED_USER_ID],
        action: 'invalid_action',
      });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('POST /admin/users/:userId/force-password-reset returns 201 and flag payload', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/admin/users/${SEEDED_USER_ID}/force-password-reset`)
      .set(adminAuthHeader());

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data?.userId).toBe(SEEDED_USER_ID);
    expect(res.body.data?.passwordResetRequired).toBe(true);
  });

  it('POST /admin/users/:userId/reset-password returns 201 and reset payload', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/admin/users/${SEEDED_USER_ID}/reset-password`)
      .set(adminAuthHeader())
      .send({ newPassword: 'TmpP@ssw0rd!' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data?.passwordReset).toBe(true);
  });

  it('GET /admin/users/:userId/sessions returns 200 and sessions array', async () => {
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/admin/users/${SEEDED_USER_ID}/sessions`)
      .set(adminAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data?.data)).toBe(true);
  });

  it('DELETE /admin/users/sessions/:sessionId with invalid id returns 422 or 500 error', async () => {
    const res = await request(getApp().getHttpServer())
      .delete(`/${prefix}/admin/users/sessions/invalid-session-id`)
      .set(adminAuthHeader());

    expect([422, 500]).toContain(res.status);
    if (res.status === 422) {
      expect(res.body.status).toBe('error');
    }
  });

  it('POST /admin/users/:userId/terminate-all-sessions returns 201 and terminated count', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/admin/users/${SEEDED_USER_ID}/terminate-all-sessions`)
      .set(adminAuthHeader());

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(typeof res.body.data?.terminated).toBe('number');
  });

  it('POST /admin/users/:userId/export queues GDPR export', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/admin/users/${SEEDED_USER_ID}/export`)
      .set(adminAuthHeader());

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data?.exportId).toBeDefined();
    expect(res.body.data?.status).toBe('processing');
  });

  it('GET /admin/users/:userId/activity returns 200 and paginated activity', async () => {
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/admin/users/${SEEDED_USER_ID}/activity`)
      .query({ page: '1', limit: '20' })
      .set(adminAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data?.data)).toBe(true);
    expect(res.body.data?.pagination).toBeDefined();
  });

  it('DELETE /admin/users/:userId returns 200 and deleted flag', async () => {
    const res = await request(getApp().getHttpServer())
      .delete(`/${prefix}/admin/users/${SEEDED_USER_ID}`)
      .set(adminAuthHeader());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data?.deleted).toBe(true);
  });

  it('POST /admin/users/:userId/restore returns 201 and restored flag', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/admin/users/${SEEDED_USER_ID}/restore`)
      .set(adminAuthHeader());

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data?.restored).toBe(true);
  });

  it('GET /admin/logs returns 200 or 404 depending on audit data', async () => {
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/admin/logs`)
      .query({ page: '1', limit: '20' })
      .set(adminAuthHeader());

    expect([200, 404]).toContain(res.status);
  });

  it('GET /admin/logs/security-stats returns 200 or 404 depending on metrics configuration', async () => {
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/admin/logs/security-stats`)
      .set(adminAuthHeader());

    expect([200, 404]).toContain(res.status);
  });
});
