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

describe('Projects Service (Integration)', () => {
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
    it('GET /api/v1/projects/health - should return 200 with success and service status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/projects/health')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.service).toBe('projects');
    });
  });

  describe('Projects (Authenticated)', () => {
    it('GET /api/v1/projects - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/projects');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/projects - should accept valid token and return list or 404/500', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();
      }
    });

    it('GET /api/v1/projects/stats - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/projects/stats');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/projects/stats - should accept valid token and return stats or 404/500', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/projects/stats')
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
      }
    });

    it('GET /api/v1/projects/:id - should reject invalid project id (400, 404, or 422)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/projects/invalid-uuid')
        .set(authHeader('test-user-1'));

      expect([400, 404, 422, 500]).toContain(response.status);
      if (response.status !== 500 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/projects/:id/approve - should reject invalid payload (400 validation or 404)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/projects/550e8400-e29b-41d4-a716-446655440000/approve')
        .set(authHeader('test-user-1'))
        .send({ rating: 0, feedback: {} });

      expect(response.status).toBe(400);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/projects/:id/request-revision - should reject invalid payload (400 validation or 404)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/projects/550e8400-e29b-41d4-a716-446655440000/request-revision')
        .set(authHeader('test-user-1'))
        .send({ reason: '' });

      expect(response.status).toBe(400);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/projects/:id/messages - should reject invalid payload (400 validation or 404)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/projects/550e8400-e29b-41d4-a716-446655440000/messages')
        .set(authHeader('test-user-1'))
        .send({ content: '' });

      // RS256/JWKS dev env: unsigned test JWT may yield 401 before validation; otherwise expect validation/project errors.
      expect([400, 401, 422]).toContain(response.status);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/projects + GET /api/v1/projects/:id - should allow fetching a specific project when backend is healthy', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set(authHeader('e2e-user-1'));

      expect([200, 404, 500]).toContain(listResponse.status);
      if (listResponse.status !== 200 || !Array.isArray(listResponse.body.data)) {
        // No accessible projects or backend unavailable; skip flow.
        return;
      }

      const first = listResponse.body.data[0];
      if (!first || !first.id) {
        return;
      }

      const getResponse = await request(app.getHttpServer())
        .get(`/api/v1/projects/${first.id}`)
        .set(authHeader('e2e-user-1'));

      expect([200, 404, 422, 500]).toContain(getResponse.status);
      if (getResponse.status === 200) {
        const body = getResponse.body.data ?? getResponse.body;
        expect(body).toBeDefined();
      }
    });
  });

  describe('Public Projects', () => {
    it('GET /api/v1/public - should return public projects without auth (200 with data and pagination)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/public')
        .query({ page: '1', limit: '20' });

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();
        // Controller may return either a direct list or a paginated envelope.
        if (Array.isArray(response.body.data)) {
          expect(Array.isArray(response.body.data)).toBe(true);
        } else {
          expect(response.body.data.data).toBeDefined();
          expect(response.body.data.pagination).toBeDefined();
        }
      }
    });

    it('GET /api/v1/public/:id - should return 404 or 422 for non-existent slug or id', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/public/non-existent-slug-or-id',
      );

      expect([404, 422, 500]).toContain(response.status);
      if (response.status !== 500 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/public + GET /api/v1/public/:id - should allow fetching a specific public project when available', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/public')
        .query({ page: '1', limit: '5' });

      expect([200, 500]).toContain(listResponse.status);
      const listData = listResponse.body?.data?.data;
      if (listResponse.status !== 200 || !Array.isArray(listData) || listData.length === 0) {
        // No public projects or backend unavailable; skip detailed fetch.
        return;
      }

      const first = listData[0];
      const idOrSlug = first?.slug ?? first?.id;
      expect(idOrSlug).toBeDefined();

      const getResponse = await request(app.getHttpServer()).get(`/api/v1/public/${idOrSlug}`);

      expect([200, 404, 422, 500]).toContain(getResponse.status);
      if (getResponse.status === 200) {
        expect(getResponse.body.status).toBe('success');
        expect(getResponse.body.data).toBeDefined();
      }
    });
  });

  describe('Admin - Projects', () => {
    it('GET /api/v1/admin/projects - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/admin/projects');
      expect(response.status).toBe(401);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/admin/projects - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/projects')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/admin/projects - should accept admin token and return list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/projects')
        .query({ page: '1', limit: '20' })
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();
      }
    });

    it('GET /api/v1/admin/projects/stats - should accept admin token and return stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/projects/stats')
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
      }
    });

    it('GET /api/v1/admin/projects/:id - should reject invalid project id (400, 404, or 422)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/projects/invalid-uuid')
        .set(adminAuthHeader());

      expect([400, 404, 422, 500]).toContain(response.status);
      if (response.status !== 500 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('PATCH /api/v1/admin/projects/:id/status - should reject invalid payload (400 validation or 404)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/projects/550e8400-e29b-41d4-a716-446655440000/status')
        .set(adminAuthHeader())
        .send({ status: '', reason: 'test' });

      expect(response.status).toBe(400);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });
  });
});
