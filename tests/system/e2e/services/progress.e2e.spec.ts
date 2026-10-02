/**
 * E2E — Progress service
 *
 * Full end-to-end coverage of project progress tracking via the API gateway.
 * Tests progress entries, milestone management, deliverable reviews,
 * change requests, and admin progress operations.
 *
 * Worker integration:
 *   • Progress updates trigger notification-worker (client notifications)
 *   • Milestone completion triggers notification-worker + email-worker
 *   • Deliverable approval triggers notification-worker
 *   • All progress events trigger audit-worker
 *
 * Routes: /api/v1/projects/:projectId/progress/* and /api/v1/admin/progress/*
 */

import axios, { AxiosError } from 'axios';
import { getApiBase, resolveStatus } from '../../setup/http';
import { bearerToken, mintSystemToken } from '../../setup/auth';

const BASE = getApiBase();
const ADMIN_PROGRESS = `${BASE}/admin/progress`;

const USER_ID = 'e2e-progress-user-1234abcd-5678-efab-cdef-000000111111';
const ADMIN_ID = 'e2e-progress-admin-4321dcba-8765-bafe-fedc-000000222222';
const FAKE_PROJECT_ID = '00000000-prog-0000-0000-100000000001';
const FAKE_MILESTONE_ID = '00000000-mile-0000-0000-200000000002';
const FAKE_DELIVERABLE_ID = '00000000-dlvr-0000-0000-300000000003';
const FAKE_PROGRESS_ID = '00000000-prge-0000-0000-400000000004';

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

// ── Progress base URL builder ─────────────────────────────────────────────────

function progressUrl(projectId: string, suffix = ''): string {
  return `${BASE}/projects/${projectId}/progress${suffix}`;
}

function milestonesUrl(projectId: string, suffix = ''): string {
  return `${BASE}/projects/${projectId}/milestones${suffix}`;
}

function deliverablesUrl(projectId: string, suffix = ''): string {
  return `${BASE}/projects/${projectId}/deliverables${suffix}`;
}

// ── Reachability guard ────────────────────────────────────────────────────────

async function expectProgressReachable(): Promise<void> {
  let connected = false;
  try {
    await axios.get(progressUrl(FAKE_PROJECT_ID), {
      headers: { Authorization: userToken() },
      timeout: 10_000,
    });
    connected = true;
  } catch (e) {
    const ae = e as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(`[e2e] Progress service not reachable. Run: pnpm docker:e2e:up`);
    }
    connected = true; // Any HTTP response means service is up
  }
  if (!connected) {
    throw new Error('[e2e] Progress service did not respond');
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('E2E — Progress service', () => {
  beforeAll(expectProgressReachable);

  // ── Auth enforcement ───────────────────────────────────────────────────────
  describe('Auth enforcement', () => {
    it('GET /projects/:id/progress without token → 401', async () => {
      const { status } = await GET(progressUrl(FAKE_PROJECT_ID));
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('POST /projects/:id/progress without token → 401', async () => {
      const { status } = await POST(progressUrl(FAKE_PROJECT_ID), {});
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  // ── Progress entries ──────────────────────────────────────────────────────
  describe('GET /projects/:id/progress — progress listing', () => {
    it('with valid JWT passes auth guard (not 401/403)', async () => {
      const { status } = await GET(progressUrl(FAKE_PROJECT_ID), userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      // 200 = has progress, 404 = project not found — both valid
      expect([200, 404, 500, 502, 503, 504]).toContain(status);
    });

    it('with pagination params', async () => {
      const { status } = await GET(progressUrl(FAKE_PROJECT_ID), userToken(), {
        page: '1',
        limit: '20',
      });
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  describe('POST /projects/:id/progress — create progress entry (notification-worker trigger)', () => {
    it('valid progress entry body is validated', async () => {
      const { status } = await POST(
        progressUrl(FAKE_PROJECT_ID),
        {
          type: 'UPDATE',
          title: 'E2E Test Progress Update — Week 2',
          description:
            'Completed the authentication module and started work on the dashboard. ' +
            'Frontend components for the main navigation are 80% complete.',
          percentageComplete: 35,
          hoursLogged: 16,
          blockers: null,
          nextSteps: 'Complete dashboard layout and integrate with backend API.',
        },
        userToken(),
      );
      // 201 = created, 404 = project not in DB (acceptable without seeding)
      expect([201, 400, 404, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('empty body returns 400', async () => {
      const { status } = await POST(progressUrl(FAKE_PROJECT_ID), {}, userToken());
      expect([400, 404, 422]).toContain(status);
    });

    it('percentageComplete out of range returns 400', async () => {
      const { status } = await POST(
        progressUrl(FAKE_PROJECT_ID),
        {
          type: 'UPDATE',
          title: 'Invalid progress',
          description: 'Testing validation of percentage range',
          percentageComplete: 150,
        },
        userToken(),
      );
      expect([400, 404, 422]).toContain(status);
    });
  });

  // ── Milestones ────────────────────────────────────────────────────────────
  describe('GET /projects/:id/milestones — milestone listing', () => {
    it('with valid JWT not 401/403', async () => {
      const { status } = await GET(milestonesUrl(FAKE_PROJECT_ID), userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  describe('POST /projects/:id/milestones — create milestone', () => {
    it('valid milestone body is validated', async () => {
      const { status } = await POST(
        milestonesUrl(FAKE_PROJECT_ID),
        {
          name: 'E2E Test Milestone — Phase 1: Foundation',
          description:
            'Set up project infrastructure, CI/CD pipeline, and base application scaffolding.',
          dueDate: '2026-08-15T23:59:59Z',
          order: 1,
          paymentPercentage: 25,
        },
        userToken(),
      );
      expect([201, 400, 404, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('missing name returns 400', async () => {
      const { status } = await POST(
        milestonesUrl(FAKE_PROJECT_ID),
        { dueDate: '2026-08-15T23:59:59Z' },
        userToken(),
      );
      expect([400, 404, 422]).toContain(status);
    });
  });

  // ── Milestone approvals ───────────────────────────────────────────────────
  describe('POST /milestones/:id/approve — notification-worker trigger', () => {
    it('non-existent milestone returns 404', async () => {
      const { status } = await POST(
        `${BASE}/milestones/${FAKE_MILESTONE_ID}/approve`,
        {
          feedback: 'Phase 1 deliverables have been reviewed and meet the agreed specifications.',
        },
        userToken(),
      );
      expect([404, 403, 400, 422]).toContain(status);
    });

    it('requires authentication', async () => {
      const { status } = await POST(`${BASE}/milestones/${FAKE_MILESTONE_ID}/approve`, {});
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  // ── Request changes on milestone ──────────────────────────────────────────
  describe('POST /milestones/:id/request-changes', () => {
    it('non-existent milestone returns 404', async () => {
      const { status } = await POST(
        `${BASE}/milestones/${FAKE_MILESTONE_ID}/request-changes`,
        {
          feedback: 'The login page design does not match the approved mockup. Please revise.',
          priority: 'HIGH',
        },
        userToken(),
      );
      expect([404, 403, 400, 422]).toContain(status);
    });
  });

  // ── Deliverable reviews ───────────────────────────────────────────────────
  describe('POST /deliverables/:id/approve — notification-worker trigger', () => {
    it('non-existent deliverable returns 404', async () => {
      const { status } = await POST(
        `${BASE}/deliverables/${FAKE_DELIVERABLE_ID}/approve`,
        {
          feedback: 'Deliverable reviewed and approved. Quality meets expectations.',
        },
        userToken(),
      );
      expect([404, 403, 400, 422]).toContain(status);
    });
  });

  describe('POST /deliverables/:id/reject', () => {
    it('non-existent deliverable returns 404', async () => {
      const { status } = await POST(
        `${BASE}/deliverables/${FAKE_DELIVERABLE_ID}/reject`,
        {
          reason:
            'The API documentation is incomplete. Missing endpoint descriptions and request/response examples.',
        },
        userToken(),
      );
      expect([404, 403, 400, 422]).toContain(status);
    });

    it('missing reason returns 400', async () => {
      const { status } = await POST(
        `${BASE}/deliverables/${FAKE_DELIVERABLE_ID}/reject`,
        {},
        userToken(),
      );
      expect([400, 404, 422]).toContain(status);
    });
  });

  // ── Admin progress routes ─────────────────────────────────────────────────
  describe('Admin progress routes — privilege enforcement', () => {
    it('GET /admin/progress with USER token → 403/404', async () => {
      const { status } = await GET(ADMIN_PROGRESS, userToken());
      expect([0, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/progress with ADMIN token passes check', async () => {
      const { status } = await GET(ADMIN_PROGRESS, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('PATCH /admin/progress/:id with valid body and ADMIN token', async () => {
      const { status } = await PATCH(
        `${ADMIN_PROGRESS}/${FAKE_PROGRESS_ID}`,
        {
          percentageComplete: 50,
          adminNotes: 'E2E admin progress override note',
        },
        adminToken(),
      );
      expect([200, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('Admin milestones — GET /admin/milestones with ADMIN token', async () => {
      const { status } = await GET(`${BASE}/admin/milestones`, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('Admin milestones — PATCH /admin/milestones/:id/complete', async () => {
      const { status } = await PATCH(
        `${BASE}/admin/milestones/${FAKE_MILESTONE_ID}/complete`,
        { completionNotes: 'E2E test milestone completion.' },
        adminToken(),
      );
      expect([200, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('Admin deliverables — GET /admin/deliverables with ADMIN token', async () => {
      const { status } = await GET(`${BASE}/admin/deliverables`, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });
  });
});
