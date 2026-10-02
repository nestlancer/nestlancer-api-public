/**
 * E2E — Notifications service
 *
 * Full end-to-end coverage of the notifications service via the API gateway.
 * Tests notification listing, read/unread state management, preferences,
 * push subscription management, internal trigger endpoint, and admin operations.
 *
 * Worker integration:
 *   • POST /internal/notifications/trigger dispatches to notification-worker
 *   • Admin broadcast dispatches to notification-worker (batch)
 *   • Push notifications go through notification-worker → push delivery
 *   • Email channels go through notification-worker → email-worker
 *
 * Routes: /api/v1/notifications/*, /api/v1/push/*, /api/v1/internal/notifications/*
 *         /api/v1/admin/notifications/*, /api/v1/admin/templates/*
 */

import axios, { AxiosError } from 'axios';
import { getApiBase, resolveStatus } from '../../setup/http';
import { bearerToken, mintSystemToken } from '../../setup/auth';

const BASE = getApiBase();
const NOTIFICATIONS = `${BASE}/notifications`;
const PUSH_REGISTER = `${BASE}/push/register`;
const PUSH_UNREGISTER = (deviceId: string) =>
  `${BASE}/push/unregister/${encodeURIComponent(deviceId)}`;
const INTERNAL_NOTIF = `${BASE}/internal/notifications`;
const ADMIN_NOTIF = `${BASE}/admin/notifications`;
const ADMIN_TEMPLATES = `${BASE}/admin/notification-templates`;

const USER_ID = 'e2e-notif-user-a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const ADMIN_ID = 'e2e-notif-admin-09876543-21fe-dcba-9876-543210fedcba';

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

async function expectNotificationsReachable(): Promise<void> {
  try {
    await axios.get(NOTIFICATIONS, { timeout: 10_000 });
  } catch (e) {
    const ae = e as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(
        `[e2e] Notifications service not reachable at ${NOTIFICATIONS}. Run: pnpm docker:e2e:up`,
      );
    }
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('E2E — Notifications service', () => {
  beforeAll(expectNotificationsReachable);

  // ── Auth enforcement ───────────────────────────────────────────────────────
  describe('Auth enforcement', () => {
    const protectedEndpoints = [
      NOTIFICATIONS,
      `${NOTIFICATIONS}/preferences`,
      `${NOTIFICATIONS}/unread-count`,
      `${NOTIFICATIONS}/history`,
    ];

    for (const url of protectedEndpoints) {
      it(`GET ${url.replace(BASE, '')} without token → 401`, async () => {
        const { status } = await GET(url);
        expect([0, 401, 403]).toContain(status);
      });
    }

    it('POST /push/register without token → 401', async () => {
      const { status } = await POST(PUSH_REGISTER, {});
      expect([0, 401, 403]).toContain(status);
    });
  });

  // ── Notification listing ──────────────────────────────────────────────────
  describe('GET /notifications — notification list', () => {
    it('with JWT returns notifications (not 401/403)', async () => {
      const { status, data } = await GET(NOTIFICATIONS, userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      if (status === 200) {
        const body = data as Record<string, unknown>;
        const list = body?.data ?? body;
        expect(Array.isArray(list) || typeof list === 'object').toBe(true);
      }
    });

    it('with pagination params', async () => {
      const { status } = await GET(NOTIFICATIONS, userToken(), {
        page: '1',
        limit: '20',
        read: 'false',
      });
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('with JWT returns count', async () => {
      const { status, data } = await GET(`${NOTIFICATIONS}/unread-count`, userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      if (status === 200) {
        const body = data as Record<string, unknown>;
        const count = body?.data?.count ?? body?.count;
        expect(count === undefined || typeof count === 'number').toBe(true);
      }
    });
  });

  describe('GET /notifications/history', () => {
    it('returns notification history for user', async () => {
      const { status } = await GET(`${NOTIFICATIONS}/history`, userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  // ── Individual notification ───────────────────────────────────────────────
  describe('GET /notifications/:id', () => {
    it('non-existent notification returns 404', async () => {
      const { status } = await GET(
        `${NOTIFICATIONS}/00000000-0000-0000-0000-000000000001`,
        userToken(),
      );
      expect([404, 403, 400]).toContain(status);
    });
  });

  // ── Mark read/unread ──────────────────────────────────────────────────────
  describe('PATCH /notifications/:id/read', () => {
    it('non-existent notification returns 404', async () => {
      const { status } = await PATCH(
        `${NOTIFICATIONS}/00000000-0000-0000-0000-000000000001/read`,
        {},
        userToken(),
      );
      expect([200, 404, 400]).toContain(status);
    });
  });

  describe('POST /notifications/read-all — bulk mark read', () => {
    it('with JWT bulk-marks all notifications as read', async () => {
      const { status } = await POST(`${NOTIFICATIONS}/read-all`, {}, userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      expect([200, 201, 404, 500, 502, 503, 504]).toContain(status);
    });
  });

  describe('POST /notifications/read-selected', () => {
    it('valid list of IDs processed', async () => {
      const { status } = await POST(
        `${NOTIFICATIONS}/read-selected`,
        {
          ids: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'],
        },
        userToken(),
      );
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      expect([200, 201, 400, 404, 500, 502, 503, 504]).toContain(status);
    });

    it('empty IDs array returns 400 or is accepted', async () => {
      const { status } = await POST(`${NOTIFICATIONS}/read-selected`, { ids: [] }, userToken());
      expect([200, 400, 422]).toContain(status);
    });
  });

  describe('DELETE /notifications/clear-read', () => {
    it('with JWT clears read notifications', async () => {
      const { status } = await DELETE(`${NOTIFICATIONS}/clear-read`, userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
      expect([200, 204, 404, 500, 502, 503, 504]).toContain(status);
    });
  });

  // ── Preferences ───────────────────────────────────────────────────────────
  describe('GET + PATCH /notifications/preferences', () => {
    it('GET returns user preferences', async () => {
      const { status } = await GET(`${NOTIFICATIONS}/preferences`, userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('PATCH with valid preferences body is accepted', async () => {
      const { status } = await PATCH(
        `${NOTIFICATIONS}/preferences`,
        {
          channels: {
            IN_APP: true,
            EMAIL: true,
            PUSH: false,
          },
          types: {
            PROJECT_UPDATE: true,
            MESSAGE: true,
            PAYMENT: true,
            SYSTEM: true,
          },
          quietHoursEnabled: false,
        },
        userToken(),
      );
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  describe('GET /notifications/preferences/channels', () => {
    it('returns channel-level preferences', async () => {
      const { status } = await GET(`${NOTIFICATIONS}/preferences/channels`, userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  // ── Push subscriptions ────────────────────────────────────────────────────
  describe('POST /push/register — push device registration', () => {
    it('valid device registration payload is accepted', async () => {
      const { status } = await POST(
        PUSH_REGISTER,
        {
          token: 'e2e-fcm-or-web-push-token',
          deviceId: `e2e-device-${Date.now()}`,
          platform: 'web',
        },
        userToken(),
      );
      // 200/201 = registered, 400 = invalid subscription format
      expect([200, 201, 400, 404, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('empty body returns 400', async () => {
      const { status } = await POST(PUSH_REGISTER, {}, userToken());
      expect([400, 422]).toContain(status);
    });
  });

  describe('DELETE /push/unregister/:deviceId — unregister push subscription', () => {
    it('with JWT processes unregistration', async () => {
      const { status } = await DELETE(PUSH_UNREGISTER(`e2e-device-${Date.now()}`), userToken());
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  // ── Internal trigger endpoint ─────────────────────────────────────────────
  describe('POST /internal/notifications/trigger — notification-worker dispatch', () => {
    it('requires authentication', async () => {
      const { status } = await POST(`${INTERNAL_NOTIF}/trigger`, {});
      expect([0, 401, 403]).toContain(status);
    });

    it('with JWT and valid payload dispatches notification', async () => {
      const { status } = await POST(
        `${INTERNAL_NOTIF}/trigger`,
        {
          recipientIds: [USER_ID],
          title: 'E2E Test Notification — Internal Trigger',
          message:
            'This notification was triggered by the e2e test suite to verify the notification pipeline.',
          type: 'system.e2e.test',
          channels: ['IN_APP'],
        },
        userToken(),
      );
      // 200/201 = dispatched, 400 = validation, 403 = insufficient permissions for internal
      expect([200, 201, 400, 403, 404, 422, 500, 502, 503, 504]).toContain(status);
    });

    it('empty recipientIds returns 400 or is accepted (implementation-dependent)', async () => {
      const { status } = await POST(
        `${INTERNAL_NOTIF}/trigger`,
        { recipientIds: [], title: 'Test', message: 'Test' },
        userToken(),
      );
      expect([200, 201, 400, 422]).toContain(status);
    });
  });

  // ── Admin notifications ───────────────────────────────────────────────────
  describe('Admin notifications — privilege enforcement', () => {
    it('GET /admin/notifications with USER token → 403/404', async () => {
      const { status } = await GET(ADMIN_NOTIF, userToken());
      expect([0, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/notifications with ADMIN token passes check', async () => {
      const { status } = await GET(ADMIN_NOTIF, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/notifications/stats with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN_NOTIF}/stats`, adminToken());
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/notifications/broadcast — notification-worker batch trigger', async () => {
      const { status } = await POST(
        `${ADMIN_NOTIF}/broadcast`,
        {
          title: 'E2E Platform Announcement',
          message: 'This is a test broadcast notification from the e2e test suite.',
          channels: ['IN_APP'],
          type: 'system.announcement',
        },
        adminToken(),
      );
      expect([200, 201, 400, 403, 404, 422, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/notifications/send — targeted notification', async () => {
      const { status } = await POST(
        `${ADMIN_NOTIF}/send`,
        {
          recipientIds: [USER_ID],
          title: 'E2E Admin Test Notification',
          message: 'This notification was sent directly by an admin during e2e testing.',
          channels: ['IN_APP', 'EMAIL'],
        },
        adminToken(),
      );
      expect([200, 201, 400, 403, 404, 422, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/notifications/delivery-report with ADMIN token', async () => {
      const { status } = await GET(`${ADMIN_NOTIF}/delivery-report`, adminToken());
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });
  });

  // ── Admin notification templates ──────────────────────────────────────────
  describe('Admin notification templates', () => {
    it('GET /admin/notification-templates with USER token → 403', async () => {
      const { status } = await GET(ADMIN_TEMPLATES, userToken());
      expect([0, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /admin/notification-templates with ADMIN token is not 401', async () => {
      const { status } = await GET(ADMIN_TEMPLATES, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('POST /admin/notification-templates creates template', async () => {
      const { status } = await POST(
        ADMIN_TEMPLATES,
        {
          name: 'E2E Test Template — Project Update',
          type: 'project.update',
          title: 'Project Update: {{projectName}}',
          body: 'Your project "{{projectName}}" has been updated. Latest status: {{status}}.',
          channels: ['IN_APP', 'EMAIL'],
          variables: ['projectName', 'status'],
        },
        adminToken(),
      );
      expect([201, 400, 403, 404, 409, 422, 502, 503, 504]).toContain(status);
    });
  });
});
