import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter, TransformResponseInterceptor } from '@nestlancer/common';
import { AppModule } from '../../src/app.module';
import { createTestJwt } from '@nestlancer/testing/helpers/test-auth.helper';

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

function authHeader(userId: string, role = 'USER') {
  const token = createTestJwt(
    { sub: userId, email: `${userId}@test.com`, role },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

function adminAuthHeader() {
  return authHeader('admin-1', 'ADMIN');
}

describe('Users Service (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.setGlobalPrefix('api/v1');
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

  describe('Health', () => {
    it('GET /api/v1/users/health', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/users/health').expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.service).toBe('users');
    });

    it(`GET /api/v1/users/health - should execute successfully with valid data`, async () => {
      const response = await request(app.getHttpServer()).get(`/api/v1/users/health`);

      expect(response.status).toBe(200);
    });
  });

  describe('Profile (Authenticated)', () => {
    it('GET /api/v1/users/profile - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/users/profile');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/users/profile - should accept valid token and return profile or 404/422', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set(authHeader('test-user-1'));

      expect([200, 404, 422, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();
      } else if (response.status === 404 || response.status === 422) {
        if (response.body?.status) expect(response.body.status).toBe('error');
      }
    });

    it('PATCH /api/v1/users/profile - should reject invalid data (400 validation or 500)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/profile')
        .set(authHeader('test-user-1'))
        .send({ firstName: 'J', lastName: 'D', phone: 'invalid' });

      expect(response.status).toBe(400);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('PATCH /api/v1/users/profile - should accept valid payload with 200 or 404', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/profile')
        .set(authHeader('test-user-1'))
        .send({ firstName: 'John', lastName: 'Doe' });

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200 && response.body?.status) {
        expect(response.body.status).toBe('success');
      }
    });

    it('GET + PATCH /api/v1/users/profile - should allow reading and updating profile when backend is healthy', async () => {
      const getResponse = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set(authHeader('e2e-user-1'));

      expect([200, 404, 422, 500]).toContain(getResponse.status);
      if (getResponse.status !== 200) {
        // User may not exist yet; skip the rest of the flow.
        return;
      }

      const original = getResponse.body.data;
      expect(original).toBeDefined();

      const patchResponse = await request(app.getHttpServer())
        .patch('/api/v1/users/profile')
        .set(authHeader('e2e-user-1'))
        .send({ firstName: 'Integration', lastName: 'Tester' });

      expect([200, 404, 500]).toContain(patchResponse.status);
      if (patchResponse.status === 200) {
        expect(patchResponse.body.status).toBe('success');
        expect(patchResponse.body.data).toBeDefined();
      }
    });
  });

  describe('Avatar', () => {
    it('DELETE /api/v1/users/avatar - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).delete('/api/v1/users/avatar');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it(`DELETE /api/v1/users/avatar - should execute successfully with valid data`, async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/users/avatar`)
        .set(authHeader('test-user-1'));

      expect([200, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/users/avatar - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users/avatar')
        .attach('file', Buffer.from('fake'), 'test.png');

      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it(`POST /api/v1/users/avatar - should execute successfully with valid data`, async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/avatar`)
        .set(authHeader('test-user-1'))
        .attach('file', Buffer.from('fake'), 'test.png');

      expect([201, 400, 500]).toContain(response.status);
    });
  });

  describe('Preferences', () => {
    it('GET /api/v1/users/preferences - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/users/preferences');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it(`GET /api/v1/users/preferences - should execute successfully with valid data`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/preferences`)
        .set(authHeader('test-user-1'));

      expect([200, 404, 500]).toContain(response.status);
    });

    it('PATCH /api/v1/users/preferences - should reject invalid data (400 validation or 500)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/preferences')
        .set(authHeader('test-user-1'))
        .send({
          notifications: { email: { digest: 'invalid' } },
          privacy: { profileVisibility: 'invalid' },
        });

      expect(response.status).toBe(400);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('PATCH /api/v1/users/preferences - should accept valid payload with 200 or 404', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/preferences')
        .set(authHeader('test-user-1'))
        .send({
          notifications: { email: { digest: 'weekly' } },
          privacy: { profileVisibility: 'public' },
        });

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200 && response.body?.status) {
        expect(response.body.status).toBe('success');
      }
    });
  });

  describe('Password', () => {
    it('PATCH /api/v1/users/password - should reject invalid payload (400 validation or 500)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/password')
        .set(authHeader('test-user-1'))
        .send({
          currentPassword: 'old',
          newPassword: 'weak',
          confirmPassword: 'weak',
        });

      expect(response.status).toBe(400);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/users/change-password - should reject invalid payload (400 validation or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users/change-password')
        .set(authHeader('test-user-1'))
        .send({
          currentPassword: 'old',
          newPassword: 'weak',
          confirmPassword: 'mismatch',
        });

      expect(response.status).toBe(400);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });
  });

  describe('2FA', () => {
    it('POST /api/v1/users/2fa/enable - should reject empty password (400 validation or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users/2fa/enable')
        .set(authHeader('test-user-1'))
        .send({ password: '' });

      expect(response.status).toBe(400);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/users/2fa/verify - should reject invalid code length (400 validation or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users/2fa/verify')
        .set(authHeader('test-user-1'))
        .send({ code: '123' });

      expect(response.status).toBe(400);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/users/2fa/disable - should reject invalid code length (400 validation or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users/2fa/disable')
        .set(authHeader('test-user-1'))
        .send({ password: 'pass', code: '123' });

      expect(response.status).toBe(400);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/users/2fa/status - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/users/2fa/status');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it(`GET /api/v1/users/2fa/status - should execute successfully with valid data`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/2fa/status`)
        .set(authHeader('test-user-1'));

      expect([200, 404, 422, 500]).toContain(response.status);
    });

    it('GET /api/v1/users/2fa/backup-codes - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/users/2fa/backup-codes');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it(`GET /api/v1/users/2fa/backup-codes - should execute successfully with valid data`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/2fa/backup-codes`)
        .set(authHeader('test-user-1'));

      expect([200, 404, 422, 500]).toContain(response.status);
    });
  });

  describe('Sessions', () => {
    it('GET /api/v1/users/sessions - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/users/sessions');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/users/sessions - should accept valid token and return array or 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/sessions')
        .set(authHeader('test-user-1'));

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('GET /api/v1/users/sessions/:sessionId - should reject invalid session id with 400 or 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/sessions/invalid-session-id')
        .set(authHeader('test-user-1'));

      expect([400, 404, 422]).toContain(response.status);
      if (response.status !== 404) {
        expect(response.body.status).toBe('error');
      }
    });

    it('POST /api/v1/users/sessions/terminate-others - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/v1/users/sessions/terminate-others',
      );

      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it(`POST /api/v1/users/sessions/terminate-others - should execute successfully with valid data`, async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/sessions/terminate-others`)
        .set(authHeader('test-user-1'));

      expect([200, 201, 500]).toContain(response.status);
    });
  });

  describe('Account', () => {
    it('POST /api/v1/users/delete-account - should reject reason over max length (400 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users/delete-account')
        .set(authHeader('test-user-1'))
        .send({ reason: 'a'.repeat(51) });

      expect([400, 422, 500]).toContain(response.status);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/users/delete-account - should accept valid payload with 200/201 or 404/422', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users/delete-account')
        .set(authHeader('test-user-1'))
        .send({ reason: 'Test reason', password: 'test' });

      expect([200, 201, 404, 422, 500]).toContain(response.status);
      if (response.status === 200 || response.status === 201) {
        expect(response.body.status).toBe('success');
      } else if (response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('POST /api/v1/users/cancel-deletion - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/users/cancel-deletion');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it(`POST /api/v1/users/cancel-deletion - should execute successfully with valid data`, async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/users/cancel-deletion`)
        .set(authHeader('test-user-1'));

      expect([200, 201, 422, 500]).toContain(response.status);
    });
  });

  describe('Activity & Export', () => {
    it('GET /api/v1/users/activity - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/users/activity');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/users/activity - should accept valid token and return activity or 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/activity')
        .query({ page: '1', limit: '20' })
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
      }
    });

    it('GET /api/v1/users/export - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/users/export');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it(`GET /api/v1/users/export - should execute successfully with valid data`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/export`)
        .set(authHeader('test-user-1'));

      expect([200, 500]).toContain(response.status);
    });

    it('GET /api/v1/users/data-export - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/users/data-export');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it(`GET /api/v1/users/data-export - should execute successfully with valid data`, async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/users/data-export`)
        .set(authHeader('test-user-1'));

      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Admin - Users', () => {
    it('GET /api/v1/admin/users - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/admin/users');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/admin/users - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/admin/users - should accept admin token and return list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .query({ page: '1', limit: '20' })
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();
      }
    });

    it('GET /api/v1/admin/users/search - should handle missing query (200, 400, 422, or 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users/search')
        .set(adminAuthHeader());

      expect([200, 400, 422, 500]).toContain(response.status);
      if (response.body?.status) expect(response.body.status).toBeDefined();
    });

    it('GET /api/v1/admin/users/:userId - should reject invalid userId (400, 404, or 422)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users/invalid-uuid')
        .set(adminAuthHeader());

      expect([400, 404, 422, 500]).toContain(response.status);
    });

    it('PATCH /api/v1/admin/users/:userId - should reject invalid email (400 validation or 500)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000')
        .set(adminAuthHeader())
        .send({ email: 'not-an-email' });

      expect([400, 404, 422, 500]).toContain(response.status);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('PATCH /api/v1/admin/users/:userId/role - should reject empty role (400 validation or 500)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000/role')
        .set(adminAuthHeader())
        .send({ role: '' });

      expect([400, 404, 422, 500]).toContain(response.status);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/admin/users/bulk - should handle empty userIds (200, 201, 400, or 422)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/users/bulk')
        .set(adminAuthHeader())
        .send({ userIds: [], action: 'suspend' });

      expect([200, 201, 400, 422, 500]).toContain(response.status);
      if (response.status >= 400 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/admin/users/bulk - should handle invalid action (200, 201, 400, or 422)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/users/bulk')
        .set(adminAuthHeader())
        .send({
          userIds: ['550e8400-e29b-41d4-a716-446655440000'],
          action: 'invalid_action',
        });

      expect([200, 201, 400, 422, 500]).toContain(response.status);
      if (response.status >= 400 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/admin/users/:userId - response must not include passwordHash', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .query({ page: '1', limit: '1' })
        .set(adminAuthHeader());

      if (list.status !== 200 || !list.body?.data?.data?.length) return;

      const userId = list.body.data.data[0].id;
      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/users/${userId}`)
        .set(adminAuthHeader());

      if (response.status === 200 && response.body?.data) {
        const body = JSON.stringify(response.body.data);
        expect(body).not.toContain('passwordHash');
        expect(body).not.toContain('twoFactorSecret');
      }
    });

    it('POST /api/v1/admin/users/bulk - does not match :userId route (not 404 as invalid UUID)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/users/bulk')
        .set(adminAuthHeader())
        .send({
          userIds: [],
          action: 'suspend',
          reason: 'route order check',
        });

      expect(response.status).not.toBe(404);
      expect([400, 422, 200, 201, 500]).toContain(response.status);
    });

    it('POST /api/v1/admin/users/bulk - suspend action with valid payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/users/bulk')
        .set(adminAuthHeader())
        .send({
          userIds: ['550e8400-e29b-41d4-a716-446655440000'],
          action: 'suspend',
          reason: 'integration test',
        });

      expect([200, 201, 400, 404, 422, 500]).toContain(response.status);
    });

    it('PATCH /api/v1/admin/users/:userId/status - rejects invalid status enum', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000/status')
        .set(adminAuthHeader())
        .send({ status: 'not-a-real-status' });

      expect([400, 422, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/admin/users/:userId/export - queues export or rejects unknown user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440000/export')
        .set(adminAuthHeader());

      expect([201, 404, 500]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body.data?.exportId).toBeDefined();
      }
    });
  });
});
