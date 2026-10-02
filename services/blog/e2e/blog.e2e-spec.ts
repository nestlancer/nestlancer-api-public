import request from 'supertest';
import { createTestJwt } from '../../../libs/testing/src/helpers/test-auth.helper';
import { setupApp, teardownApp, getAppUrl, getGlobalPrefix } from './setup';

const prefix = getGlobalPrefix();
const basePath = () => `${getAppUrl()}/${prefix}`.replace(/\/+$/, '');

function authHeader(userId: string, role: 'USER' | 'ADMIN' = 'USER') {
  const token = createTestJwt(
    { sub: userId, email: `${userId}@test.com`, role },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

describe('Blog Service - Public APIs (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET /posts/health returns 200 and blog status envelope', async () => {
      const res = await request(basePath()).get('/posts/health').expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data?.status).toBe('ok');
      expect(res.body.data?.service).toBe('blog');
    });
  });

  describe('Public posts & taxonomy', () => {
    it('GET /posts returns 200 and posts list structure', async () => {
      const res = await request(basePath()).get('/posts').query({ page: 1, limit: 10 }).expect(200);

      expect(res.body.status).toBe('success');
      const list = Array.isArray(res.body.data) ? res.body.data : res.body.data?.items;
      expect(Array.isArray(list)).toBe(true);
    });

    it('GET /posts/search with too-short query returns 400 validation error', async () => {
      const res = await request(basePath())
        .get('/posts/search')
        .query({ q: 'a' }) // MinLength(2)
        .expect(400);

      expect(res.body.status).toBe('error');
    });

    it('GET /posts/search with a null-byte query returns 400', async () => {
      const res = await request(basePath()).get('/posts/search?q=%00').expect(400);

      expect(res.body.status).toBe('error');
    });

    it('GET /posts/:slug for non-existent slug returns 404 error envelope', async () => {
      const res = await request(basePath()).get('/posts/non-existent-slug').expect(404);

      expect(res.body.status).toBe('error');
    });

    it('GET /posts/:slug/related for non-existent slug returns 200 and empty data array', async () => {
      const res = await request(basePath()).get('/posts/non-existent-slug/related').expect(200);

      const payload = res.body.data ?? res.body;
      const data = Array.isArray(payload) ? payload : payload?.data;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    it('POST /posts/:slug/view without token returns 401 (auth endpoint)', async () => {
      const res = await request(basePath()).post('/posts/non-existent-slug/view').expect(401);
      expect(res.body.status).toBe('error');
    });

    it('GET /posts/:slug/comments for missing post returns 200 with empty data array and pagination', async () => {
      const res = await request(basePath())
        .get('/posts/non-existent-slug/comments')
        .query({ page: 1, limit: 10 })
        .expect(200);

      const payload = res.body.data ?? res.body;
      const data = Array.isArray(payload) ? payload : (payload?.data ?? []);
      const pagination = payload?.pagination ?? res.body.pagination;
      expect(Array.isArray(data)).toBe(true);
      expect(pagination).toBeDefined();
      expect(pagination.total).toBe(0);
    });

    it('GET /categories returns 200 and categories array', async () => {
      const res = await request(basePath()).get('/categories').expect(200);

      expect(res.body.status).toBe('success');
      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('GET /tags returns 200 and tags array', async () => {
      const res = await request(basePath()).get('/tags').expect(200);

      expect(res.body.status).toBe('success');
      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('GET /authors returns 200 and authors array', async () => {
      const res = await request(basePath()).get('/authors').expect(200);

      expect(res.body.status).toBe('success');
      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('GET /feed/rss returns 200 and RSS payload', async () => {
      const res = await request(basePath()).get('/feed/rss').expect(200);

      expect(res.text.length).toBeGreaterThan(0);
    });

    it('GET /feed/atom returns 200 and Atom payload', async () => {
      const res = await request(basePath()).get('/feed/atom').expect(200);

      expect(res.text.length).toBeGreaterThan(0);
    });
  });
});

describe('Blog Service - Auth & Admin (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('User interactions auth', () => {
    it('POST /posts/:slug/like without token returns 401', async () => {
      const res = await request(basePath()).post('/posts/test-slug/like').expect(401);
      expect(res.body.status).toBe('error');
    });

    it('POST /posts/:slug/bookmark without token returns 401', async () => {
      const res = await request(basePath()).post('/posts/e2e-blog-post/bookmark').expect(401);
      expect(res.body.status).toBe('error');
    });

    it('DELETE /posts/:slug/bookmark without token returns 401', async () => {
      const res = await request(basePath()).delete('/posts/e2e-blog-post/bookmark').expect(401);
      expect(res.body.status).toBe('error');
    });

    it('POST /posts/:slug/view without token returns 401 when auth endpoint is hit', async () => {
      const res = await request(basePath()).post('/posts/e2e-blog-post/view').expect(401);
      expect(res.body.status).toBe('error');
    });

    it('POST /posts/:slug/share without token returns 401', async () => {
      const res = await request(basePath()).post('/posts/test-slug/share').expect(401);
      expect(res.body.status).toBe('error');
    });
  });

  describe('Admin auth and authorization', () => {
    it('GET /admin/posts without token returns 401', async () => {
      const res = await request(basePath()).get('/admin/posts').expect(401);
      expect(res.body.status).toBe('error');
    });

    it('GET /admin/posts with USER token returns 403', async () => {
      const res = await request(basePath())
        .get('/admin/posts')
        .set(authHeader('e2e-blog-user-1', 'USER'))
        .expect(403);

      expect(res.body.status).toBe('error');
    });

    it('GET /admin/posts with ADMIN token returns 200 and list envelope', async () => {
      const res = await request(basePath())
        .get('/admin/posts')
        .set(authHeader('e2e-blog-admin-1', 'ADMIN'))
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
    });

    it('POST /admin/posts with empty body returns 400 validation error', async () => {
      const res = await request(basePath())
        .post('/admin/posts')
        .set(authHeader('e2e-blog-admin-1', 'ADMIN'))
        .send({})
        .expect(400);

      expect(res.body.status).toBe('error');
    });
  });

  describe('Admin comments', () => {
    const adminHeaders = authHeader('e2e-blog-admin-1', 'ADMIN');
    const userHeaders = authHeader('e2e-blog-user-1', 'USER');

    it('GET /admin/comments without token returns 401', async () => {
      const res = await request(basePath()).get('/admin/comments').expect(401);
      expect(res.body.status).toBe('error');
    });

    it('GET /admin/comments with USER token returns 403', async () => {
      const res = await request(basePath()).get('/admin/comments').set(userHeaders).expect(403);
      expect(res.body.status).toBe('error');
    });

    it('GET /admin/comments with ADMIN token returns 200 and paginated data', async () => {
      const res = await request(basePath()).get('/admin/comments').set(adminHeaders).expect(200);

      const payload = res.body.data ?? res.body;
      const list = Array.isArray(payload) ? payload : payload?.data;
      const pagination = payload?.pagination ?? res.body.pagination;
      expect(Array.isArray(list)).toBe(true);
      expect(pagination).toBeDefined();
    });

    it('GET /admin/comments/pending with ADMIN returns 200 and paginated data', async () => {
      const res = await request(basePath())
        .get('/admin/comments/pending')
        .set(adminHeaders)
        .expect(200);

      const payload = res.body.data ?? res.body;
      const data = Array.isArray(payload) ? payload : payload?.data;
      const pagination = payload?.pagination ?? res.body.pagination;
      expect(Array.isArray(data)).toBe(true);
      expect(pagination).toBeDefined();
    });

    it('GET /admin/comments/reported with ADMIN returns 200 and paginated data', async () => {
      const res = await request(basePath())
        .get('/admin/comments/reported')
        .set(adminHeaders)
        .expect(200);

      const payload = res.body.data ?? res.body;
      const data = Array.isArray(payload) ? payload : payload?.data;
      const pagination = payload?.pagination ?? res.body.pagination;
      expect(Array.isArray(data)).toBe(true);
      expect(pagination).toBeDefined();
    });

    it('POST /admin/comments/:id/approve with ADMIN returns 201 and approved status', async () => {
      const res = await request(basePath())
        .post('/admin/comments/00000000-0000-0000-0000-000000000001/approve')
        .set(adminHeaders)
        .expect(201);

      const body = res.body.data ?? res.body;
      expect(body.id).toBeDefined();
      expect(body.status).toBe('APPROVED');
    });

    it('POST /admin/comments/:id/reject with ADMIN returns 201 and rejected status', async () => {
      const res = await request(basePath())
        .post('/admin/comments/00000000-0000-0000-0000-000000000002/reject')
        .set(adminHeaders)
        .expect(201);

      const body = res.body.data ?? res.body;
      expect(body.id).toBeDefined();
      expect(body.status).toBe('REJECTED');
    });

    it('POST /admin/comments/:id/spam with ADMIN returns 201 and spam status', async () => {
      const res = await request(basePath())
        .post('/admin/comments/00000000-0000-0000-0000-000000000003/spam')
        .set(adminHeaders)
        .expect(201);

      const body = res.body.data ?? res.body;
      expect(body.id).toBeDefined();
      expect(body.status).toBe('SPAM');
    });

    it('POST /admin/comments/:id/pin with ADMIN returns 201 and pinned true', async () => {
      const res = await request(basePath())
        .post('/admin/comments/00000000-0000-0000-0000-000000000004/pin')
        .set(adminHeaders)
        .expect(201);

      const body = res.body.data ?? res.body;
      expect(body.id).toBeDefined();
      expect(body.pinned).toBe(true);
    });

    it('POST /admin/comments/:id/unpin with ADMIN returns 201 and pinned false', async () => {
      const res = await request(basePath())
        .post('/admin/comments/00000000-0000-0000-0000-000000000005/unpin')
        .set(adminHeaders)
        .expect(201);

      const body = res.body.data ?? res.body;
      expect(body.id).toBeDefined();
      expect(body.pinned).toBe(false);
    });
  });

  describe('Admin taxonomy & authors', () => {
    const adminHeaders = authHeader('e2e-blog-admin-1', 'ADMIN');

    it('GET /admin/blog/categories with ADMIN returns 200 and data array', async () => {
      const res = await request(basePath())
        .get('/admin/blog/categories')
        .set(adminHeaders)
        .expect(200);

      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('GET /admin/blog/tags with ADMIN returns 200 and data array', async () => {
      const res = await request(basePath()).get('/admin/blog/tags').set(adminHeaders).expect(200);

      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('GET /admin/blog/authors with ADMIN returns 200 and data array', async () => {
      const res = await request(basePath())
        .get('/admin/blog/authors')
        .set(adminHeaders)
        .expect(200);

      const payload = res.body.data ?? res.body;
      const data = Array.isArray(payload) ? payload : payload?.data;
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Admin analytics', () => {
    const adminHeaders = authHeader('e2e-blog-admin-1', 'ADMIN');
    const userHeaders = authHeader('e2e-blog-user-1', 'USER');

    it('GET /admin/blog/analytics without token returns 401', async () => {
      const res = await request(basePath()).get('/admin/blog/analytics').expect(401);
      expect(res.body.status).toBe('error');
    });

    it('GET /admin/blog/analytics with USER token returns 403', async () => {
      const res = await request(basePath())
        .get('/admin/blog/analytics')
        .set(userHeaders)
        .expect(403);
      expect(res.body.status).toBe('error');
    });

    it('GET /admin/blog/analytics with ADMIN returns 200 and analytics payload', async () => {
      const res = await request(basePath())
        .get('/admin/blog/analytics')
        .set(adminHeaders)
        .expect(200);

      const payload = res.body.data ?? res.body;
      expect(typeof payload.totalViews).toBe('number');
      expect(typeof payload.totalLikes).toBe('number');
      expect(Array.isArray(payload.topPosts)).toBe(true);
    });

    it('GET /admin/blog/analytics/top-posts with ADMIN returns 200 and data array', async () => {
      const res = await request(basePath())
        .get('/admin/blog/analytics/top-posts')
        .set(adminHeaders)
        .expect(200);

      const payload = res.body.data ?? res.body;
      expect(payload.period).toBeDefined();
      expect(Array.isArray(payload.data)).toBe(true);
    });

    it('GET /admin/blog/analytics/:id with ADMIN returns 200 and either error or analytics payload', async () => {
      const res = await request(basePath())
        .get('/admin/blog/analytics/00000000-0000-0000-0000-000000000999')
        .set(adminHeaders)
        .expect(200);

      const payload = res.body.data ?? res.body;
      expect(
        typeof payload.error === 'string' || (payload.postId && typeof payload.views === 'number'),
      ).toBe(true);
    });
  });

  describe('Public authors detail', () => {
    it('GET /authors/:id returns 200 and success envelope', async () => {
      const res = await request(basePath()).get('/authors/test-author-id').expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data?.id).toBe('test-author-id');
      expect(Array.isArray(res.body.data?.posts)).toBe(true);
    });
  });
});
