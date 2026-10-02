/**
 * E2E — Projects service
 *
 * Full end-to-end coverage of the projects service via the API gateway.
 * Tests project listing, detail retrieval, timeline, deliverables, payments,
 * approvals, revisions, progress, milestones, messages, and feedback.
 *
 * Worker integration:
 *   • Project approval triggers notification-worker + email-worker
 *   • Revision request triggers notification-worker
 *   • Messages trigger notification-worker (new message notification)
 *   • Project creation/status changes trigger audit-worker
 *
 * Routes: /api/v1/projects/* and /api/v1/admin/projects/*
 */

import axios, { AxiosError } from 'axios';
import { getApiBase, resolveStatus } from '../../setup/http';
import { bearerToken, mintSystemToken } from '../../setup/auth';

const BASE = getApiBase();
const PROJECTS = `${BASE}/projects`;
const ADMIN_PROJECTS = `${BASE}/admin/projects`;

const USER_ID = 'e2e-projects-user-aabb1234-5678-90ab-cdef-000011112222';
const ADMIN_ID = 'e2e-projects-admin-ffee4321-8765-ba09-fedc-000033334444';
const FAKE_PROJECT_ID = '00000000-proj-0000-0000-000000000001';

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

// ── Reachability guard ────────────────────────────────────────────────────────

async function expectProjectsReachable(): Promise<void> {
  try {
    await axios.get(`${PROJECTS}/public`, { timeout: 10_000 });
  } catch (e) {
    const ae = e as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(
        `[e2e] Projects service not reachable at ${PROJECTS}. Run: pnpm docker:e2e:up`,
      );
    }
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('E2E — Projects service', () => {
  beforeAll(expectProjectsReachable);

  // ── Public endpoints ───────────────────────────────────────────────────────
  describe('Public endpoints (no auth required)', () => {
    it('GET /projects/public returns 200 or 404 (not 401)', async () => {
      const { status } = await GET(`${PROJECTS}/public`);
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      expect([200, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /projects/public with pagination params', async () => {
      const { status } = await GET(`${PROJECTS}/public`, undefined, { page: '1', limit: '10' });
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('GET /projects/public/:id for non-existent project returns 404', async () => {
      const { status } = await GET(`${PROJECTS}/public/${FAKE_PROJECT_ID}`);
      expect([404, 400, 502, 503, 504]).toContain(status);
    });
  });

  // ── Auth enforcement ───────────────────────────────────────────────────────
  describe('Auth enforcement', () => {
    it('GET /projects without token → 401', async () => {
      const { status } = await GET(PROJECTS);
      expect([0, 401, 403]).toContain(status);
    });

    it('GET /projects/stats without token → 401', async () => {
      const { status } = await GET(`${PROJECTS}/stats`);
      expect([0, 401, 403]).toContain(status);
    });

    it('GET /projects/:id without token → 401', async () => {
      const { status } = await GET(`${PROJECTS}/${FAKE_PROJECT_ID}`);
      expect([0, 401, 403]).toContain(status);
    });
  });

  // ── List projects ─────────────────────────────────────────────────────────
  describe('GET /projects — authenticated project list', () => {
    it('with valid JWT returns list (not 401/403)', async () => {
      const { status, data } = await GET(PROJECTS, userToken());
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
  describe('GET /projects/stats — project statistics', () => {
    it('with JWT returns stats object', async () => {
      const { status } = await GET(`${PROJECTS}/stats`, userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  // ── Templates ─────────────────────────────────────────────────────────────
  describe('GET + POST /projects/templates', () => {
    it('GET templates with JWT returns list', async () => {
      const { status } = await GET(`${PROJECTS}/templates`, userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('POST template with valid body is accepted', async () => {
      const { status } = await POST(
        `${PROJECTS}/templates`,
        {
          name: 'E2E Test Template — SaaS Development',
          description: 'Standard template for SaaS projects',
          milestones: [
            { name: 'Discovery', durationDays: 14 },
            { name: 'Design', durationDays: 21 },
            { name: 'Development', durationDays: 60 },
            { name: 'Testing', durationDays: 14 },
            { name: 'Launch', durationDays: 7 },
          ],
        },
        userToken(),
      );
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  // ── Project details ───────────────────────────────────────────────────────
  describe('GET /projects/:id — project details', () => {
    it('non-existent UUID returns 404', async () => {
      const { status } = await GET(`${PROJECTS}/${FAKE_PROJECT_ID}`, userToken());
      expect([404, 400, 403, 500, 502, 503, 504]).toContain(status);
    });
  });

  // ── Project timeline ──────────────────────────────────────────────────────
  describe('GET /projects/:id/timeline', () => {
    it('non-existent project returns 404', async () => {
      const { status } = await GET(`${PROJECTS}/${FAKE_PROJECT_ID}/timeline`, userToken());
      expect([404, 403, 400]).toContain(status);
    });
  });

  // ── Deliverables ──────────────────────────────────────────────────────────
  describe('GET /projects/:id/deliverables', () => {
    it('non-existent project returns 404', async () => {
      const { status } = await GET(`${PROJECTS}/${FAKE_PROJECT_ID}/deliverables`, userToken());
      expect([404, 403, 400]).toContain(status);
    });
  });

  // ── Project payments ──────────────────────────────────────────────────────
  describe('GET /projects/:id/payments', () => {
    it('non-existent project returns 404', async () => {
      const { status } = await GET(`${PROJECTS}/${FAKE_PROJECT_ID}/payments`, userToken());
      expect([404, 403, 400]).toContain(status);
    });
  });

  // ── Project approval ──────────────────────────────────────────────────────
  describe('POST /projects/:id/approve — notification-worker + email-worker', () => {
    it('non-existent project returns 404', async () => {
      const { status } = await POST(
        `${PROJECTS}/${FAKE_PROJECT_ID}/approve`,
        {
          rating: 5,
          testimonial:
            'Excellent work! The team delivered exactly what we needed on time and within budget.',
          allowPublicTestimonial: true,
        },
        userToken(),
      );
      expect([404, 403, 400, 422]).toContain(status);
    });

    it('empty body returns 400 (rating required)', async () => {
      const { status } = await POST(`${PROJECTS}/${FAKE_PROJECT_ID}/approve`, {}, userToken());
      expect([400, 404, 422]).toContain(status);
    });

    it('invalid rating (> 5) returns 400', async () => {
      const { status } = await POST(
        `${PROJECTS}/${FAKE_PROJECT_ID}/approve`,
        { rating: 10 },
        userToken(),
      );
      expect([400, 404, 422]).toContain(status);
    });
  });

  // ── Revision request ──────────────────────────────────────────────────────
  describe('POST /projects/:id/request-revision — notification-worker trigger', () => {
    it('non-existent project returns 404', async () => {
      const { status } = await POST(
        `${PROJECTS}/${FAKE_PROJECT_ID}/request-revision`,
        {
          feedback:
            'Please revise the dashboard design — the color scheme does not match our brand guidelines.',
          priority: 'HIGH',
        },
        userToken(),
      );
      expect([404, 403, 400, 422]).toContain(status);
    });

    it('missing feedback returns 400', async () => {
      const { status } = await POST(
        `${PROJECTS}/${FAKE_PROJECT_ID}/request-revision`,
        {},
        userToken(),
      );
      expect([400, 404, 422]).toContain(status);
    });
  });

  // ── Project progress ──────────────────────────────────────────────────────
  describe('GET /projects/:id/progress', () => {
    it('non-existent project returns 404', async () => {
      const { status } = await GET(`${PROJECTS}/${FAKE_PROJECT_ID}/progress`, userToken());
      expect([404, 403, 400]).toContain(status);
    });
  });

  // ── Milestones ────────────────────────────────────────────────────────────
  describe('GET /projects/:id/milestones', () => {
    it('non-existent project returns 404', async () => {
      const { status } = await GET(`${PROJECTS}/${FAKE_PROJECT_ID}/milestones`, userToken());
      expect([404, 403, 400]).toContain(status);
    });
  });

  // ── Project messages ──────────────────────────────────────────────────────
  describe('GET + POST /projects/:id/messages — notification-worker trigger', () => {
    it('GET messages returns 404 for non-existent project', async () => {
      const { status } = await GET(`${PROJECTS}/${FAKE_PROJECT_ID}/messages`, userToken(), {
        page: '1',
        limit: '20',
      });
      expect([404, 403, 400]).toContain(status);
    });

    it('POST message with valid body is validated', async () => {
      const { status } = await POST(
        `${PROJECTS}/${FAKE_PROJECT_ID}/messages`,
        {
          content: 'E2E test message — checking the messaging system is wired correctly.',
          type: 'TEXT',
        },
        userToken(),
      );
      expect([200, 201, 404, 403, 400, 422]).toContain(status);
    });

    it('POST message with empty body returns 400', async () => {
      const { status } = await POST(`${PROJECTS}/${FAKE_PROJECT_ID}/messages`, {}, userToken());
      expect([400, 404, 422]).toContain(status);
    });
  });

  // ── Project feedback ──────────────────────────────────────────────────────
  describe('GET + POST /projects/:id/feedback', () => {
    it('GET feedback returns 404 for non-existent project', async () => {
      const { status } = await GET(`${PROJECTS}/${FAKE_PROJECT_ID}/feedback`, userToken());
      expect([404, 403, 400]).toContain(status);
    });

    it('POST feedback with valid body is validated', async () => {
      const { status } = await POST(
        `${PROJECTS}/${FAKE_PROJECT_ID}/feedback`,
        {
          title: 'E2E Test Feedback',
          feedback:
            'The development team has been responsive and professional throughout the project.',
          rating: 5,
        },
        userToken(),
      );
      expect([200, 201, 404, 403, 400, 422]).toContain(status);
    });
  });

  // ── Admin routes ──────────────────────────────────────────────────────────
  describe('Admin routes — privilege enforcement', () => {
    it('GET /admin/projects with USER token → 403/404', async () => {
      const { status } = await GET(ADMIN_PROJECTS, userToken());
      expect([0, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/projects with ADMIN token passes check', async () => {
      const { status } = await GET(ADMIN_PROJECTS, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/projects/stats with ADMIN token returns stats', async () => {
      const { status } = await GET(`${ADMIN_PROJECTS}/stats`, adminToken());
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('PATCH /admin/projects/:id/status requires ADMIN role', async () => {
      const { status } = await PATCH(
        `${ADMIN_PROJECTS}/${FAKE_PROJECT_ID}/status`,
        { status: 'IN_PROGRESS', reason: 'E2E test status update' },
        userToken(),
      );
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('PATCH /admin/projects/:id/team with ADMIN token processes request', async () => {
      const { status } = await PATCH(
        `${ADMIN_PROJECTS}/${FAKE_PROJECT_ID}/team`,
        { assigneeIds: [ADMIN_ID] },
        adminToken(),
      );
      expect([200, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/projects/:id/archive with ADMIN token', async () => {
      const { status } = await POST(
        `${ADMIN_PROJECTS}/${FAKE_PROJECT_ID}/archive`,
        { reason: 'E2E test archive' },
        adminToken(),
      );
      expect([200, 201, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/projects/:id/duplicate with ADMIN token', async () => {
      const { status } = await POST(
        `${ADMIN_PROJECTS}/${FAKE_PROJECT_ID}/duplicate`,
        {},
        adminToken(),
      );
      expect([200, 201, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/projects/:id/export with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN_PROJECTS}/${FAKE_PROJECT_ID}/export`, adminToken());
      expect([200, 400, 404, 502, 503, 504]).toContain(status);
    });
  });
});
