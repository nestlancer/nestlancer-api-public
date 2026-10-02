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

describe('Users Service - APIs (E2E)', () => {
  const prefix = getGlobalPrefix();

  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET /users/health returns 200 and users status envelope', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/users/health`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data?.status).toBe('ok');
      expect(res.body.data?.service).toBe('users');
    });
  });

  describe('Profile', () => {
    it('GET /users/profile without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/users/profile`);
      expect(res.status).toBe(401);
    });

    it('GET /users/profile with seeded user token returns 200 and profile for that user', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/users/profile`)
        .set(userAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data?.id).toBe(SEEDED_USER_ID);
      expect(res.body.data?.email).toBe(SEEDED_USER_EMAIL);
      expect(res.body.data?.stats).toBeDefined();
    });

    it('PATCH /users/profile with invalid data returns 400 validation error', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/${prefix}/users/profile`)
        .set(userAuthHeader())
        .send({ firstName: 'J', lastName: 'D', phone: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('PATCH /users/profile with valid data returns 200 and updated profile', async () => {
      const payload = { firstName: 'John', lastName: 'Doe' };

      const res = await request(getApp().getHttpServer())
        .patch(`/${prefix}/users/profile`)
        .set(userAuthHeader())
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data?.firstName).toBe(payload.firstName);
      expect(res.body.data?.lastName).toBe(payload.lastName);
    });
  });

  describe('Avatar', () => {
    it('DELETE /users/avatar without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).delete(`/${prefix}/users/avatar`);
      expect(res.status).toBe(401);
    });

    it('DELETE /users/avatar with seeded user token returns 200 and success envelope', async () => {
      const res = await request(getApp().getHttpServer())
        .delete(`/${prefix}/users/avatar`)
        .set(userAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('POST /users/avatar without token returns 401', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/avatar`)
        .attach('file', Buffer.from('fake'), 'test.png');

      expect(res.status).toBe(401);
    });

    it('POST /users/avatar with seeded user token returns 201 and success envelope', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/avatar`)
        .set(userAuthHeader())
        .attach('file', Buffer.from('fake'), 'test.png');

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
    });
  });

  describe('Preferences', () => {
    it('GET /users/preferences without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/users/preferences`);
      expect(res.status).toBe(401);
    });

    it('GET /users/preferences with seeded user token returns 200 and preferences', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/users/preferences`)
        .set(userAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
    });

    it('PATCH /users/preferences with invalid enums returns 400 validation error', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/${prefix}/users/preferences`)
        .set(userAuthHeader())
        .send({
          notifications: { email: { digest: 'invalid' } },
          privacy: { profileVisibility: 'invalid' },
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('PATCH /users/preferences with valid payload returns 200 and updated preferences', async () => {
      const payload = {
        notifications: { email: { digest: 'weekly' } },
        privacy: { profileVisibility: 'public' },
      };

      const res = await request(getApp().getHttpServer())
        .patch(`/${prefix}/users/preferences`)
        .set(userAuthHeader())
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
    });
  });

  describe('Password', () => {
    it('PATCH /users/password with mismatched confirmation returns 422 business error', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/${prefix}/users/password`)
        .set(userAuthHeader())
        .send({
          currentPassword: 'test-hash',
          newPassword: 'Str0ngP@ssw0rd!',
          confirmPassword: 'DifferentP@ssw0rd!',
        });

      expect(res.status).toBe(422);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('USER_010');
    });

    it('POST /users/change-password with mismatched confirmation returns 422 business error', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/change-password`)
        .set(userAuthHeader())
        .send({
          currentPassword: 'test-hash',
          newPassword: 'Str0ngP@ssw0rd!',
          confirmPassword: 'DifferentP@ssw0rd!',
        });

      expect(res.status).toBe(422);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('USER_010');
    });
  });

  describe('Two-Factor Authentication', () => {
    it('POST /users/2fa/enable with empty password returns 400 validation error', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/2fa/enable`)
        .set(userAuthHeader())
        .send({ password: '' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('POST /users/2fa/verify with short code returns 400 validation error', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/2fa/verify`)
        .set(userAuthHeader())
        .send({ code: '123' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('POST /users/2fa/disable with short code returns 400 validation error', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/2fa/disable`)
        .set(userAuthHeader())
        .send({ password: 'pass', code: '123' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('GET /users/2fa/status without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/users/2fa/status`);
      expect(res.status).toBe(401);
    });

    it('GET /users/2fa/status with seeded user token returns 200 and status payload', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/users/2fa/status`)
        .set(userAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
    });

    it('GET /users/2fa/backup-codes without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/users/2fa/backup-codes`);
      expect(res.status).toBe(401);
    });

    it('GET /users/2fa/backup-codes with seeded user token returns 200 and codes payload', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/users/2fa/backup-codes`)
        .set(userAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
    });

    it('POST /users/2fa/regenerate-codes with empty password returns 400 validation error', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/2fa/regenerate-codes`)
        .set(userAuthHeader())
        .send({ password: '' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('POST /users/2fa/regenerate-codes with seeded user token returns 422 business error until flow is wired', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/2fa/regenerate-codes`)
        .set(userAuthHeader())
        .send({ password: 'test-hash' });

      expect(res.status).toBe(422);
      expect(res.body.status).toBe('error');
    });
  });

  describe('Sessions', () => {
    it('GET /users/sessions without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/users/sessions`);
      expect(res.status).toBe(401);
    });

    it('GET /users/sessions with seeded user token returns 200 and array payload', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/users/sessions`)
        .set(
          authHeader(SEEDED_USER_ID, 'USER', SEEDED_USER_EMAIL), // include jti in token for current-session detection
        );

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /users/sessions/:sessionId with invalid id returns 422 business error', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/users/sessions/invalid-session-id`)
        .set(userAuthHeader());

      expect(res.status).toBe(422);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('USER_003');
    });

    it('DELETE /users/sessions/:sessionId without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).delete(
        `/${prefix}/users/sessions/invalid-session-id`,
      );
      expect(res.status).toBe(401);
    });

    it('DELETE /users/sessions/:sessionId with invalid id returns 422 business error', async () => {
      const res = await request(getApp().getHttpServer())
        .delete(`/${prefix}/users/sessions/invalid-session-id`)
        .set(userAuthHeader());

      expect(res.status).toBe(422);
      expect(res.body.status).toBe('error');
      expect(res.body.error?.code).toBe('USER_003');
    });

    it('POST /users/sessions/terminate-others without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).post(
        `/${prefix}/users/sessions/terminate-others`,
      );
      expect(res.status).toBe(401);
    });

    it('POST /users/sessions/terminate-others with seeded user token returns 201 and success', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/sessions/terminate-others`)
        .set(userAuthHeader());

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
    });
  });

  describe('Account', () => {
    it('POST /users/delete-account with too-long reason returns 400 validation error', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/delete-account`)
        .set(userAuthHeader())
        .send({ reason: 'a'.repeat(51) });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('POST /users/delete-account with mismatched password confirmation returns 422 business error', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/delete-account`)
        .set(userAuthHeader())
        .send({ reason: 'Test reason', password: 'wrong-password' });

      expect(res.status).toBe(422);
      expect(res.body.status).toBe('error');
    });

    it('POST /users/cancel-deletion without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).post(`/${prefix}/users/cancel-deletion`);
      expect(res.status).toBe(401);
    });

    it('POST /users/cancel-deletion with seeded user token returns 201 and success', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/${prefix}/users/cancel-deletion`)
        .set(userAuthHeader());

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
    });
  });

  describe('Activity & Export', () => {
    it('GET /users/activity without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/users/activity`);
      expect(res.status).toBe(401);
    });

    it('GET /users/activity with seeded user token returns 200 and paginated activity', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/users/activity`)
        .query({ page: '1', limit: '20' })
        .set(userAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data?.data)).toBe(true);
      expect(res.body.data?.pagination).toBeDefined();
    });

    it('GET /users/export without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/users/export`);
      expect(res.status).toBe(401);
    });

    it('GET /users/export with seeded user token returns 200 and export request payload', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/users/export`)
        .set(userAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
    });

    it('GET /users/data-export without token returns 401', async () => {
      const res = await request(getApp().getHttpServer()).get(`/${prefix}/users/data-export`);
      expect(res.status).toBe(401);
    });

    it('GET /users/data-export with seeded user token returns 200 and export request payload', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/users/data-export`)
        .set(userAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
    });

    it('GET /users/export/:id with invalid id returns 200 or business error depending on export state', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/${prefix}/users/export/invalid-export-id`)
        .set(userAuthHeader());

      expect([200, 404, 422]).toContain(res.status);
    });
  });
});
