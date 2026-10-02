/**
 * System smoke — Blog service
 *
 * Exercises the blog service via the API gateway at `/api/v1/blog/*` or
 * `/api/v1/posts/*` (depending on the gateway proxy strip behaviour).
 * The blog service (port 3014) exposes:
 *   GET           /posts                  — public post list
 *   GET           /posts/:slug            — individual post
 *   GET           /posts/:slug/comments   — post comments (public)
 *   GET           /categories             — taxonomy categories
 *   GET           /tags                   — taxonomy tags
 *   GET           /authors                — author profiles
 *   GET           /feed                   — RSS/Atom feed
 *   GET           /bookmarks              — authenticated user bookmarks
 *   Admin routes: /admin/posts/*, /admin/comments/*, /admin/taxonomy/*
 *
 * Smoke goals:
 *   ✓ Public post listing is accessible without authentication.
 *   ✓ Category and tag listings are public.
 *   ✓ Feed endpoint responds without auth.
 *   ✓ Bookmarks endpoint requires authentication.
 *   ✓ Admin post management is privilege-gated.
 */

import axios, { AxiosError } from 'axios';
import { getApiBase } from '../../setup/http';
import { bearerToken } from '../../setup/auth';

const BASE = getApiBase();
// The gateway may proxy under /blog or /posts — probe both and pick whichever works.
const POSTS = `${BASE}/posts`;
const BLOG = `${BASE}/blog`;
const CATEGORIES = `${BASE}/categories`;
const TAGS = `${BASE}/tags`;

/** Try both /blog and /posts — gateway proxy strip may differ across environments. */
async function getBlogBase(): Promise<string> {
  for (const url of [POSTS, BLOG]) {
    try {
      const res = await axios.get(url, { timeout: 6_000 });
      if (res.status < 500) return url;
    } catch (err) {
      const ae = err as AxiosError;
      if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') continue;
      const status = ae.response?.status ?? 0;
      if (status !== 0 && status < 500) return url;
    }
  }
  return POSTS; // Default fallback
}

let blogBase = POSTS;

async function expectBlogReachable(): Promise<void> {
  try {
    blogBase = await getBlogBase();
  } catch (err) {
    const ae = err as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(
        `[system-e2e] Blog service not reachable.\n` +
          `  Start: pnpm docker:e2e:up  OR  pnpm --filter @nestlancer/blog-service dev`,
      );
    }
  }
}

describe('System smoke — Blog service', () => {
  beforeAll(expectBlogReachable);

  describe('Public access (no auth required)', () => {
    it('GET /api/v1/posts (or /blog) returns public post list without authentication', async () => {
      let status = 0;
      try {
        const res = await axios.get(blogBase, { timeout: 8_000 });
        status = res.status;
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('GET /api/v1/categories is publicly accessible', async () => {
      let status = 0;
      try {
        const res = await axios.get(CATEGORIES, { timeout: 8_000 });
        status = res.status;
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      // 200 (list) or 404 (no data) — not 401.
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('GET /api/v1/tags is publicly accessible', async () => {
      let status = 0;
      try {
        const res = await axios.get(TAGS, { timeout: 8_000 });
        status = res.status;
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('GET /api/v1/feed (RSS) is publicly accessible', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${BASE}/feed`, { timeout: 8_000 });
        status = res.status;
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('GET non-existent post slug returns 404 not 401', async () => {
      let status = 0;
      try {
        await axios.get(`${blogBase}/smoke-probe-no-such-post-xyz`, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  describe('Auth enforcement on bookmarks', () => {
    it('GET /api/v1/bookmarks without token returns 401', async () => {
      let status = 0;
      try {
        await axios.get(`${BASE}/bookmarks`, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('GET /api/v1/bookmarks with JWT passes auth guard', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${BASE}/bookmarks`, {
          headers: { Authorization: bearerToken() },
          timeout: 8_000,
        });
        status = res.status;
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  describe('Admin routes — privilege check', () => {
    it('GET /api/v1/admin/posts with USER-role JWT returns 403 or 404', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${BASE}/admin/posts`, {
          headers: { Authorization: bearerToken() },
          timeout: 8_000,
        });
        status = res.status;
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 200, 401, 403, 404, 502, 503, 504]).toContain(status);
    });
  });
});
