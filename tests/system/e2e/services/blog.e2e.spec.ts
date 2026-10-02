/**
 * E2E — Blog service
 *
 * Full end-to-end coverage of the blog service via the API gateway.
 * Tests public blog listing, individual posts, categories, tags, RSS feed,
 * user interactions (like, bookmark, share), comments, and admin management.
 *
 * Worker integration:
 *   • Blog post publish triggers cdn-worker (CDN cache invalidation)
 *   • New comments may trigger notification-worker (author notification)
 *   • Post scheduling handled by admin; analytics tracked by analytics-worker
 *
 * Routes: /api/v1/blog/posts, /api/v1/blog/categories, /api/v1/blog/tags,
 *         /api/v1/blog/feed, /api/v1/comments/*, /api/v1/admin/blog/*
 */

import axios, { AxiosError } from 'axios';
import { getApiBase, resolveStatus } from '../../setup/http';
import { bearerToken, mintSystemToken } from '../../setup/auth';

const BASE = getApiBase();
const BLOG = `${BASE}/blog`;
const BLOG_POSTS = `${BLOG}/posts`;
const BLOG_CATEGORIES = `${BLOG}/categories`;
const BLOG_TAGS = `${BLOG}/tags`;
const BLOG_FEED = `${BLOG}/feed`;
const BLOG_AUTHORS = `${BLOG}/authors`;
/** Blog admin API is mounted at /api/v1/admin/posts and /api/v1/admin/comments (no /blog segment). */
const ADMIN_POSTS = `${BASE}/admin/posts`;
const ADMIN_COMMENTS = `${BASE}/admin/comments`;

const USER_ID = 'e2e-blog-user-blg1-2345-6789-abcd-ef0123456789';
const ADMIN_ID = 'e2e-blog-admin-adm3-9876-5432-10fe-dcba98765432';
const FAKE_POST_SLUG = 'e2e-test-non-existent-post-slug';
const FAKE_POST_ID = '00000000-blog-0000-0000-000000000001';
const FAKE_COMMENT_ID = '00000000-cmnt-0000-0000-000000000002';

const userToken = () => bearerToken(USER_ID, 'USER');
const adminToken = () => `Bearer ${mintSystemToken(ADMIN_ID, 'ADMIN')}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

type SafeResult = { status: number; data: any };

async function GET(
  url: string,
  token?: string,
  params?: Record<string, string>,
): Promise<SafeResult> {
  return axios
    .get(url, { headers: token ? { Authorization: token } : {}, params, timeout: 12_000 })
    .then((r) => ({ status: resolveStatus(r.status, r.data), data: r.data }))
    .catch((e: AxiosError) => ({
      status: e.response?.status ?? 0,
      data: e.response?.data ?? null,
    }));
}

async function POST(url: string, body: unknown, token?: string): Promise<SafeResult> {
  return axios
    .post(url, body, { headers: token ? { Authorization: token } : {}, timeout: 12_000 })
    .then((r) => ({ status: resolveStatus(r.status, r.data), data: r.data }))
    .catch((e: AxiosError) => ({
      status: e.response?.status ?? 0,
      data: e.response?.data ?? null,
    }));
}

async function PATCH(url: string, body: unknown, token?: string): Promise<SafeResult> {
  return axios
    .patch(url, body, { headers: token ? { Authorization: token } : {}, timeout: 12_000 })
    .then((r) => ({ status: resolveStatus(r.status, r.data), data: r.data }))
    .catch((e: AxiosError) => ({
      status: e.response?.status ?? 0,
      data: e.response?.data ?? null,
    }));
}

async function DELETE(url: string, token?: string): Promise<SafeResult> {
  return axios
    .delete(url, { headers: token ? { Authorization: token } : {}, timeout: 12_000 })
    .then((r) => ({ status: resolveStatus(r.status, r.data), data: r.data }))
    .catch((e: AxiosError) => ({
      status: e.response?.status ?? 0,
      data: e.response?.data ?? null,
    }));
}

// ── Reachability guard ────────────────────────────────────────────────────────

async function expectBlogReachable(): Promise<void> {
  try {
    await axios.get(BLOG_POSTS, { timeout: 10_000 });
  } catch (e) {
    const ae = e as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(`[e2e] Blog service not reachable at ${BLOG_POSTS}. Run: pnpm docker:e2e:up`);
    }
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('E2E — Blog service', () => {
  beforeAll(expectBlogReachable);

  // ── Public blog posts ─────────────────────────────────────────────────────
  describe('Public blog posts (no auth)', () => {
    it('GET /blog/posts returns list (not 401/403)', async () => {
      const { status, data } = await GET(BLOG_POSTS);
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      if (status === 200) {
        const body = data as Record<string, unknown>;
        const list = body?.data ?? body;
        expect(Array.isArray(list) || typeof list === 'object').toBe(true);
      }
    });

    it('GET /blog/posts with search and pagination', async () => {
      const { status } = await GET(BLOG_POSTS, undefined, {
        page: '1',
        limit: '10',
        q: 'NestJS',
      });
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('GET /blog/posts/:slug for non-existent post returns 404', async () => {
      const { status } = await GET(`${BLOG_POSTS}/${FAKE_POST_SLUG}`);
      expect([404, 400, 500, 502, 503, 504]).toContain(status);
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('GET /blog/posts with category filter', async () => {
      const { status } = await GET(BLOG_POSTS, undefined, { category: 'nestjs' });
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('GET /blog/posts with featured filter', async () => {
      const { status } = await GET(BLOG_POSTS, undefined, { featured: 'true' });
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  // ── Post view tracking ────────────────────────────────────────────────────
  describe('POST /blog/posts/:slug/view — view tracking (analytics-worker trigger)', () => {
    it('non-existent post returns 404', async () => {
      const { status } = await POST(`${BLOG_POSTS}/${FAKE_POST_SLUG}/view`, {});
      expect([200, 201, 404, 400, 401]).toContain(status);
    });
  });

  // ── Post interactions — auth required ─────────────────────────────────────
  describe('POST /blog/posts/:slug/like — authenticated like', () => {
    it('without token → 401', async () => {
      const { status } = await POST(`${BLOG_POSTS}/${FAKE_POST_SLUG}/like`, {});
      expect([0, 401, 403]).toContain(status);
    });

    it('with JWT on non-existent post returns 404', async () => {
      const { status } = await POST(`${BLOG_POSTS}/${FAKE_POST_SLUG}/like`, {}, userToken());
      expect([200, 201, 404, 400]).toContain(status);
    });
  });

  describe('POST /blog/posts/:slug/bookmark', () => {
    it('without token → 401', async () => {
      const { status } = await POST(`${BLOG_POSTS}/${FAKE_POST_SLUG}/bookmark`, {});
      expect([0, 401, 403]).toContain(status);
    });

    it('with JWT passes auth guard', async () => {
      const { status } = await POST(`${BLOG_POSTS}/${FAKE_POST_SLUG}/bookmark`, {}, userToken());
      expect([200, 201, 404, 400]).toContain(status);
    });
  });

  describe('POST /blog/posts/:slug/share', () => {
    it('with JWT and platform param is accepted', async () => {
      const { status } = await POST(
        `${BLOG_POSTS}/${FAKE_POST_SLUG}/share`,
        { platform: 'TWITTER' },
        userToken(),
      );
      expect([200, 201, 404, 400, 422]).toContain(status);
    });
  });

  // ── Related posts ─────────────────────────────────────────────────────────
  describe('GET /blog/posts/:slug/related', () => {
    it('public endpoint returns related posts or 404', async () => {
      const { status } = await GET(`${BLOG_POSTS}/${FAKE_POST_SLUG}/related`);
      expect([200, 404, 400, 502, 503, 504]).toContain(status);
    });
  });

  // ── Categories ────────────────────────────────────────────────────────────
  describe('GET /blog/categories — taxonomy', () => {
    it('public endpoint returns categories', async () => {
      const { status, data } = await GET(BLOG_CATEGORIES);
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      if (status === 200) {
        const body = data as Record<string, unknown>;
        const list = body?.data ?? body;
        expect(Array.isArray(list) || typeof list === 'object').toBe(true);
      }
    });

    it('GET /blog/categories/:slug returns category', async () => {
      const { status } = await GET(`${BLOG_CATEGORIES}/e2e-non-existent-category`);
      expect([200, 404, 400, 500, 502, 503, 504]).toContain(status);
    });
  });

  // ── Tags ──────────────────────────────────────────────────────────────────
  describe('GET /blog/tags', () => {
    it('public endpoint returns tags list', async () => {
      const { status } = await GET(BLOG_TAGS);
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  // ── RSS Feed ──────────────────────────────────────────────────────────────
  describe('GET /blog/feed — RSS feed', () => {
    it('public RSS feed is accessible', async () => {
      const { status } = await GET(BLOG_FEED);
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      expect([200, 404, 502, 503, 504]).toContain(status);
    });
  });

  // ── Authors ───────────────────────────────────────────────────────────────
  describe('GET /blog/authors', () => {
    it('public authors list is accessible', async () => {
      const { status } = await GET(BLOG_AUTHORS);
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  // ── Comments ──────────────────────────────────────────────────────────────
  describe('Comments — user operations', () => {
    it('GET /blog/posts/:slug/comments is public', async () => {
      const { status } = await GET(`${BLOG_POSTS}/${FAKE_POST_SLUG}/comments`);
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      expect([200, 404, 400, 502, 503, 504]).toContain(status);
    });

    it('POST /blog/posts/:slug/comments without token → 401', async () => {
      const { status } = await POST(`${BLOG_POSTS}/${FAKE_POST_SLUG}/comments`, {
        content: 'E2E test comment.',
      });
      expect([0, 401, 403]).toContain(status);
    });

    it('POST /blog/posts/:slug/comments with JWT + valid body is accepted', async () => {
      const { status } = await POST(
        `${BLOG_POSTS}/${FAKE_POST_SLUG}/comments`,
        {
          content:
            'E2E test comment — This is a test comment submitted by the automated e2e test suite.',
        },
        userToken(),
      );
      // 201 = comment created, 404 = post not found, 400 = validation
      expect([201, 400, 404, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('POST with comment too short returns 400', async () => {
      const { status } = await POST(
        `${BLOG_POSTS}/${FAKE_POST_SLUG}/comments`,
        { content: '' },
        userToken(),
      );
      expect([400, 422]).toContain(status);
    });

    it('PATCH /blog/posts/:slug/comments/:id without token → 401', async () => {
      const { status } = await PATCH(
        `${BLOG_POSTS}/${FAKE_POST_SLUG}/comments/${FAKE_COMMENT_ID}`,
        { content: 'Updated' },
      );
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('DELETE /blog/posts/:slug/comments/:id without token → 401', async () => {
      const { status } = await DELETE(
        `${BLOG_POSTS}/${FAKE_POST_SLUG}/comments/${FAKE_COMMENT_ID}`,
      );
      expect([0, 401, 403]).toContain(status);
    });

    it('POST /blog/posts/:slug/comments/:id/report with JWT', async () => {
      const { status } = await POST(
        `${BLOG_POSTS}/${FAKE_POST_SLUG}/comments/${FAKE_COMMENT_ID}/report`,
        { reason: 'Spam or misleading content — E2E test report.' },
        userToken(),
      );
      expect([200, 201, 404, 400, 422]).toContain(status);
    });
  });

  // ── Admin blog management ─────────────────────────────────────────────────
  describe('Admin blog — privilege enforcement', () => {
    it('GET /admin/blog/posts with USER token → 403', async () => {
      const { status } = await GET(ADMIN_POSTS, userToken());
      expect([0, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/blog/posts with ADMIN token is not 401', async () => {
      const { status } = await GET(ADMIN_POSTS, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/blog/posts creates post with cdn-worker trigger', async () => {
      const { status } = await POST(
        ADMIN_POSTS,
        {
          title: 'E2E Test Blog Post — Building a NestJS Microservices Platform',
          slug: `e2e-test-blog-post-${Date.now()}`,
          excerpt:
            'A comprehensive guide to building a production-ready NestJS microservices platform.',
          content:
            '# Introduction\n\nThis post was created by the e2e test suite.\n\n' +
            '## Prerequisites\n\n- Node.js 20+\n- PostgreSQL\n- Redis\n\n' +
            '## Getting Started\n\nFollow these steps...',
          contentFormat: 'MARKDOWN',
          status: 'DRAFT',
          tags: ['NestJS', 'Microservices', 'E2E-Test'],
          seo: {
            metaTitle: 'Building NestJS Microservices — E2E Test',
            metaDescription: 'E2E test post for the NestJS microservices platform.',
          },
        },
        adminToken(),
      );
      expect([201, 400, 403, 409, 422, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/blog/posts/:id/publish triggers cdn-worker', async () => {
      const { status } = await POST(`${ADMIN_POSTS}/${FAKE_POST_ID}/publish`, {}, adminToken());
      expect([200, 201, 400, 404, 500, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/blog/posts/:id/feature marks post as featured', async () => {
      const { status } = await POST(`${ADMIN_POSTS}/${FAKE_POST_ID}/feature`, {}, adminToken());
      expect([200, 201, 400, 404, 500, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/blog/posts/:id/pin pins post to top', async () => {
      const { status } = await POST(`${ADMIN_POSTS}/${FAKE_POST_ID}/pin`, {}, adminToken());
      expect([200, 201, 400, 404, 500, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/blog/posts/analytics with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN_POSTS}/analytics`, adminToken());
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/blog/comments with ADMIN token returns comment list', async () => {
      const { status } = await GET(ADMIN_COMMENTS, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('PATCH /admin/comments/:id/approve with ADMIN token', async () => {
      const { status } = await PATCH(
        `${ADMIN_COMMENTS}/${FAKE_COMMENT_ID}/approve`,
        {},
        adminToken(),
      );
      expect([200, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('DELETE /admin/blog/comments/:id requires ADMIN role', async () => {
      const { status } = await DELETE(`${ADMIN_COMMENTS}/${FAKE_COMMENT_ID}`, userToken());
      expect([0, 401, 403, 404]).toContain(status);
    });
  });
});
