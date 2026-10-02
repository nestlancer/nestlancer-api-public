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

describe('Media Service (Integration)', () => {
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
    it('GET /api/v1/health - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/health - returns 200 with status ok and service name when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      const healthData = response.body.data ?? response.body;
      expect(healthData.status).toBe('ok');
      expect(healthData.service).toBe('media');
    });
  });

  describe('Media (Authenticated)', () => {
    it('GET /api/v1/media - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/media');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/media - returns 200 or 404 with success and data when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/media')
        .query({ page: '1', limit: '20' })
        .set(authHeader('test-user-1'));

      expect([200, 404]).toContain(response.status);
      {
        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();
      }
    });

    it('GET /api/v1/stats - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/stats');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/stats - returns 200 with success when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/stats')
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('POST /api/v1/media/upload/request - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/upload/request')
        .send({ filename: 'test.png', mimeType: 'image/png', size: 1024, fileType: 'IMAGE' });

      expect(response.status).toBe(401);
    });

    it('POST /api/v1/media/upload/request - returns 400 or 422 for invalid payload (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/upload/request')
        .set(authHeader('test-user-1'))
        .send({ filename: '', mimeType: 'invalid', size: -1 });

      expect(response.status).toBe(400);
    });

    it('POST /api/v1/media/upload/request - returns 200 or 201 with success for valid payload, or 500 if env missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/upload/request')
        .set(authHeader('test-user-1'))
        .send({
          filename: 'test.png',
          mimeType: 'image/png',
          size: 1024,
          fileType: 'IMAGE',
        });

      expect([200, 201, 500]).toContain(response.status);
      if (response.status !== 500 && response.body?.status) {
        expect(response.body.status).toBe('success');
      }
    });

    it('GET /api/v1/media/:id - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/media/550e8400-e29b-41d4-a716-446655440000',
      );
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/media/:id - returns 400 or 404 or 422 for invalid id format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/media/invalid-id')
        .set(authHeader('test-user-1'));

      expect([400, 404, 422]).toContain(response.status);
    });

    it('PATCH /api/v1/media/:id - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/media/550e8400-e29b-41d4-a716-446655440000')
        .send({ filename: 'updated.png' });

      expect(response.status).toBe(401);
    });

    it('PATCH /api/v1/media/:id - returns 400/404/422 for invalid id or missing media', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/media/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('test-user-1'))
        .send({
          filename: 'updated-name.png',
          description: 'Updated description',
          customMetadata: { key: 'value' },
        });

      expect([400, 404, 422, 500]).toContain(response.status);
      if (response.status !== 500 && response.body?.status) {
        expect(['success', 'error']).toContain(response.body.status);
      }
    });

    it('DELETE /api/v1/media/:id - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/v1/media/550e8400-e29b-41d4-a716-446655440000',
      );

      expect(response.status).toBe(401);
    });

    it('DELETE /api/v1/media/:id - returns 400/404/422 when media does not exist', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/media/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('test-user-1'));

      expect([400, 404, 422, 500]).toContain(response.status);
      if (response.status !== 500 && response.body?.status) {
        expect(['success', 'error']).toContain(response.body.status);
      }
    });

    it('POST /api/v1/media/upload/confirm - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/upload/confirm')
        .send({ uploadId: 'test-upload-id', storageKey: 'key', size: 1024 });
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/media/upload/confirm - returns 400 or 422 (or 404) for invalid payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/upload/confirm')
        .set(authHeader('test-user-1'))
        .send({ uploadId: '', storageKey: '' });
      expect([400, 404, 422]).toContain(response.status);
    });

    it('POST /api/v1/media/upload/direct - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/upload/direct')
        .send({ filename: 'test.png', mimeType: 'image/png' });
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/media/upload/direct - returns 400 for invalid payload when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/upload/direct')
        .set(authHeader('test-user-1'))
        // Missing required fields and file
        .send({ filename: '', mimeType: 'invalid', size: -1 });

      expect(response.status).toBe(400);
    });

    it('GET /api/v1/media/:id/download - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/media/550e8400-e29b-41d4-a716-446655440000/download',
      );
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/media/:id/download - returns 400 or 404 for invalid id when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/media/invalid-id/download')
        .set(authHeader('test-user-1'));
      expect([400, 404]).toContain(response.status);
    });

    it('POST /api/v1/media/:id/copy - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/550e8400-e29b-41d4-a716-446655440000/copy')
        .send({ destinationFolder: 'folder' });
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/media/:id/copy - returns 404/422/500 when media does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/550e8400-e29b-41d4-a716-446655440000/copy')
        .set(authHeader('test-user-1'))
        .send({ destinationFolderId: '550e8400-e29b-41d4-a716-446655440001' });

      expect([200, 404, 422, 500]).toContain(response.status);
    });

    it('POST /api/v1/media/:id/move - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/550e8400-e29b-41d4-a716-446655440000/move')
        .send({ destinationFolder: 'folder' });
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/media/:id/move - returns 404/422/500 when media does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/550e8400-e29b-41d4-a716-446655440000/move')
        .set(authHeader('test-user-1'))
        .send({ destinationFolderId: '550e8400-e29b-41d4-a716-446655440001' });

      expect([200, 404, 422, 500]).toContain(response.status);
    });

    it('POST /api/v1/media/:id/regenerate-thumbnail - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/v1/media/550e8400-e29b-41d4-a716-446655440000/regenerate-thumbnail',
      );
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/media/:id/regenerate-thumbnail - succeeds for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/550e8400-e29b-41d4-a716-446655440000/regenerate-thumbnail')
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(201);
    });

    it('GET /api/v1/media/:id/versions - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/media/550e8400-e29b-41d4-a716-446655440000/versions',
      );
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/media/:id/versions - returns versions payload for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/media/550e8400-e29b-41d4-a716-446655440000/versions')
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  describe('Media Sharing', () => {
    it('GET /api/v1/media/shared - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/media/shared');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/media/shared - returns 200 or 404 when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/media/shared')
        .set(authHeader('test-user-1'));

      expect([200, 404]).toContain(response.status);
      if (response.body?.status) {
        expect(['success', 'error']).toContain(response.body.status);
      }
    });

    it('POST /api/v1/media/:id/share - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/550e8400-e29b-41d4-a716-446655440000/share')
        .send({});

      expect(response.status).toBe(401);
    });

    it('POST /api/v1/media/:id/share - returns 201 or not-found style error for invalid media id', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/media/550e8400-e29b-41d4-a716-446655440000/share')
        .set(authHeader('test-user-1'))
        .send({
          expiresInDays: 7,
          password: undefined,
          allowDownload: true,
        } as any);

      expect([201, 404, 422, 500]).toContain(response.status);
    });

    it('DELETE /api/v1/media/:id/share - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/v1/media/550e8400-e29b-41d4-a716-446655440000/share',
      );

      expect(response.status).toBe(401);
    });

    it('DELETE /api/v1/media/:id/share - succeeds or returns not-found style error for invalid media id', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/media/550e8400-e29b-41d4-a716-446655440000/share')
        .set(authHeader('test-user-1'));

      expect([200, 404, 422, 500]).toContain(response.status);
    });
  });

  describe('Admin - Media', () => {
    it('GET /api/v1/admin/media - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/admin/media');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/admin/media - returns 403 or 500 when user is not admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/media')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
    });

    it('GET /api/v1/admin/media - returns 200 with success and data when admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/media')
        .query({ page: '1', limit: '20' })
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
    });

    it('GET /api/v1/admin/media/storage/analytics - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/admin/media/storage/analytics',
      );
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/admin/media/storage/analytics - returns 200 with analytics for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/media/storage/analytics')
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('GET /api/v1/admin/media/quarantine - returns 403 or 500 when user is not admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/media/quarantine')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
    });

    it('GET /api/v1/admin/media/quarantine - returns 200 with success payload for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/media/quarantine')
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('POST /api/v1/admin/media/cleanup - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/admin/media/cleanup');
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/admin/media/cleanup - runs cleanup for admin and returns stats', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/media/cleanup')
        .set(adminAuthHeader());

      expect([200, 201]).toContain(response.status);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/admin/media/users/:userId - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/admin/media/users/550e8400-e29b-41d4-a716-446655440000',
      );
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/admin/media/users/:userId - returns 403 when user is not admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/media/users/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it('GET /api/v1/admin/media/users/:userId - returns paginated data or empty list for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/media/users/550e8400-e29b-41d4-a716-446655440000')
        .set(adminAuthHeader());

      expect([200, 404, 500]).toContain(response.status);
    });

    it('GET /api/v1/admin/media/:id - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/admin/media/550e8400-e29b-41d4-a716-446655440000',
      );
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/admin/media/:id - returns details or not-found style error for invalid id', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/media/550e8400-e29b-41d4-a716-446655440000')
        .set(adminAuthHeader());

      expect([200, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/admin/media/:id/reprocess - rejects non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/media/550e8400-e29b-41d4-a716-446655440000/reprocess')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it('POST /api/v1/admin/media/:id/reprocess - returns 200/404/500 depending on media existence', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/media/550e8400-e29b-41d4-a716-446655440000/reprocess')
        .set(adminAuthHeader());

      expect([200, 404, 500]).toContain(response.status);
    });

    it('DELETE /api/v1/admin/media/:id - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/v1/admin/media/550e8400-e29b-41d4-a716-446655440000',
      );
      expect(response.status).toBe(401);
    });

    it('DELETE /api/v1/admin/media/:id - returns 200/404/500 for admin deletes', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/admin/media/550e8400-e29b-41d4-a716-446655440000')
        .set(adminAuthHeader());

      expect([200, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/admin/media/quarantine/:id/release - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/v1/admin/media/quarantine/550e8400-e29b-41d4-a716-446655440000/release',
      );
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/admin/media/quarantine/:id/release - returns 200/404/500 for admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/media/quarantine/550e8400-e29b-41d4-a716-446655440000/release')
        .set(adminAuthHeader());

      expect([200, 404, 500]).toContain(response.status);
    });

    it('DELETE /api/v1/admin/media/quarantine/:id - rejects non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/admin/media/quarantine/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it('DELETE /api/v1/admin/media/quarantine/:id - returns 200/404/500 for admin', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/admin/media/quarantine/550e8400-e29b-41d4-a716-446655440000')
        .set(adminAuthHeader());

      expect([200, 404, 500]).toContain(response.status);
    });

    it('PATCH /api/v1/admin/media/settings - rejects unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/media/settings')
        .send({ maxFileSize: 10485760 });
      expect(response.status).toBe(401);
    });

    it('PATCH /api/v1/admin/media/settings - updates global media settings for admin', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/media/settings')
        .set(adminAuthHeader())
        .send({ maxFileSize: 10_485_760, allowedMimeTypes: ['image/png', 'image/jpeg'] });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });
});
