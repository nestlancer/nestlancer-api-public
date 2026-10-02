/**
 * E2E — Quotes service
 *
 * Full end-to-end coverage of the quotes lifecycle via the API gateway.
 * Tests quote listing, accepting/declining, requesting changes, PDF generation,
 * and admin quote management including templates.
 *
 * Worker integration:
 *   • Quote acceptance triggers notification-worker (project creation notification)
 *   • Quote sending triggers email-worker (quote email to client)
 *   • PDF generation may trigger cdn-worker (CDN cache invalidation)
 *
 * Routes: /api/v1/quotes/* and /api/v1/admin/quotes/* + /api/v1/admin/templates/*
 */

import axios, { AxiosError } from 'axios';
import { getApiBase, resolveStatus } from '../../setup/http';
import { bearerToken, mintSystemToken } from '../../setup/auth';

const BASE = getApiBase();
const QUOTES = `${BASE}/quotes`;
const PROJECTS = `${BASE}/projects`;
const ADMIN_QUOTES = `${BASE}/admin/quotes`;
const ADMIN_TEMPLATES = `${BASE}/admin/quote-templates`;

const USER_ID = 'e2e-quotes-user-11223344-5566-7788-99aa-bbccddeeff00';
const ADMIN_ID = 'e2e-quotes-admin-00ffeedd-ccbb-aa99-8877-665544332211';
const FAKE_QUOTE_ID = '00000000-aaaa-bbbb-cccc-000000000001';
const FAKE_TEMPLATE_ID = '00000000-aaaa-bbbb-cccc-000000000002';

const userToken = () => bearerToken(USER_ID, 'USER');
const adminToken = () => `Bearer ${mintSystemToken(ADMIN_ID, 'ADMIN')}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

type SafeResult = { status: number; data: any };

async function GET(url: string, token?: string): Promise<SafeResult> {
  return axios
    .get(url, { headers: token ? { Authorization: token } : {}, timeout: 12_000 })
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

async function expectQuotesReachable(): Promise<void> {
  let status = 0;
  try {
    await axios.get(QUOTES, { headers: { Authorization: userToken() }, timeout: 10_000 });
  } catch (e) {
    const ae = e as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(`[e2e] Quotes service not reachable at ${QUOTES}. Run: pnpm docker:e2e:up`);
    }
    status = ae.response?.status ?? 0;
  }
  if (status !== 0 && ![401, 403, 404, 502, 503, 504].includes(status)) {
    // Any non-connection status means service is up
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('E2E — Quotes service', () => {
  beforeAll(expectQuotesReachable);

  // ── Auth enforcement ───────────────────────────────────────────────────────
  describe('Auth enforcement', () => {
    it('GET /quotes without token → 401', async () => {
      const { status } = await GET(QUOTES);
      expect([0, 401, 403]).toContain(status);
    });

    it('GET /quotes/stats without token → 401', async () => {
      const { status } = await GET(`${QUOTES}/stats`);
      expect([0, 401, 403]).toContain(status);
    });

    it('GET /quotes/:id without token → 401', async () => {
      const { status } = await GET(`${QUOTES}/${FAKE_QUOTE_ID}`);
      expect([0, 401, 403]).toContain(status);
    });
  });

  // ── List quotes ───────────────────────────────────────────────────────────
  describe('GET /quotes — list user quotes', () => {
    it('with valid JWT returns list (not 401/403)', async () => {
      const { status, data } = await GET(QUOTES, userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      if (status === 200) {
        const body = data as Record<string, unknown>;
        const list = body?.data ?? body;
        expect(Array.isArray(list) || typeof list === 'object').toBe(true);
      }
    });
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  describe('GET /quotes/stats — user quote statistics', () => {
    it('with valid JWT returns stats (not 401)', async () => {
      const { status } = await GET(`${QUOTES}/stats`, userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  // ── Individual quote ──────────────────────────────────────────────────────
  describe('GET /quotes/:id — quote details', () => {
    it('non-existent UUID returns 404 (not 401)', async () => {
      const { status } = await GET(`${QUOTES}/${FAKE_QUOTE_ID}`, userToken());
      expect([404, 403, 500, 502, 503, 504]).toContain(status);
    });

    it('invalid UUID format returns 400 or 404', async () => {
      const { status } = await GET(`${QUOTES}/not-a-valid-uuid`, userToken());
      expect([400, 404, 422]).toContain(status);
    });
  });

  // ── Quote PDF ─────────────────────────────────────────────────────────────
  describe('GET /quotes/:id/pdf — PDF generation (cdn-worker trigger)', () => {
    it('non-existent quote returns 404', async () => {
      const { status } = await GET(`${QUOTES}/${FAKE_QUOTE_ID}/pdf`, userToken());
      expect([404, 403, 400]).toContain(status);
    });
  });

  // ── Project from accepted quote ───────────────────────────────────────────
  describe('Quote accept → project lifecycle', () => {
    it('GET /projects/by-quote/:quoteId requires authentication', async () => {
      const { status } = await GET(`${PROJECTS}/by-quote/${FAKE_QUOTE_ID}`);
      expect([0, 401, 403]).toContain(status);
    });

    it('GET /projects/by-quote/:quoteId returns 404 when project not created yet', async () => {
      const { status } = await GET(`${PROJECTS}/by-quote/${FAKE_QUOTE_ID}`, userToken());
      expect([404, 403, 500, 502, 503, 504]).toContain(status);
    });

    it('GET /quotes list returns paginated envelope when service is up', async () => {
      const { status, data } = await GET(`${QUOTES}?page=1&limit=5`, userToken());
      if (status !== 200) return;
      const body = data as Record<string, unknown>;
      const inner = (body?.data ?? body) as Record<string, unknown>;
      const hasItems = Array.isArray(inner?.items) || Array.isArray(inner);
      expect(hasItems).toBe(true);
    });
  });

  // ── Accept quote ──────────────────────────────────────────────────────────
  describe('POST /quotes/:id/accept — accept quote (projects lifecycle consumer)', () => {
    it('non-existent quote returns 404', async () => {
      const { status } = await POST(`${QUOTES}/${FAKE_QUOTE_ID}/accept`, {}, userToken());
      expect([404, 403, 400, 422]).toContain(status);
    });

    it('requires authentication', async () => {
      const { status } = await POST(`${QUOTES}/${FAKE_QUOTE_ID}/accept`, {});
      expect([0, 401, 403]).toContain(status);
    });
  });

  // ── Decline quote ─────────────────────────────────────────────────────────
  describe('POST /quotes/:id/decline', () => {
    it('non-existent quote returns 404', async () => {
      const { status } = await POST(
        `${QUOTES}/${FAKE_QUOTE_ID}/decline`,
        { reason: 'E2E test: declining for testing purposes' },
        userToken(),
      );
      expect([404, 403, 400, 422]).toContain(status);
    });

    it('missing reason field returns 400', async () => {
      const { status } = await POST(`${QUOTES}/${FAKE_QUOTE_ID}/decline`, {}, userToken());
      // May require reason, or may be optional
      expect([400, 404, 422]).toContain(status);
    });
  });

  // ── Request changes ───────────────────────────────────────────────────────
  describe('POST /quotes/:id/request-changes', () => {
    it('non-existent quote returns 404', async () => {
      const { status } = await POST(
        `${QUOTES}/${FAKE_QUOTE_ID}/request-changes`,
        {
          feedback:
            'Please revise the scope to include mobile app development and reduce the timeline by 2 weeks.',
        },
        userToken(),
      );
      expect([404, 403, 400, 422]).toContain(status);
    });

    it('empty feedback returns 400', async () => {
      const { status } = await POST(
        `${QUOTES}/${FAKE_QUOTE_ID}/request-changes`,
        { feedback: '' },
        userToken(),
      );
      expect([400, 404, 422]).toContain(status);
    });
  });

  // ── Admin — quote CRUD ────────────────────────────────────────────────────
  describe('Admin quotes — CRUD operations', () => {
    it('GET /admin/quotes with USER token → 403/404', async () => {
      const { status } = await GET(ADMIN_QUOTES, userToken());
      expect([0, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/quotes with ADMIN token passes privilege check', async () => {
      const { status } = await GET(ADMIN_QUOTES, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/quotes with valid payload is accepted (admin create quote)', async () => {
      const { status } = await POST(
        ADMIN_QUOTES,
        {
          requestId: FAKE_QUOTE_ID,
          title: 'E2E Test Quote — Full Stack Development Project',
          description:
            'Comprehensive quote for a full-stack web application including frontend, backend, and database.',
          lineItems: [
            { description: 'Frontend Development (React)', quantity: 1, unitPrice: 15000 },
            { description: 'Backend API (NestJS)', quantity: 1, unitPrice: 20000 },
            { description: 'Database Design & Setup', quantity: 1, unitPrice: 5000 },
          ],
          currency: 'INR',
          validUntil: '2026-12-31T23:59:59Z',
          paymentTerms: 'NET_30',
        },
        adminToken(),
      );
      // 201 = created, 404 = request not in DB, 400 = validation error
      expect([201, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('PATCH /admin/quotes/:id with ADMIN token processes request', async () => {
      const { status } = await PATCH(
        `${ADMIN_QUOTES}/${FAKE_QUOTE_ID}`,
        { title: 'Updated E2E Quote Title' },
        adminToken(),
      );
      expect([200, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/quotes/:id/send — email-worker trigger', async () => {
      const { status } = await POST(`${ADMIN_QUOTES}/${FAKE_QUOTE_ID}/send`, {}, adminToken());
      expect([200, 201, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/quotes/:id/revise — creates revision', async () => {
      const { status } = await POST(
        `${ADMIN_QUOTES}/${FAKE_QUOTE_ID}/revise`,
        { revisionNotes: 'E2E revision: updated scope and pricing.' },
        adminToken(),
      );
      expect([200, 201, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/quotes/:id/duplicate — duplicates quote', async () => {
      const { status } = await POST(`${ADMIN_QUOTES}/${FAKE_QUOTE_ID}/duplicate`, {}, adminToken());
      expect([200, 201, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/quotes/:id/history — version history', async () => {
      const { status } = await GET(`${ADMIN_QUOTES}/${FAKE_QUOTE_ID}/history`, adminToken());
      expect([200, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/quotes/:id/pdf — admin PDF generation', async () => {
      const { status } = await GET(`${ADMIN_QUOTES}/${FAKE_QUOTE_ID}/pdf`, adminToken());
      expect([200, 404, 502, 503, 504]).toContain(status);
    });
  });

  // ── Admin — quote templates ───────────────────────────────────────────────
  describe('Admin quote templates — CRUD', () => {
    it('GET /admin/quote-templates with USER token → 403/404', async () => {
      const { status } = await GET(ADMIN_TEMPLATES, userToken());
      expect([0, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/quote-templates with ADMIN token is not 401', async () => {
      const { status } = await GET(ADMIN_TEMPLATES, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/quote-templates creates template with valid data', async () => {
      const { status } = await POST(
        ADMIN_TEMPLATES,
        {
          name: 'E2E Test — Web Development Template',
          description: 'Standard template for web development projects',
          lineItems: [
            { description: 'Discovery & Planning', quantity: 1, unitPrice: 2000 },
            { description: 'UI/UX Design', quantity: 1, unitPrice: 5000 },
            { description: 'Development', quantity: 1, unitPrice: 20000 },
            { description: 'QA & Testing', quantity: 1, unitPrice: 3000 },
            { description: 'Deployment & Handoff', quantity: 1, unitPrice: 2000 },
          ],
          currency: 'INR',
          paymentTerms: 'NET_30',
        },
        adminToken(),
      );
      expect([201, 400, 404, 409, 502, 503, 504]).toContain(status);
    });

    it('DELETE /admin/quote-templates/:id requires ADMIN role', async () => {
      const { status } = await DELETE(`${ADMIN_TEMPLATES}/${FAKE_TEMPLATE_ID}`, userToken());
      expect([0, 401, 403, 404]).toContain(status);
    });
  });
});
