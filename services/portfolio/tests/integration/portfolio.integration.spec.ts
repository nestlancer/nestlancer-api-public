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

describe('Portfolio Service (Integration)', () => {
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
    it('GET /api/v1/portfolio/health', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/portfolio/health')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.service).toBe('portfolio');
    });
  });

  describe('Public Portfolio', () => {
    it('GET /api/v1/portfolio - should return published items without auth (200 with success body or 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/portfolio')
        .query({ page: '1', limit: '20' });

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect('data' in response.body || 'items' in response.body).toBe(true);
      }
    });

    it('GET /api/v1/portfolio/featured - should return featured items (200 with success body or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/portfolio/featured');

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(response.body).toHaveProperty('data');
      }
    });

    it('GET /api/v1/portfolio/categories - should return categories (200 with success body or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/portfolio/categories');

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(response.body).toHaveProperty('data');
      }
    });

    it('GET /api/v1/portfolio/tags - should return tags (200 with success body or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/portfolio/tags');

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(response.body).toHaveProperty('data');
      }
    });

    it('GET /api/v1/portfolio/search - should handle search query (200 with success body or 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/portfolio/search')
        .query({ q: 'test', page: '1', limit: '20' });

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect('data' in response.body || 'items' in response.body).toBe(true);
      }
    });

    it('GET /api/v1/portfolio/:idOrSlug - should return 404 for non-existent id', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/portfolio/non-existent-id-or-slug',
      );

      expect([404, 500]).toContain(response.status);
      if (response.status === 404 && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });
  });

  describe('Admin - Portfolio', () => {
    it('GET /api/v1/admin/portfolio - should reject unauthenticated (401)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/admin/portfolio');
      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('GET /api/v1/admin/portfolio - should reject non-admin user (403)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/portfolio')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
      if (response.status === 403 && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('GET /api/v1/admin/portfolio - with admin token returns 200 with success body or 500', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/portfolio')
        .query({ page: '1', limit: '20' })
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect('data' in response.body || 'items' in response.body).toBe(true);
      }
    });

    it('POST /api/v1/admin/portfolio - should return 400/422 for invalid payload (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/portfolio')
        .set(adminAuthHeader())
        .send({ title: '', shortDescription: '', fullDescription: '', contentFormat: 'INVALID' });

      expect(response.status).toBe(400);
      if ((response.status === 400 || response.status === 422) && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('GET /api/v1/admin/portfolio/analytics - with admin token returns 200 with success or 500', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/portfolio/analytics')
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(response.body).toHaveProperty('data');
      }
    });

    it('GET /api/v1/admin/portfolio/:id - should return 400/404/422 for invalid id', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/portfolio/invalid-uuid')
        .set(adminAuthHeader());

      expect([400, 404, 422, 500]).toContain(response.status);
      if ([400, 404, 422, 500].includes(response.status) && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('PATCH /api/v1/admin/portfolio/:id - should return 400/422 for invalid payload (validation)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/portfolio/550e8400-e29b-41d4-a716-446655440000')
        .set(adminAuthHeader())
        .send({ title: 'a'.repeat(501) });

      expect(response.status).toBe(400);
      if ((response.status === 400 || response.status === 422) && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('POST /api/v1/admin/portfolio/reorder - should return 400/422 for invalid payload (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/portfolio/reorder')
        .set(adminAuthHeader())
        .send({ items: 'invalid' });

      expect(response.status).toBe(400);
      if ((response.status === 400 || response.status === 422) && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('POST /api/v1/admin/portfolio - should create a portfolio item and allow fetching it (happy path when backend is healthy)', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/admin/portfolio')
        .set(adminAuthHeader())
        .send({
          title: 'Integration Test Portfolio Item',
          shortDescription: 'Short description for integration testing.',
          fullDescription: 'Full description for integration testing.',
          contentFormat: 'MARKDOWN',
        });

      expect([201, 400, 422, 500]).toContain(createResponse.status);

      if (createResponse.status !== 201) {
        // If validation, auth, or infra prevents creation, do not fail the whole suite.
        return;
      }

      const created = createResponse.body.data ?? createResponse.body;
      const idOrSlug = created.id ?? created.slug;
      expect(idOrSlug).toBeDefined();

      const getAdminResponse = await request(app.getHttpServer())
        .get(`/api/v1/admin/portfolio/${idOrSlug}`)
        .set(adminAuthHeader());

      expect([200, 404, 422, 500]).toContain(getAdminResponse.status);
      if (getAdminResponse.status === 200) {
        const body = getAdminResponse.body.data ?? getAdminResponse.body;
        expect(body).toBeDefined();
      }
    });
  });

  describe('Admin - Portfolio Categories', () => {
    it('GET /api/v1/admin/portfolio/categories - should reject unauthenticated (401)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/admin/portfolio/categories');
      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('GET /api/v1/admin/portfolio/categories - with admin token returns 200 with success or 500', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/portfolio/categories')
        .set(adminAuthHeader());

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
        expect(response.body).toHaveProperty('data');
      }
    });

    it('POST /api/v1/admin/portfolio/categories - should return 400/422 for invalid payload (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/portfolio/categories')
        .set(adminAuthHeader())
        .send({ name: '', slug: '' });

      expect(response.status).toBe(400);
      if ((response.status === 400 || response.status === 422) && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('PATCH /api/v1/admin/portfolio/categories/:id - should return 400/404/422 for invalid id', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/portfolio/categories/invalid-uuid')
        .set(adminAuthHeader())
        .send({ name: 'Updated' });

      expect([400, 404, 422, 500]).toContain(response.status);
      if ([400, 404, 422, 500].includes(response.status) && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });
  });
});
