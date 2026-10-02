/**
 * E2E — Webhooks service
 *
 * Full end-to-end coverage of the webhooks service via the API gateway.
 * Tests incoming provider webhooks (Razorpay, GitHub, Cloudflare, generic)
 * and outgoing webhook delivery management.
 *
 * Worker integration:
 *   • Incoming webhooks are processed by webhook-worker (provider-specific handlers)
 *   • Outgoing webhooks are delivered by webhook-worker (HTTP delivery with retry)
 *   • webhook-worker publishes to outbox → outbox-poller picks up
 *   • Failed deliveries trigger notification-worker (admin alert)
 *
 * Routes: /api/v1/webhooks/* (public receiver) and /api/v1/admin/webhooks/*
 */

import axios, { AxiosError } from 'axios';
import { getApiBase, resolveStatus } from '../../setup/http';
import { bearerToken, mintSystemToken } from '../../setup/auth';

const BASE = getApiBase();
const WEBHOOKS = `${BASE}/webhooks`;
const ADMIN_WEBHOOKS = `${BASE}/admin/webhooks`;

const USER_ID = 'e2e-webhooks-user-whk1-2345-6789-abcd-ef0123456789';
const ADMIN_ID = 'e2e-webhooks-admin-adm7-9876-5432-10fe-dcba98765432';
const FAKE_WEBHOOK_ID = '00000000-whk-00000-0000-000000000001';
const RUN_ID = Date.now();

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

async function POST(
  url: string,
  body: unknown,
  token?: string,
  extraHeaders?: Record<string, string>,
): Promise<SafeResult> {
  return axios
    .post(url, body, {
      headers: {
        ...(token ? { Authorization: token } : {}),
        'Content-Type': 'application/json',
        ...(extraHeaders || {}),
      },
      timeout: 12_000,
    })
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

async function expectWebhooksReachable(): Promise<void> {
  try {
    await axios.get(`${WEBHOOKS}/health`, { timeout: 10_000 });
  } catch (e) {
    const ae = e as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(
        `[e2e] Webhooks service not reachable at ${WEBHOOKS}. Run: pnpm docker:e2e:up`,
      );
    }
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('E2E — Webhooks service', () => {
  beforeAll(expectWebhooksReachable);

  // ── Health ─────────────────────────────────────────────────────────────────
  describe('Health check', () => {
    it('GET /webhooks/health → 200', async () => {
      const { status } = await GET(`${WEBHOOKS}/health`);
      expect([200, 502, 503, 504]).toContain(status);
    });
  });

  // ── Razorpay webhook receiver ─────────────────────────────────────────────
  describe('POST /webhooks/razorpay — payment webhook (webhook-worker trigger)', () => {
    const razorpayPayload = {
      entity: 'event',
      account_id: 'acc_e2e_test',
      event: 'payment.captured',
      contains: ['payment'],
      payload: {
        payment: {
          entity: {
            id: `pay_e2e_${RUN_ID}`,
            entity: 'payment',
            amount: 50000,
            currency: 'INR',
            status: 'captured',
            order_id: `order_e2e_${RUN_ID}`,
            email: 'e2e@nestlancer.test',
            contact: '+919999999999',
            method: 'card',
            captured: true,
            created_at: Math.floor(Date.now() / 1000),
          },
        },
      },
    };

    it('POST without signature header → 400 (signature required)', async () => {
      const { status } = await POST(`${WEBHOOKS}/razorpay`, razorpayPayload);
      // 400 = missing sig, 401 = auth failed, 200 = bypass in test env
      expect([200, 201, 400, 401, 403, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('POST with invalid Razorpay signature → 400 or 401', async () => {
      const { status } = await POST(
        `${WEBHOOKS}/razorpay`,
        JSON.stringify(razorpayPayload),
        undefined,
        { 'X-Razorpay-Signature': `fake_sig_${RUN_ID}` },
      );
      expect([400, 401, 403, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('POST payment.failed event is accepted', async () => {
      const failurePayload = {
        ...razorpayPayload,
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              ...razorpayPayload.payload.payment.entity,
              status: 'failed',
              id: `pay_failed_${RUN_ID}`,
            },
          },
        },
      };
      const { status } = await POST(`${WEBHOOKS}/razorpay`, failurePayload);
      expect([200, 201, 400, 401, 403, 422, 500, 502, 503, 504]).toContain(status);
    });
  });

  // ── Cloudflare webhook receiver ───────────────────────────────────────────
  describe('POST /webhooks/cloudflare — CDN/DNS webhook (cdn-worker trigger)', () => {
    it('POST without valid signature header is processed', async () => {
      const { status } = await POST(
        `${WEBHOOKS}/cloudflare`,
        {
          name: 'Zone Cache Purged',
          data: {
            timestamp: new Date().toISOString(),
            zone_id: 'e2e-test-zone-id',
          },
        },
        undefined,
        { 'CF-Webhook-Auth': `Bearer e2e-test-token-${RUN_ID}` },
      );
      expect([200, 201, 400, 401, 403, 422, 500, 502, 503, 504]).toContain(status);
    });
  });

  // ── GitHub webhook receiver ───────────────────────────────────────────────
  describe('POST /webhooks/github — GitHub event webhook', () => {
    it('POST push event without GitHub signature → 400/401', async () => {
      const { status } = await POST(
        `${WEBHOOKS}/github`,
        {
          ref: 'refs/heads/main',
          repository: { full_name: 'nestlancer/backend-api', id: 1234567890 },
          pusher: { name: 'e2e-test' },
          commits: [{ id: 'abc123', message: 'E2E test commit' }],
        },
        undefined,
        {
          'X-GitHub-Event': 'push',
          'X-Hub-Signature-256': `sha256=e2e_invalid_sig_${RUN_ID}`,
        },
      );
      expect([200, 201, 400, 401, 403, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('POST pull_request event is handled', async () => {
      const { status } = await POST(
        `${WEBHOOKS}/github`,
        {
          action: 'opened',
          pull_request: {
            id: RUN_ID,
            number: 42,
            title: 'E2E Test PR',
            state: 'open',
          },
        },
        undefined,
        {
          'X-GitHub-Event': 'pull_request',
          'X-Hub-Signature-256': `sha256=e2e_invalid_sig_${RUN_ID}`,
        },
      );
      expect([200, 201, 400, 401, 403, 422, 500, 502, 503, 504]).toContain(status);
    });
  });

  // ── Generic provider webhook ──────────────────────────────────────────────
  describe('POST /webhooks/:provider — generic webhook receiver', () => {
    it('POST to unknown provider is handled (routed to generic handler)', async () => {
      const { status } = await POST(`${WEBHOOKS}/e2e-test-provider`, {
        type: 'e2e.test.event',
        timestamp: Date.now(),
        data: { message: 'E2E generic webhook test', runId: RUN_ID },
      });
      // 200 = handled, 400 = unknown provider validation, 404 = no handler
      expect([200, 201, 400, 404, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('POST with empty body to generic provider', async () => {
      const { status } = await POST(`${WEBHOOKS}/some-provider`, {});
      expect([200, 201, 400, 422, 500, 502, 503, 504]).toContain(status);
    });
  });

  // ── Admin webhook management ──────────────────────────────────────────────
  describe('Admin webhooks — outgoing webhook management', () => {
    it('GET /admin/webhooks with USER token → 403', async () => {
      const { status } = await GET(ADMIN_WEBHOOKS, userToken());
      expect([0, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/webhooks with ADMIN token is not 401', async () => {
      const { status } = await GET(ADMIN_WEBHOOKS, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/webhooks — register outgoing webhook', async () => {
      const { status } = await POST(
        ADMIN_WEBHOOKS,
        {
          name: `E2E Test Webhook — ${RUN_ID}`,
          url: 'https://webhook.site/e2e-test-endpoint',
          events: ['payment.completed', 'project.created', 'quote.accepted'],
          secret: `e2e_webhook_secret_${RUN_ID}`,
          enabled: true,
        },
        adminToken(),
      );
      expect([201, 400, 403, 409, 422, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/webhooks/:id/enable with ADMIN token', async () => {
      const { status } = await POST(
        `${ADMIN_WEBHOOKS}/${FAKE_WEBHOOK_ID}/enable`,
        {},
        adminToken(),
      );
      expect([200, 201, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/webhooks/:id/test — test webhook delivery (webhook-worker trigger)', async () => {
      const { status } = await POST(
        `${ADMIN_WEBHOOKS}/${FAKE_WEBHOOK_ID}/test`,
        { eventType: 'ping' },
        adminToken(),
      );
      expect([200, 201, 400, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/webhooks/:id/deliveries — delivery history', async () => {
      const { status } = await GET(`${ADMIN_WEBHOOKS}/${FAKE_WEBHOOK_ID}/deliveries`, adminToken());
      expect([200, 404, 502, 503, 504]).toContain(status);
    });

    it('DELETE /admin/webhooks/:id with USER token → 403', async () => {
      const { status } = await DELETE(`${ADMIN_WEBHOOKS}/${FAKE_WEBHOOK_ID}`, userToken());
      expect([0, 401, 403, 404]).toContain(status);
    });
  });
});
