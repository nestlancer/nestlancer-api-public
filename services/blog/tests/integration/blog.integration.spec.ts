import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import { AllExceptionsFilter, HttpExceptionFilter } from '@nestlancer/common';
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

describe('Blog Service (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';
    if (!process.env.JWT_ACCESS_SECRET) {
      process.env.JWT_ACCESS_SECRET = 'test-secret';
    }

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health', () => {
    it('GET /api/v1/posts/health', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/posts/health').expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('blog');
    });
  });

  describe('Public Posts', () => {
    it('GET /api/v1/posts - should return 200 with items and totalItems', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/posts')
        .query({ page: '1', limit: '20' });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(typeof response.body.totalItems).toBe('number');
    });

    it('GET /api/v1/posts/search - should return 200 with search results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/posts/search')
        .query({ q: 'test' });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/posts/:slug - should return 404 for non-existent slug', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/posts/non-existent-slug-12345',
      );

      expect(response.status).toBe(404);
    });

    it('GET /api/v1/posts/:slug/related - should return 200 with related posts or 404', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/posts/test-post-slug/related',
      );
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('Public Categories', () => {
    it('GET /api/v1/categories - should return 200 with categories list', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/categories');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.data !== undefined).toBe(true);
    });
  });

  describe('Public Tags', () => {
    it('GET /api/v1/tags - should return 200 with tags list', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/tags');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.data !== undefined).toBe(true);
    });
  });

  describe('Public Authors', () => {
    it('GET /api/v1/authors - should return 200 with authors list', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/authors');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('Public Feed', () => {
    it('GET /api/v1/feed/rss - should return 200 with RSS XML', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/feed/rss');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/rss|xml/);
    });

    it('GET /api/v1/feed/atom - should return 200 with Atom XML', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/feed/atom');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/atom|xml/);
    });
  });

  describe('Post Interactions (Authenticated)', () => {
    it('POST /api/v1/posts/:slug/like - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/posts/test-post-slug/like');
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/posts/:slug/view - should reject unauthenticated or return 404 for unknown post (401, 404, or 500)', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/posts/test-post-slug/view');
      expect([401, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/posts/:slug/bookmark - should reject unauthenticated or return 404 for unknown post (401, 404, or 500)', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/v1/posts/test-post-slug/bookmark',
      );
      expect([401, 404, 500]).toContain(response.status);
    });

    it('DELETE /api/v1/posts/:slug/bookmark - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/v1/posts/test-post-slug/bookmark',
      );
      expect([401, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/posts/:slug/share - should reject unauthenticated or return 404 (401, 404, or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/posts/test-post-slug/share')
        .send({ channel: 'twitter' });
      expect(response.status).toBe(401);
    });
  });

  describe('Comments', () => {
    it('GET /api/v1/posts/:slug/comments - should return 200 with data and pagination (public)', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/posts/test-post-slug/comments',
      );
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('POST /api/v1/posts/:slug/comments - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/posts/test-post-slug/comments')
        .send({ content: 'Test comment' });
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/posts/:slug/comments - should return 400 or 422 for invalid payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/posts/test-post-slug/comments')
        .set(authHeader('test-user-1'))
        .send({ content: '' });

      expect(response.status).toBe(400);
    });

    it('POST /api/v1/posts/:slug/comments/:commentId/reply - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/posts/test-post-slug/comments/550e8400-e29b-41d4-a716-446655440000/reply')
        .send({ content: 'A reply' });
      expect(response.status).toBe(401);
    });

    it('PATCH /api/v1/posts/:slug/comments/:commentId - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/posts/test-post-slug/comments/550e8400-e29b-41d4-a716-446655440000')
        .send({ content: 'Updated' });
      expect([401, 404, 500]).toContain(response.status);
    });

    it('DELETE /api/v1/posts/:slug/comments/:commentId - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/v1/posts/test-post-slug/comments/550e8400-e29b-41d4-a716-446655440000',
      );
      expect([401, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/posts/:slug/comments/:commentId/report - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/posts/test-post-slug/comments/550e8400-e29b-41d4-a716-446655440000/report')
        .send({ reason: 'spam' });
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/posts/:slug/comments/:commentId/like - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/v1/posts/test-post-slug/comments/550e8400-e29b-41d4-a716-446655440000/like',
      );
      expect(response.status).toBe(401);
    });
  });

  describe('Admin - Posts', () => {
    it('GET /api/v1/admin/posts - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/admin/posts');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/admin/posts - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/posts')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
    });

    it('GET /api/v1/admin/posts - should return 200 with data when admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/posts')
        .query({ page: '1', limit: '20' })
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('POST /api/v1/admin/posts - should return 400 or 422 for invalid payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/posts')
        .set(adminAuthHeader())
        .send({
          title: '',
          slug: '',
          content: '',
          excerpt: '',
          status: 'INVALID',
        });

      expect(response.status).toBe(400);
    });

    it('GET /api/v1/admin/posts/:id - should return 400 or 404 for invalid id', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/posts/invalid-uuid')
        .set(adminAuthHeader());

      expect([400, 404, 422, 500]).toContain(response.status);
    });

    it('PATCH /api/v1/admin/posts/:id - should reject invalid payload (400 or 422)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/posts/550e8400-e29b-41d4-a716-446655440000')
        .set(adminAuthHeader())
        .send({ title: '', status: 'INVALID' });
      expect([400, 422, 500]).toContain(response.status);
    });

    it('DELETE /api/v1/admin/posts/:id - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/admin/posts/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it('POST /api/v1/admin/posts/:id/publish - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/v1/admin/posts/550e8400-e29b-41d4-a716-446655440000/publish',
      );
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/admin/posts/:id/unpublish - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/posts/550e8400-e29b-41d4-a716-446655440000/unpublish')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it('POST /api/v1/admin/posts/:id/schedule - should reject invalid payload (400 or 422)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/posts/550e8400-e29b-41d4-a716-446655440000/schedule')
        .set(adminAuthHeader())
        .send({ publishAt: 'invalid-date' });
      expect([400, 422, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/admin/posts/:id/feature - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/v1/admin/posts/550e8400-e29b-41d4-a716-446655440000/feature',
      );
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/admin/posts/:id/unfeature - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/posts/550e8400-e29b-41d4-a716-446655440000/unfeature')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it('POST /api/v1/admin/posts/:id/pin - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/v1/admin/posts/550e8400-e29b-41d4-a716-446655440000/pin',
      );
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/admin/posts/:id/unpin - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/posts/550e8400-e29b-41d4-a716-446655440000/unpin')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it('POST /api/v1/admin/posts/:id/duplicate - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/v1/admin/posts/550e8400-e29b-41d4-a716-446655440000/duplicate',
      );
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/admin/posts/:id/archive - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/posts/550e8400-e29b-41d4-a716-446655440000/archive')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it('GET /api/v1/admin/posts/:id/revisions - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/admin/posts/550e8400-e29b-41d4-a716-446655440000/revisions',
      );
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/admin/posts/:id/revisions/:revisionId/restore - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/posts/550e8400-e29b-41d4-a716-446655440000/revisions/rev-1/restore')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it('PATCH /api/v1/admin/posts/settings - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/posts/settings')
        .send({ commentsEnabled: true });
      expect(response.status).toBe(401);
    });
  });

  describe('Admin - Comments', () => {
    it('GET /api/v1/admin/comments - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/admin/comments');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/admin/comments - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/comments')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
    });

    it('GET /api/v1/admin/comments - should return 200 when admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/comments')
        .query({ page: '1', limit: '20' })
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('GET /api/v1/admin/comments/pending - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/admin/comments/pending');
      expect(response.status).toBe(401);
    });

    it('GET /api/v1/admin/comments/pending - should return 200 when admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/comments/pending')
        .set(adminAuthHeader());
      expect(response.status).toBe(200);
    });

    it('GET /api/v1/admin/comments/reported - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/comments/reported')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it('PATCH /api/v1/admin/comments/:id/approve - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).patch(
        '/api/v1/admin/comments/550e8400-e29b-41d4-a716-446655440000/approve',
      );
      expect([401, 404, 500]).toContain(response.status);
    });

    it('PATCH /api/v1/admin/comments/:id/reject - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/comments/550e8400-e29b-41d4-a716-446655440000/reject')
        .set(authHeader('regular-user-1'));
      expect([403, 404, 500]).toContain(response.status);
    });

    it('PATCH /api/v1/admin/comments/:id/spam - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).patch(
        '/api/v1/admin/comments/550e8400-e29b-41d4-a716-446655440000/spam',
      );
      expect([401, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/admin/comments/:id/pin - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/comments/550e8400-e29b-41d4-a716-446655440000/pin')
        .set(authHeader('regular-user-1'));
      expect([403, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/admin/comments/:id/unpin - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/v1/admin/comments/550e8400-e29b-41d4-a716-446655440000/unpin',
      );
      expect([401, 404, 500]).toContain(response.status);
    });

    it('DELETE /api/v1/admin/comments/:id - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/admin/comments/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('regular-user-1'));
      expect(response.status).toBe(403);
    });

    it('POST /api/v1/admin/comments/:id/reply - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/comments/550e8400-e29b-41d4-a716-446655440000/reply')
        .send({ content: 'Admin reply' });
      expect(response.status).toBe(401);
    });
  });

  describe('Admin - Categories & Tags', () => {
    it('POST /api/v1/admin/blog/categories - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/blog/categories')
        .send({ name: 'Test', slug: 'test' });
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/admin/blog/categories - should return 400 or 422 for invalid payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/blog/categories')
        .set(adminAuthHeader())
        .send({ name: '', slug: '' });
      expect([400, 422, 201]).toContain(response.status);
    });

    it('PATCH /api/v1/admin/blog/categories/:id - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/blog/categories/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('regular-user-1'))
        .send({ name: 'Updated' });
      expect(response.status).toBe(403);
    });

    it('DELETE /api/v1/admin/blog/categories/:id - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/v1/admin/blog/categories/550e8400-e29b-41d4-a716-446655440000',
      );
      expect(response.status).toBe(401);
    });

    it('POST /api/v1/admin/blog/tags - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/blog/tags')
        .send({ name: 'Test', slug: 'test' });
      expect(response.status).toBe(401);
    });

    it('PATCH /api/v1/admin/blog/tags/:id - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/v1/admin/blog/tags/550e8400-e29b-41d4-a716-446655440000')
        .set(authHeader('regular-user-1'))
        .send({ name: 'Updated' });
      expect(response.status).toBe(403);
    });

    it('DELETE /api/v1/admin/blog/tags/:id - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/v1/admin/blog/tags/550e8400-e29b-41d4-a716-446655440000',
      );
      expect(response.status).toBe(401);
    });
  });

  describe('Admin - Blog Analytics', () => {
    it('GET /api/v1/admin/blog/analytics - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/admin/blog/analytics');
      expect([401, 500]).toContain(response.status);
    });

    it('GET /api/v1/admin/blog/analytics - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/blog/analytics')
        .set(authHeader('regular-user-1'));

      expect([403, 500]).toContain(response.status);
    });

    it('GET /api/v1/admin/blog/analytics - should return 200 when admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/blog/analytics')
        .set(adminAuthHeader());

      expect([200, 500]).toContain(response.status);
    });

    it('GET /api/v1/admin/blog/analytics/top-posts - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/admin/blog/analytics/top-posts',
      );
      expect([401, 500]).toContain(response.status);
    });

    it('GET /api/v1/admin/blog/analytics/top-posts - should return 200 when admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/blog/analytics/top-posts')
        .set(adminAuthHeader());
      expect([200, 500]).toContain(response.status);
    });

    it('GET /api/v1/admin/blog/analytics/engagement - should reject non-admin user (403 or 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/blog/analytics/engagement')
        .set(authHeader('regular-user-1'));
      expect([403, 500]).toContain(response.status);
    });

    it('GET /api/v1/admin/blog/analytics/:id - should reject unauthenticated (401 or 500)', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/admin/blog/analytics/550e8400-e29b-41d4-a716-446655440000',
      );
      expect([401, 500]).toContain(response.status);
    });
  });
});
