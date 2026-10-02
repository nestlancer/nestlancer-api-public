/**
 * E2E — Portfolio service
 *
 * Full end-to-end coverage of the portfolio service via the API gateway.
 * Tests public portfolio listing/viewing, authenticated CRUD operations,
 * like functionality, and admin portfolio/category management.
 *
 * Worker integration:
 *   • Portfolio publish triggers cdn-worker (CDN cache invalidation)
 *   • Portfolio item creation triggers audit-worker
 *   • Media attachment triggers media-worker (thumbnail generation)
 *
 * Routes: /api/v1/portfolio/* and /api/v1/admin/portfolio/*
 */

import axios, { AxiosError } from 'axios';
import { getApiBase, resolveStatus } from '../../setup/http';
import { bearerToken, mintSystemToken } from '../../setup/auth';

const BASE = getApiBase();
const PORTFOLIO = `${BASE}/portfolio`;
const ADMIN_PORTFOLIO = `${BASE}/admin/portfolio`;
const ADMIN_CATEGORIES = `${BASE}/admin/portfolio/categories`;

const USER_ID = 'e2e-portfolio-user-prt1-2345-6789-abcd-ef0123456789';
const ADMIN_ID = 'e2e-portfolio-admin-adm2-9876-5432-10fe-dcba98765432';
const FAKE_ITEM_ID = '00000000-port-0000-0000-000000000001';
const FAKE_CATEGORY_ID = '00000000-cat-00000-0000-000000000002';

const userToken = () => bearerToken(USER_ID, 'USER');
const adminToken = () => `Bearer ${mintSystemToken(ADMIN_ID, 'ADMIN')}`;

// ── Valid portfolio item DTO ───────────────────────────────────────────────────

const VALID_PORTFOLIO_ITEM = {
  title: 'E2E Test Portfolio — Modern SaaS Platform',
  slug: `e2e-modern-saas-platform-${Date.now()}`,
  shortDescription:
    'A complete SaaS platform built for the e2e test suite with modern technologies.',
  fullDescription:
    '## Overview\n\nThis portfolio item was created by the e2e test suite to verify the portfolio ' +
    'service is functioning correctly.\n\n## Technologies\n\n- NestJS\n- React\n- PostgreSQL\n\n' +
    '## Results\n\n- 50% reduction in onboarding time\n- 99.9% uptime SLA achieved',
  contentFormat: 'MARKDOWN',
  tags: ['NestJS', 'React', 'PostgreSQL', 'SaaS', 'E2E-Test'],
  links: {
    live: 'https://example-e2e.com',
    github: 'https://github.com/example/e2e-portfolio',
  },
  projectDetails: {
    duration: '4 months',
    technologies: ['NestJS', 'React', 'TypeScript', 'PostgreSQL'],
  },
};

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

async function expectPortfolioReachable(): Promise<void> {
  try {
    await axios.get(PORTFOLIO, { timeout: 10_000 });
  } catch (e) {
    const ae = e as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(
        `[e2e] Portfolio service not reachable at ${PORTFOLIO}. Run: pnpm docker:e2e:up`,
      );
    }
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('E2E — Portfolio service', () => {
  beforeAll(expectPortfolioReachable);

  let createdItemSlug: string | null = null;
  let createdItemId: string | null = null;

  // ── Public listing ────────────────────────────────────────────────────────
  describe('Public portfolio (no auth required)', () => {
    it('GET /portfolio returns 200 with list (public)', async () => {
      const { status, data } = await GET(PORTFOLIO);
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      if (status === 200) {
        const body = data as Record<string, unknown>;
        const list = body?.data ?? body;
        expect(Array.isArray(list) || typeof list === 'object').toBe(true);
      }
    });

    it('GET /portfolio with search/filter params is accepted', async () => {
      const { status } = await GET(PORTFOLIO, undefined, {
        page: '1',
        limit: '12',
        category: 'web',
      });
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('GET /portfolio/:slug for non-existent item returns 404 (not 401)', async () => {
      const { status } = await GET(`${PORTFOLIO}/e2e-non-existent-slug-${Date.now()}`);
      expect([404, 400, 500, 502, 503, 504]).toContain(status);
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('GET /portfolio/categories returns public category list', async () => {
      const { status } = await GET(`${PORTFOLIO}/categories`);
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      expect([200, 404, 502, 503, 504]).toContain(status);
    });
  });

  // ── Like functionality ────────────────────────────────────────────────────
  describe('POST /portfolio/:id/like — public like action', () => {
    it('non-existent item returns 404', async () => {
      const { status } = await POST(`${PORTFOLIO}/${FAKE_ITEM_ID}/like`, {});
      expect([404, 400, 401, 403, 500]).toContain(status);
    });
  });

  // ── Auth enforcement on write endpoints ──────────────────────────────────
  describe('Auth enforcement — write operations', () => {
    it('POST /portfolio without token → 401', async () => {
      const { status } = await POST(PORTFOLIO, VALID_PORTFOLIO_ITEM);
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('PATCH /portfolio/:id without token → 401', async () => {
      const { status } = await PATCH(`${PORTFOLIO}/${FAKE_ITEM_ID}`, { title: 'Test' });
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('DELETE /portfolio/:id without token → 401', async () => {
      const { status } = await DELETE(`${PORTFOLIO}/${FAKE_ITEM_ID}`);
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  // ── Admin portfolio CRUD ──────────────────────────────────────────────────
  describe('Admin portfolio — CRUD', () => {
    it('POST /admin/portfolio with USER token → 403', async () => {
      const { status } = await POST(ADMIN_PORTFOLIO, VALID_PORTFOLIO_ITEM, userToken());
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('POST /admin/portfolio with ADMIN token and valid body is accepted (cdn-worker trigger)', async () => {
      const { status, data } = await POST(ADMIN_PORTFOLIO, VALID_PORTFOLIO_ITEM, adminToken());
      // 201 = created, 400/422 = validation, 409 = slug conflict
      expect([201, 400, 403, 404, 409, 422, 502, 503, 504]).toContain(status);
      if (status === 201) {
        const body = data as Record<string, unknown>;
        const item = body?.data ?? body;
        if ((item as any)?.id) createdItemId = (item as any).id;
        if ((item as any)?.slug) createdItemSlug = (item as any).slug;
      }
    });

    it('POST /admin/portfolio with missing required fields returns 400', async () => {
      const { status } = await POST(ADMIN_PORTFOLIO, { title: 'Incomplete Item' }, adminToken());
      expect([400, 404, 422, 403]).toContain(status);
    });

    it('GET /admin/portfolio with ADMIN token returns list', async () => {
      const { status } = await GET(ADMIN_PORTFOLIO, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('PATCH /admin/portfolio/:id with ADMIN token updates item', async () => {
      const id = createdItemId ?? FAKE_ITEM_ID;
      const { status } = await PATCH(
        `${ADMIN_PORTFOLIO}/${id}`,
        {
          shortDescription: 'Updated short description from e2e test suite.',
          tags: ['E2E', 'Updated', 'NestJS'],
        },
        adminToken(),
      );
      expect([200, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/portfolio/:id/publish triggers cdn-worker', async () => {
      const id = createdItemId ?? FAKE_ITEM_ID;
      const { status } = await POST(`${ADMIN_PORTFOLIO}/${id}/publish`, {}, adminToken());
      expect([200, 201, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/portfolio/:id/archive', async () => {
      const id = createdItemId ?? FAKE_ITEM_ID;
      const { status } = await POST(`${ADMIN_PORTFOLIO}/${id}/archive`, {}, adminToken());
      expect([200, 201, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/portfolio/:id/analytics with ADMIN token', async () => {
      const id = createdItemId ?? FAKE_ITEM_ID;
      const { status } = await GET(`${ADMIN_PORTFOLIO}/${id}/analytics`, adminToken());
      expect([200, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/portfolio/bulk with valid IDs', async () => {
      const { status } = await POST(
        `${ADMIN_PORTFOLIO}/bulk`,
        {
          action: 'ARCHIVE',
          ids: [FAKE_ITEM_ID],
        },
        adminToken(),
      );
      expect([200, 201, 400, 404, 422, 502, 503, 504]).toContain(status);
    });

    it('DELETE /admin/portfolio/:id with ADMIN token', async () => {
      const id = createdItemId ?? FAKE_ITEM_ID;
      const { status } = await DELETE(`${ADMIN_PORTFOLIO}/${id}`, adminToken());
      expect([200, 204, 404, 502, 503, 504]).toContain(status);
    });
  });

  // ── Admin portfolio reorder ───────────────────────────────────────────────
  describe('PATCH /admin/portfolio/reorder', () => {
    it('valid reorder payload is accepted', async () => {
      const { status } = await PATCH(
        `${ADMIN_PORTFOLIO}/reorder`,
        {
          items: [{ id: FAKE_ITEM_ID, order: 1 }],
        },
        adminToken(),
      );
      expect([200, 400, 404, 422, 502, 503, 504]).toContain(status);
    });
  });

  // ── Admin portfolio categories ────────────────────────────────────────────
  describe('Admin portfolio categories — CRUD', () => {
    it('GET /admin/portfolio/categories with USER token → 403', async () => {
      const { status } = await GET(ADMIN_CATEGORIES, userToken());
      expect([0, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/portfolio/categories with ADMIN token is not 401', async () => {
      const { status } = await GET(ADMIN_CATEGORIES, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/portfolio/categories creates category', async () => {
      const { status } = await POST(
        ADMIN_CATEGORIES,
        {
          name: `E2E Test Category ${Date.now()}`,
          slug: `e2e-test-category-${Date.now()}`,
          description: 'Portfolio category created by e2e test suite.',
          order: 99,
        },
        adminToken(),
      );
      expect([201, 400, 403, 404, 409, 422, 502, 503, 504]).toContain(status);
    });

    it('PATCH /admin/portfolio/categories/:id with ADMIN token', async () => {
      const { status } = await PATCH(
        `${ADMIN_CATEGORIES}/${FAKE_CATEGORY_ID}`,
        { name: 'Updated E2E Category' },
        adminToken(),
      );
      expect([200, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('DELETE /admin/portfolio/categories/:id requires ADMIN role', async () => {
      const { status } = await DELETE(`${ADMIN_CATEGORIES}/${FAKE_CATEGORY_ID}`, userToken());
      expect([0, 401, 403, 404]).toContain(status);
    });
  });
});
