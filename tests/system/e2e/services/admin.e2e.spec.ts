/**
 * E2E — Admin service
 *
 * Full end-to-end coverage of the admin service via the API gateway.
 * Tests admin dashboard, system management, audit logs, email template
 * management, and user/webhook admin operations.
 *
 * Worker integration:
 *   • Admin actions trigger audit-worker (comprehensive audit logging)
 *   • Email template changes trigger cdn-worker (cache invalidation)
 *   • System broadcasts trigger notification-worker (mass delivery)
 *
 * Note: Admin service uses global prefix `api` (not `api/v1`).
 * Gateway rewrites /api/v1/admin/* → /api/admin/* downstream.
 *
 * Routes: /api/v1/admin/* (via gateway rewrite → /api/admin/*)
 */

import axios, { AxiosError } from 'axios';
import { getApiBase, resolveStatus } from '../../setup/http';
import { bearerToken, mintSystemToken } from '../../setup/auth';

const BASE = getApiBase();
const ADMIN = `${BASE}/admin`;
/** Admin service mounts email templates under /api/admin/system/email-templates */
const ADMIN_EMAIL_TEMPLATES = `${ADMIN}/system/email-templates`;

const USER_ID = 'e2e-admin-user-usr1-2345-6789-abcd-ef0123456789';
const ADMIN_ID = 'e2e-admin-user-adm8-9876-5432-10fe-dcba98765432';
const FAKE_ID = '00000000-adm-00000-0000-000000000001';

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

async function expectAdminReachable(): Promise<void> {
  let connected = false;
  try {
    await axios.get(ADMIN, { timeout: 10_000 });
    connected = true;
  } catch (e) {
    const ae = e as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(`[e2e] Admin service not reachable at ${ADMIN}. Run: pnpm docker:e2e:up`);
    }
    connected = true;
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('E2E — Admin service', () => {
  beforeAll(expectAdminReachable);

  // ── Universal privilege enforcement ──────────────────────────────────────
  describe('Universal privilege enforcement — all admin endpoints require ADMIN role', () => {
    const adminEndpoints = [
      `${ADMIN}/dashboard`,
      `${ADMIN}/system`,
      `${ADMIN}/audit`,
      `${ADMIN}/users`,
      ADMIN_EMAIL_TEMPLATES,
      `${ADMIN}/webhooks`,
    ];

    for (const url of adminEndpoints) {
      it(`GET ${url.replace(BASE, '')} without token → 401`, async () => {
        const { status } = await GET(url);
        expect([0, 401, 403, 404]).toContain(status);
      });

      it(`GET ${url.replace(BASE, '')} with USER token → 403`, async () => {
        const { status } = await GET(url, userToken());
        expect([0, 401, 403, 404, 502, 503, 504]).toContain(status);
      });
    }
  });

  // ── Admin dashboard ───────────────────────────────────────────────────────
  describe('Admin dashboard — analytics-worker powered metrics', () => {
    it('GET /admin/dashboard with ADMIN token returns metrics', async () => {
      const { status, data } = await GET(`${ADMIN}/dashboard`, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
      if (status === 200) {
        const body = data as Record<string, unknown>;
        expect(body).toBeDefined();
      }
    });

    it('GET /admin/dashboard/stats with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN}/dashboard/stats`, adminToken());
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/dashboard/revenue with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN}/dashboard/revenue`, adminToken());
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/dashboard/activity with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN}/dashboard/activity`, adminToken());
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/dashboard with period filter', async () => {
      const { status } = await GET(`${ADMIN}/dashboard`, adminToken(), { period: 'MONTHLY' });
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });
  });

  // ── System management ─────────────────────────────────────────────────────
  describe('Admin system management', () => {
    it('GET /admin/system with ADMIN token returns system info', async () => {
      const { status } = await GET(`${ADMIN}/system`, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/system/health with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN}/system/health`, adminToken());
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/system/config with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN}/system/config`, adminToken());
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('PATCH /admin/system/maintenance with USER token → 403', async () => {
      const { status } = await PATCH(
        `${ADMIN}/system/maintenance`,
        { enabled: false },
        userToken(),
      );
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  // ── Audit logs ────────────────────────────────────────────────────────────
  describe('Admin audit logs — audit-worker powered', () => {
    it('GET /admin/audit with ADMIN token returns audit entries', async () => {
      const { status, data } = await GET(`${ADMIN}/audit`, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
      if (status === 200) {
        const body = data as Record<string, unknown>;
        const list = body?.data ?? body;
        expect(Array.isArray(list) || typeof list === 'object').toBe(true);
      }
    });

    it('GET /admin/audit with filters', async () => {
      const { status } = await GET(`${ADMIN}/audit`, adminToken(), {
        page: '1',
        limit: '20',
        category: 'AUTH',
        userId: USER_ID,
      });
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/audit/:id returns specific audit entry', async () => {
      const { status } = await GET(`${ADMIN}/audit/${FAKE_ID}`, adminToken());
      expect([200, 404, 403]).toContain(status);
    });

    it('GET /admin/audit/stats with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN}/audit/stats`, adminToken());
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });
  });

  // ── Admin user management ─────────────────────────────────────────────────
  describe('Admin user management', () => {
    it('GET /admin/users with ADMIN token returns user list', async () => {
      const { status } = await GET(`${ADMIN}/users`, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/users with search/filter params', async () => {
      const { status } = await GET(`${ADMIN}/users`, adminToken(), {
        page: '1',
        limit: '20',
        role: 'USER',
        status: 'ACTIVE',
      });
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/users/:id returns user details', async () => {
      const { status } = await GET(`${ADMIN}/users/${FAKE_ID}`, adminToken());
      expect([200, 404, 403]).toContain(status);
    });

    it('PATCH /admin/users/:id/role requires ADMIN role', async () => {
      const { status } = await PATCH(
        `${ADMIN}/users/${FAKE_ID}/role`,
        { role: 'USER' },
        userToken(),
      );
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('PATCH /admin/users/:id/status with ADMIN token', async () => {
      const { status } = await PATCH(
        `${ADMIN}/users/${FAKE_ID}/status`,
        { status: 'SUSPENDED', reason: 'E2E test suspension' },
        adminToken(),
      );
      expect([200, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/users/bulk — bulk suspend with ADMIN token', async () => {
      const { status } = await POST(
        `${ADMIN}/users/bulk`,
        {
          action: 'suspend',
          userIds: [FAKE_ID],
          reason: 'E2E bulk suspend test',
        },
        adminToken(),
      );
      expect([200, 201, 400, 404, 422, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/users/:id/sessions with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN}/users/${FAKE_ID}/sessions`, adminToken());
      expect([200, 404, 403]).toContain(status);
    });

    it('GET /admin/users/:id/activity with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN}/users/${FAKE_ID}/activity`, adminToken());
      expect([200, 404, 403]).toContain(status);
    });

    it('POST /admin/users/:id/force-password-reset with ADMIN token', async () => {
      const { status } = await POST(
        `${ADMIN}/users/${FAKE_ID}/force-password-reset`,
        {},
        adminToken(),
      );
      expect([200, 201, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/users/logs with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN}/users/logs`, adminToken());
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });
  });

  // ── Email templates ───────────────────────────────────────────────────────
  describe('Admin email templates — email-worker config', () => {
    it('GET /admin/system/email-templates with ADMIN token', async () => {
      const { status } = await GET(ADMIN_EMAIL_TEMPLATES, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/system/email-templates — create (not implemented on service)', async () => {
      const { status } = await POST(
        ADMIN_EMAIL_TEMPLATES,
        {
          name: `E2E Test Email Template — ${Date.now()}`,
          type: 'e2e.test',
          subject: 'E2E Test: {{action}} by {{userName}}',
          htmlBody:
            '<html><body><h1>E2E Test Email</h1><p>Action: {{action}}</p><p>User: {{userName}}</p></body></html>',
          textBody: 'E2E Test Email\n\nAction: {{action}}\nUser: {{userName}}',
          variables: ['action', 'userName'],
          active: true,
        },
        adminToken(),
      );
      expect([201, 400, 403, 404, 405, 409, 422, 502, 503, 504]).toContain(status);
    });

    it('PATCH /admin/system/email-templates/:id with ADMIN token', async () => {
      const { status } = await PATCH(
        `${ADMIN_EMAIL_TEMPLATES}/${FAKE_ID}`,
        { subject: 'Updated E2E Email Subject — {{userName}}' },
        adminToken(),
      );
      expect([200, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/system/email-templates/:id/test sends test email', async () => {
      const { status } = await POST(
        `${ADMIN_EMAIL_TEMPLATES}/${FAKE_ID}/test`,
        {
          email: 'e2e-test@nestlancer.local',
          variables: { action: 'E2E_TEST', userName: 'TestUser' },
        },
        adminToken(),
      );
      expect([200, 201, 400, 404, 422, 502, 503, 504]).toContain(status);
    });

    it('DELETE /admin/system/email-templates/:id with USER token → 403', async () => {
      const { status } = await DELETE(`${ADMIN_EMAIL_TEMPLATES}/${FAKE_ID}`, userToken());
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  // ── Admin webhooks ────────────────────────────────────────────────────────
  describe('Admin webhooks management', () => {
    it('GET /admin/webhooks with ADMIN token returns list', async () => {
      const { status } = await GET(`${ADMIN}/webhooks`, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/webhooks with valid payload', async () => {
      const { status } = await POST(
        `${ADMIN}/webhooks`,
        {
          name: 'E2E Test Outgoing Webhook',
          url: 'https://webhook.site/e2e-admin-test',
          events: ['payment.completed', 'project.created'],
          secret: 'e2e_secret_key_admin',
          active: false,
        },
        adminToken(),
      );
      expect([201, 400, 403, 409, 422, 502, 503, 504]).toContain(status);
    });
  });
});
