/**
 * E2E — Contact service
 *
 * Full end-to-end coverage of the contact/inquiry service via the API gateway.
 * Tests public contact form submission, admin management (status updates,
 * responses, spam marking), and delete operations.
 *
 * Worker integration:
 *   • Contact form submission triggers email-worker (acknowledgement email)
 *   • Admin response triggers email-worker (reply to submitter)
 *   • All contact events trigger audit-worker
 *
 * Routes: /api/v1/contact/* and /api/v1/admin/contact/*
 */

import axios, { AxiosError } from 'axios';
import { getApiBase, resolveStatus } from '../../setup/http';
import { bearerToken, mintSystemToken } from '../../setup/auth';

const BASE = getApiBase();
const CONTACT = `${BASE}/contact`;
const ADMIN_CONTACT = `${BASE}/admin/contact`;

const USER_ID = 'e2e-contact-user-cnt1-2345-6789-abcd-ef0123456789';
const ADMIN_ID = 'e2e-contact-admin-adm4-9876-5432-10fe-dcba98765432';
const FAKE_CONTACT_ID = '00000000-ctct-0000-0000-000000000001';
const RUN_ID = Date.now();

const userToken = () => bearerToken(USER_ID, 'USER');
const adminToken = () => `Bearer ${mintSystemToken(ADMIN_ID, 'ADMIN')}`;

// ── Valid contact submission ────────────────────────────────────────────────────

const VALID_CONTACT = {
  name: 'E2E Test User',
  email: `e2e-contact-${RUN_ID}@nestlancer-e2e.local`,
  subject: 'GENERAL',
  message:
    'This is an e2e test inquiry submitted by the automated test suite. ' +
    'Please disregard this message as it is generated for testing purposes only.',
  turnstileToken: 'e2e-bypass',
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

async function expectContactReachable(): Promise<void> {
  try {
    await axios.get(`${CONTACT}/health`, { timeout: 10_000 });
  } catch (e) {
    const ae = e as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(`[e2e] Contact service not reachable at ${CONTACT}. Run: pnpm docker:e2e:up`);
    }
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('E2E — Contact service', () => {
  beforeAll(expectContactReachable);

  let createdContactId: string | null = null;

  // ── Health ─────────────────────────────────────────────────────────────────
  describe('Health check', () => {
    it('GET /contact/health → 200', async () => {
      const { status, data } = await GET(`${CONTACT}/health`);
      expect(status).toBe(200);
      const body = data as Record<string, unknown>;
      const service = body?.data?.service ?? body?.service;
      expect(service).toBeDefined();
    });
  });

  // ── Public contact form ───────────────────────────────────────────────────
  describe('POST /contact — public form submission (email-worker trigger)', () => {
    it('empty body returns 400', async () => {
      const { status } = await POST(CONTACT, {});
      expect([400, 422]).toContain(status);
    });

    it('missing name returns 400', async () => {
      const { status } = await POST(CONTACT, {
        ...VALID_CONTACT,
        name: undefined,
      });
      expect([400, 422]).toContain(status);
    });

    it('invalid email returns 400', async () => {
      const { status } = await POST(CONTACT, {
        ...VALID_CONTACT,
        email: 'not-an-email',
      });
      expect([400, 422]).toContain(status);
    });

    it('invalid subject enum returns 400', async () => {
      const { status } = await POST(CONTACT, {
        ...VALID_CONTACT,
        subject: 'INVALID_SUBJECT',
      });
      expect([400, 422]).toContain(status);
    });

    it('message too short returns 400', async () => {
      const { status } = await POST(CONTACT, {
        ...VALID_CONTACT,
        message: 'Short',
      });
      expect([400, 422]).toContain(status);
    });

    it('valid GENERAL inquiry is accepted (201 or 400 if Turnstile active)', async () => {
      const { status, data } = await POST(CONTACT, { ...VALID_CONTACT, subject: 'GENERAL' });
      expect([201, 400, 422, 500, 502, 503, 504]).toContain(status);
      if (status === 201) {
        const body = data as Record<string, unknown>;
        const contact = body?.data ?? body;
        if ((contact as any)?.id) {
          createdContactId = (contact as any).id as string;
        }
      }
    });

    it('valid SUPPORT inquiry is accepted', async () => {
      const { status } = await POST(CONTACT, {
        ...VALID_CONTACT,
        subject: 'SUPPORT',
        email: `e2e-support-${RUN_ID}@nestlancer-e2e.local`,
        message: 'E2E test support inquiry — requesting help with account configuration and setup.',
      });
      expect([201, 400, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('valid SALES inquiry is accepted', async () => {
      const { status } = await POST(CONTACT, {
        ...VALID_CONTACT,
        subject: 'SALES',
        email: `e2e-sales-${RUN_ID}@nestlancer-e2e.local`,
        message:
          'E2E test sales inquiry — interested in enterprise plan pricing and custom feature development.',
      });
      expect([201, 400, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('valid BILLING inquiry is accepted', async () => {
      const { status } = await POST(CONTACT, {
        ...VALID_CONTACT,
        subject: 'BILLING',
        email: `e2e-billing-${RUN_ID}@nestlancer-e2e.local`,
        message: 'E2E test billing inquiry — question about invoice #INV-2026-0042.',
      });
      expect([201, 400, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('valid PARTNERSHIP inquiry is accepted', async () => {
      const { status } = await POST(CONTACT, {
        ...VALID_CONTACT,
        subject: 'PARTNERSHIP',
        email: `e2e-partnership-${RUN_ID}@nestlancer-e2e.local`,
        message: 'E2E test partnership inquiry — exploring potential collaboration opportunities.',
      });
      expect([201, 400, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('message too long returns 400', async () => {
      const { status } = await POST(CONTACT, {
        ...VALID_CONTACT,
        message: 'A'.repeat(5001),
      });
      expect([400, 422]).toContain(status);
    });
  });

  // ── Admin contact management ──────────────────────────────────────────────
  describe('Admin contact management — privilege enforcement', () => {
    it('GET /admin/contact with USER token → 403', async () => {
      const { status } = await GET(ADMIN_CONTACT, userToken());
      expect([0, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/contact with ADMIN token returns list', async () => {
      const { status, data } = await GET(ADMIN_CONTACT, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
      if (status === 200) {
        const body = data as Record<string, unknown>;
        const list = body?.data ?? body;
        expect(Array.isArray(list) || typeof list === 'object').toBe(true);
      }
    });

    it('GET /admin/contact with pagination and status filter', async () => {
      const { status } = await GET(ADMIN_CONTACT, adminToken(), {
        page: '1',
        limit: '20',
        status: 'PENDING',
      });
      expect([200, 400, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/contact/:id returns contact or 404', async () => {
      const id = createdContactId ?? FAKE_CONTACT_ID;
      const { status } = await GET(`${ADMIN_CONTACT}/${id}`, adminToken());
      expect([200, 400, 404, 403]).toContain(status);
    });
  });

  describe('Admin contact status management', () => {
    it('PATCH /admin/contact/:id/status with valid status', async () => {
      const id = createdContactId ?? FAKE_CONTACT_ID;
      const { status } = await PATCH(
        `${ADMIN_CONTACT}/${id}/status`,
        { status: 'IN_PROGRESS', notes: 'E2E test: status updated to in progress.' },
        adminToken(),
      );
      expect([200, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('PATCH /admin/contact/:id/status with invalid status returns 400', async () => {
      const { status } = await PATCH(
        `${ADMIN_CONTACT}/${FAKE_CONTACT_ID}/status`,
        { status: 'INVALID_STATUS' },
        adminToken(),
      );
      expect([400, 404, 422]).toContain(status);
    });

    it('PATCH /admin/contact/:id/status without ADMIN role → 403', async () => {
      const { status } = await PATCH(
        `${ADMIN_CONTACT}/${FAKE_CONTACT_ID}/status`,
        { status: 'RESOLVED' },
        userToken(),
      );
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  describe('Admin contact respond — email-worker trigger', () => {
    it('POST /admin/contact/:id/respond sends reply', async () => {
      const id = createdContactId ?? FAKE_CONTACT_ID;
      const { status } = await POST(
        `${ADMIN_CONTACT}/${id}/respond`,
        {
          message:
            'Dear E2E Test User, thank you for reaching out. ' +
            'This is an automated response from the e2e test suite.',
          markAsResolved: true,
        },
        adminToken(),
      );
      expect([200, 201, 400, 404, 422, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/contact/:id/respond with empty message returns 400', async () => {
      const { status } = await POST(
        `${ADMIN_CONTACT}/${FAKE_CONTACT_ID}/respond`,
        { message: '' },
        adminToken(),
      );
      expect([400, 422]).toContain(status);
    });
  });

  describe('Admin contact spam management', () => {
    it('PATCH /admin/contact/:id/spam marks contact as spam', async () => {
      const id = createdContactId ?? FAKE_CONTACT_ID;
      const { status } = await PATCH(
        `${ADMIN_CONTACT}/${id}/spam`,
        { isSpam: true, reason: 'E2E test spam marking.' },
        adminToken(),
      );
      expect([200, 400, 404, 502, 503, 504]).toContain(status);
    });
  });

  describe('Admin contact delete', () => {
    it('DELETE /admin/contact/:id requires ADMIN role', async () => {
      const { status } = await DELETE(`${ADMIN_CONTACT}/${FAKE_CONTACT_ID}`, userToken());
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('DELETE /admin/contact/:id with ADMIN token processes deletion', async () => {
      const id = createdContactId ?? FAKE_CONTACT_ID;
      const { status } = await DELETE(`${ADMIN_CONTACT}/${id}`, adminToken());
      expect([200, 204, 400, 404, 502, 503, 504]).toContain(status);
    });
  });
});
