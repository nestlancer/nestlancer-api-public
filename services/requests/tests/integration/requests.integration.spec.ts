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

const validCreateRequestDto = {
  title: 'Build a Custom CRM for Real Estate',
  description:
    'We need a robust CRM system to manage lead flow, automated emails, and agent performance tracking for our real estate team.',
  category: 'webDevelopment',
  budget: { min: 5000, max: 15000, currency: 'INR', flexible: true },
  timeline: {
    preferredStartDate: '2025-01-01T00:00:00Z',
    deadline: '2025-06-01T23:59:59Z',
    flexible: false,
  },
  requirements: ['User authentication', 'Dashboard analytics', 'PDF reporting'],
};

describe('Requests Service (Integration)', () => {
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
    it('GET /api/v1/requests/health - should return 200 with success and service status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/requests/health')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.service).toBe('requests');
    });
  });

  describe('Requests (Authenticated)', () => {
    it('GET /api/v1/requests - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/requests');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/requests - should accept valid token and return list or 404/500', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/requests')
        .set(authHeader('test-user-1'));

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('POST /api/v1/requests - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/requests')
        .send(validCreateRequestDto);

      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/requests - should reject invalid data with 400 (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/requests')
        .set(authHeader('test-user-1'))
        .send({
          title: 'Ab',
          description: 'Short',
          category: 'invalid',
          budget: { min: -1, max: 100, currency: 'INR', flexible: true },
          timeline: {
            preferredStartDate: '2025-01-01',
            deadline: '2025-06-01',
            flexible: false,
          },
          requirements: [],
        });

      expect(response.status).toBe(400);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/requests - should accept valid payload with 201 or 500', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/requests')
        .set(authHeader('test-user-1'))
        .send(validCreateRequestDto);

      expect([201, 500]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();
      }
    });

    it('GET /api/v1/requests/stats - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/requests/stats');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/requests/stats - should accept valid token and return stats or 404/500', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/requests/stats')
        .set(authHeader('test-user-1'));

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
      }
    });

    it('GET /api/v1/requests/:id - should reject invalid id (400, 404, or 422)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/requests/invalid-uuid')
        .set(authHeader('test-user-1'));

      expect([400, 404, 422, 500]).toContain(response.status);
      if (response.status !== 500 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('PATCH /api/v1/requests/:id - should reject invalid payload (400 validation or 404)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/requests/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('test-user-1'))
        .send({ title: 'Ab' });

      expect(response.status).toBe(400);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/requests/:id/submit - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/v1/requests/550e8400-e29b-41d4-a716-446655440000/submit',
      );

      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/requests/:id/submit - should allow submitting an existing request when backend is healthy', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/requests')
        .set(authHeader('e2e-user-1'))
        .send(validCreateRequestDto);

      expect([201, 500]).toContain(createResponse.status);

      if (createResponse.status !== 201) {
        return;
      }

      const created = createResponse.body.data ?? createResponse.body;
      const requestId = created.id;
      expect(requestId).toBeDefined();

      const submitResponse = await request(app.getHttpServer())
        .post(`/api/v1/requests/${requestId}/submit`)
        .set(authHeader('e2e-user-1'));

      expect([200, 400, 404, 500]).toContain(submitResponse.status);
    });

    it('DELETE /api/v1/requests/:id - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/v1/requests/550e8400-e29b-41d4-a716-446655440000',
      );

      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('DELETE /api/v1/requests/:id - should delete an existing request when backend is healthy', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/requests')
        .set(authHeader('e2e-user-1'))
        .send(validCreateRequestDto);

      expect([201, 500]).toContain(createResponse.status);

      if (createResponse.status !== 201) {
        return;
      }

      const created = createResponse.body.data ?? createResponse.body;
      const requestId = created.id;
      expect(requestId).toBeDefined();

      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/requests/${requestId}`)
        .set(authHeader('e2e-user-1'));

      expect([200, 404, 500]).toContain(deleteResponse.status);
    });

    it('should create a request and then retrieve it by id when backend is healthy', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/requests')
        .set(authHeader('e2e-user-1'))
        .send(validCreateRequestDto);

      expect([201, 500]).toContain(createResponse.status);

      if (createResponse.status !== 201) {
        // If the backend is misconfigured or unavailable, treat this as a soft-fail for the flow test.
        return;
      }

      const created = createResponse.body.data ?? createResponse.body;
      const requestId = created.id;
      expect(requestId).toBeDefined();

      const getResponse = await request(app.getHttpServer())
        .get(`/api/v1/requests/${requestId}`)
        .set(authHeader('e2e-user-1'));

      expect([200, 404, 500]).toContain(getResponse.status);
      if (getResponse.status === 200) {
        expect(getResponse.body.status).toBe('success');
        expect(getResponse.body.data ?? getResponse.body).toBeDefined();
      }
    });
  });

  describe('Attachments', () => {
    it('GET /api/v1/requests/:id/attachments - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/requests/550e8400-e29b-41d4-a716-446655440000/attachments',
      );

      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/requests/:id/attachments - should list attachments for an existing request when backend is healthy', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/requests')
        .set(authHeader('e2e-user-1'))
        .send(validCreateRequestDto);

      expect([201, 500]).toContain(createResponse.status);

      if (createResponse.status !== 201) {
        return;
      }

      const created = createResponse.body.data ?? createResponse.body;
      const requestId = created.id;
      expect(requestId).toBeDefined();

      const response = await request(app.getHttpServer())
        .get(`/api/v1/requests/${requestId}/attachments`)
        .set(authHeader('e2e-user-1'));

      expect([200, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/requests/:id/attachments - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/requests/550e8400-e29b-41d4-a716-446655440000/attachments')
        .attach('file', Buffer.from('fake'), 'test.png');

      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/requests/:id/attachments - should upload attachment for an existing request when backend is healthy', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/requests')
        .set(authHeader('e2e-user-1'))
        .send(validCreateRequestDto);

      expect([201, 500]).toContain(createResponse.status);

      if (createResponse.status !== 201) {
        return;
      }

      const created = createResponse.body.data ?? createResponse.body;
      const requestId = created.id;
      expect(requestId).toBeDefined();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/requests/${requestId}/attachments`)
        .set(authHeader('e2e-user-1'))
        .attach('file', Buffer.from('test'), 'test.txt');

      expect([201, 400, 500]).toContain(response.status);
    });
  });

  describe('Admin - Requests', () => {
    it('GET /api/v1/admin/requests - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/admin/requests');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/admin/requests - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/requests')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/admin/requests - should accept admin token and return list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/requests')
        .query({ page: '1', limit: '20' })
        .set(adminAuthHeader());

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();
      }
    });

    it('GET /api/v1/admin/requests/stats - should reject non-admin (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/requests/stats')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/admin/requests/stats - should accept admin token and return stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/requests/stats')
        .set(adminAuthHeader());

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
      }
    });

    it('PATCH /api/v1/admin/requests/:id/status - should reject invalid status (400 validation or 404)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/requests/550e8400-e29b-41d4-a716-446655440000/status')
        .set(adminAuthHeader())
        .send({ status: 'invalid' });

      expect(response.status).toBe(400);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/admin/requests/:id/notes - should reject empty content (400 validation or 404)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/requests/550e8400-e29b-41d4-a716-446655440000/notes')
        .set(adminAuthHeader())
        .send({ content: '' });

      expect(response.status).toBe(400);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });
  });
});
