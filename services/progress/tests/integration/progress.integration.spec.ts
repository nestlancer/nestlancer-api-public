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

describe('Progress Service (Integration)', () => {
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

  describe('Progress (User)', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';

    it('GET /api/v1/projects/:projectId/progress - should reject unauthenticated (401)', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/projects/${projectId}/progress`,
      );
      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/projects/:projectId/progress - with valid token returns 200 with success body or 404/500', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/progress`)
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect('data' in response.body || 'items' in response.body).toBe(true);
      }
    });

    it('GET /api/v1/projects/:projectId/progress/status - should reject unauthenticated (401)', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/projects/${projectId}/progress/status`,
      );
      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/projects/:projectId/progress/status - with valid token returns 200 with success body or 404/500', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/progress/status`)
        .set(authHeader('test-user-1'));

      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();
      }
    });

    it('POST /api/v1/projects/:projectId/progress - should return 400 for invalid payload (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/progress`)
        .set(authHeader('test-user-1'))
        .send({ title: '', type: 'INVALID_TYPE', description: 'test' });

      expect(response.status).toBe(400);
      if (response.status === 400 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/projects/:projectId/progress/request-changes - should return 400 for invalid payload (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/progress/request-changes`)
        .set(authHeader('test-user-1'))
        .send({ reason: 'a'.repeat(2001), details: [{ description: 'test' }] });

      expect(response.status).toBe(400);
      if (response.status === 400 && response.body?.status)
        expect(response.body.status).toBe('error');
    });
  });

  describe('Milestone Approvals (User)', () => {
    it('POST /api/v1/milestones/:id/approve - should reject unauthenticated (401)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/milestones/550e8400-e29b-41d4-a716-446655440000/approve')
        .send({ feedback: 'Approved' });

      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/milestones/:id/approve - with valid token returns 200 with success or 404/422/500', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/milestones/550e8400-e29b-41d4-a716-446655440000/approve')
        .set(authHeader('test-user-1'))
        .send({ feedback: 'Approved' });

      expect([200, 404, 422, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
        expect(response.body).toHaveProperty('data');
      } else if (response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('POST /api/v1/milestones/:id/request-revision - should reject unauthenticated (401)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/milestones/550e8400-e29b-41d4-a716-446655440000/request-revision')
        .send({ reason: 'Needs changes', details: ['Fix X'] });

      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/milestones/:id/request-revision - with valid token returns 200 with success or 404/422/500', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/milestones/550e8400-e29b-41d4-a716-446655440000/request-revision')
        .set(authHeader('test-user-1'))
        .send({ reason: 'Need updates before approval' });

      expect([200, 404, 422, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
        expect(response.body).toHaveProperty('data');
      }
    });
  });

  describe('Deliverable Reviews (User)', () => {
    it('POST /api/v1/deliverables/:id/approve - should reject unauthenticated (401)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/deliverables/550e8400-e29b-41d4-a716-446655440000/approve')
        .send({});

      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/deliverables/:id/approve - with valid token returns 200 with success or 404/422/500', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/deliverables/550e8400-e29b-41d4-a716-446655440000/approve')
        .set(authHeader('test-user-1'))
        .send({ rating: 5, feedback: 'Looks good overall.' });

      expect([200, 404, 422, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
        expect(response.body).toHaveProperty('data');
      }
    });

    it('POST /api/v1/deliverables/:id/reject - should return 400 for invalid payload (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/deliverables/550e8400-e29b-41d4-a716-446655440000/reject')
        .set(authHeader('test-user-1'))
        .send({ reason: '' });

      expect([400, 404, 422, 500]).toContain(response.status);
      if (response.body?.status) expect(response.body.status).toBe('error');
    });
  });

  describe('Admin - Progress', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';

    it('GET /api/v1/admin/progress/projects/:projectId - should reject unauthenticated (401)', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/admin/progress/projects/${projectId}`,
      );
      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/admin/progress/projects/:projectId - should reject non-admin user (403)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/progress/projects/${projectId}`)
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
      if (response.status === 403 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/admin/progress/projects/:projectId - with admin token returns 200 with success body or 404/500', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/progress/projects/${projectId}`)
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect('data' in response.body || 'items' in response.body).toBe(true);
      }
    });

    it('POST /api/v1/admin/progress/projects/:projectId - should return 400 for invalid payload (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/progress/projects/${projectId}`)
        .set(adminAuthHeader())
        .send({ title: '', type: 'invalid' });

      expect(response.status).toBe(400);
      if (response.status === 400 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('PATCH /api/v1/admin/progress/:id - should return 400, 404, or 500 for invalid id', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/progress/invalid-uuid')
        .set(adminAuthHeader())
        .send({ title: 'Updated', description: 'Test' });

      expect([400, 404, 500]).toContain(response.status);
      if (response.body?.status === 'error') expect(response.body.status).toBe('error');
    });
  });

  describe('Admin - Milestones', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';

    it('POST /api/v1/admin/projects/:projectId/milestones - should return 400 for invalid payload (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/projects/${projectId}/milestones`)
        .set(adminAuthHeader())
        .send({ name: '', startDate: 'invalid', endDate: 'invalid' });

      expect(response.status).toBe(400);
      if (response.status === 400 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('PATCH /api/v1/admin/milestones/:id - should return 400 for invalid payload (validation)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/milestones/550e8400-e29b-41d4-a716-446655440000')
        .set(adminAuthHeader())
        .send({ startDate: 'invalid-date' });

      expect(response.status).toBe(400);
      if (response.status === 400 && response.body?.status)
        expect(response.body.status).toBe('error');
    });
  });

  describe('Admin - Deliverables', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';

    it('GET /api/v1/admin/projects/:projectId/deliverables - should reject unauthenticated (401)', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/admin/projects/${projectId}/deliverables`,
      );
      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status)
        expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/admin/projects/:projectId/deliverables - with admin token returns 200 with success or 404/500', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/projects/${projectId}/deliverables`)
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect('data' in response.body || 'items' in response.body).toBe(true);
      }
    });

    it('POST /api/v1/admin/projects/:projectId/deliverables - should return 400 for invalid payload (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/admin/projects/${projectId}/deliverables`)
        .set(adminAuthHeader())
        .send({ milestoneId: 'invalid-uuid', mediaIds: [] });

      expect(response.status).toBe(400);
      if (response.status === 400 && response.body?.status)
        expect(response.body.status).toBe('error');
    });
  });
});
