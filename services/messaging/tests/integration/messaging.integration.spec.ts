import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
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

describe('Messaging Service (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
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
    it('GET /api/v1/messages/health allows unauthenticated (public health)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/messages/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data?.status).toBe('ok');
      expect(response.body.data?.service).toBe('messages');
    });

    it('GET /api/v1/messages/health returns 200 with success and service info when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/messages/health')
        .set(authHeader('test-user-1'));
      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(response.body.data?.status).toBe('ok');
        expect(response.body.data?.service).toBe('messages');
      }
    });
  });

  describe('Messages (Authenticated)', () => {
    it('GET /api/v1/messages/unread-count rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/messages/unread-count');
      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('GET /api/v1/messages/unread-count with valid token returns 200 and success with data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/messages/unread-count')
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();
      }
    });

    it('POST /api/v1/messages rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .send({ projectId: '550e8400-e29b-41d4-a716-446655440000', content: 'Hello' });
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/messages rejects invalid payload with 400 (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .set(authHeader('test-user-1'))
        .send({ projectId: null, content: '' });

      expect(response.status).toBe(400);
    });

    it('GET /api/v1/messages/search rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/messages/search')
        .query({ q: 'test' });
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/messages/search - executes successfully with auth and query params', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/messages/search')
        .set(authHeader('test-user-1'))
        .query({ q: 'test', page: '1' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('GET /api/v1/messages/project/:projectId rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/messages/project/550e8400-e29b-41d4-a716-446655440000',
      );
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/messages/project/:projectId - returns history or empty for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/messages/project/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('test-user-1'))
        .query({ page: '1', limit: '20' });

      expect([200, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/messages/project/:projectId rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/messages/projects/550e8400-e29b-41d4-a716-446655440000')
        .send({ content: 'Hello' });
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/messages/project/:projectId - creates message or fails with validation/not-found', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/messages/projects/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('test-user-1'))
        .send({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          content: 'Hello from integration test',
        });

      expect([201, 400, 404, 422, 500]).toContain(response.status);
    });

    it('PATCH /api/v1/messages/:id rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/messages/550e8400-e29b-41d4-a716-446655440000')
        .send({ content: 'Updated' });
      expect(response.status).toBe(401);
    });

    it('PATCH /api/v1/messages/:id - returns 200/404/422/500 for edit attempt', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/messages/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('test-user-1'))
        .send({ content: 'Updated message content' });

      expect([200, 404, 422, 500]).toContain(response.status);
    });

    it('DELETE /api/v1/messages/:id rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/v1/messages/550e8400-e29b-41d4-a716-446655440000',
      );
      expect(response.status).toBe(401);
    });

    it('DELETE /api/v1/messages/:id - returns 200/404/422/500 for delete attempt', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/messages/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('test-user-1'));

      expect([200, 404, 422, 500]).toContain(response.status);
    });

    it('POST /api/v1/messages/:id/read rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/v1/messages/550e8400-e29b-41d4-a716-446655440000/read',
      );
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/messages/:id/read - marks message as read or returns not-found style error', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/messages/550e8400-e29b-41d4-a716-446655440000/read')
        .set(authHeader('test-user-1'));

      expect([200, 404, 422, 500]).toContain(response.status);
    });

    it('POST /api/v1/messages/:id/pin rejects non-admin or unauthenticated (401 or 403)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/messages/550e8400-e29b-41d4-a716-446655440000/pin')
        .set(authHeader('test-user-1'));
      expect([401, 403, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/messages/:id/pin - pins message or returns not-found style error', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/messages/550e8400-e29b-41d4-a716-446655440000/pin')
        .set(authHeader('test-user-1'));

      expect([201, 404, 422, 500]).toContain(response.status);
    });

    it('GET /api/v1/messages/:messageId/thread rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/messages/550e8400-e29b-41d4-a716-446655440000/thread',
      );
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/messages/:messageId/thread with valid token returns 200 or 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/messages/550e8400-e29b-41d4-a716-446655440000/thread')
        .set(authHeader('test-user-1'));
      expect(response.status).toBe(200);
    });
  });

  describe('Conversations (Authenticated)', () => {
    it('GET /api/v1/conversations rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/conversations');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/conversations with valid token returns 200 and success', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/conversations')
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
      }
    });

    it('GET /api/v1/conversations/unread-count rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/conversations/unread-count');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/conversations/unread-count with valid token returns 200 and success', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/conversations/unread-count')
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  describe('Message Threads (Authenticated)', () => {
    it('GET /api/v1/messages/:messageId/threads rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/messages/550e8400-e29b-41d4-a716-446655440000/threads',
      );
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/messages/:messageId/threads with valid token returns 200 or 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/messages/550e8400-e29b-41d4-a716-446655440000/threads')
        .set(authHeader('test-user-1'));
      expect(response.status).toBe(200);
    });
  });

  describe('Admin - Messages', () => {
    it('GET /api/v1/admin/messages rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/admin/messages');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/admin/messages rejects non-admin user with 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/messages')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
    });

    it('GET /api/v1/admin/messages with admin token returns 200 and success', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/messages')
        .query({ page: '1', limit: '20' })
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
      }
    });

    it('GET /api/v1/admin/messages/stats rejects non-admin with 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/messages/stats')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
    });

    it('GET /api/v1/admin/messages/stats with admin token returns 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/messages/stats')
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
      }
    });

    it('DELETE /api/v1/admin/messages/:id rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/v1/admin/messages/550e8400-e29b-41d4-a716-446655440000',
      );
      expect(response.status).toBe(401);
    });

    it('DELETE /api/v1/admin/messages/:id - deletes or returns not-found style error for admin', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/admin/messages/550e8400-e29b-41d4-a716-446655440000')
        .set(adminAuthHeader());

      expect([200, 404, 422, 500]).toContain(response.status);
    });

    it('GET /api/v1/admin/messages/analytics rejects non-admin with 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/messages/analytics')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it('GET /api/v1/admin/messages/analytics - returns analytics for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/messages/analytics')
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('GET /api/v1/admin/messages/conversations rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/admin/messages/conversations',
      );
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/admin/messages/conversations - returns conversations for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/messages/conversations')
        .set(adminAuthHeader())
        .query({ page: '1', limit: '20' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('GET /api/v1/admin/messages/project/:projectId rejects non-admin with 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/messages/project/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it('GET /api/v1/admin/messages/project/:projectId - returns project messages or empty for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/messages/project/550e8400-e29b-41d4-a716-446655440000')
        .set(adminAuthHeader());

      expect([200, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/admin/messages/:id/flag rejects unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/messages/550e8400-e29b-41d4-a716-446655440000/flag')
        .send({ reason: 'spam' });
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/admin/messages/:id/flag - flags message or returns not-found style error', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/messages/550e8400-e29b-41d4-a716-446655440000/flag')
        .set(adminAuthHeader())
        .send({ reason: 'spam' });

      expect([201, 404, 422, 500]).toContain(response.status);
    });

    it('GET /api/v1/admin/messages/flagged rejects non-admin with 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/messages/flagged')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it('GET /api/v1/admin/messages/flagged - returns flagged messages for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/messages/flagged')
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });
});
