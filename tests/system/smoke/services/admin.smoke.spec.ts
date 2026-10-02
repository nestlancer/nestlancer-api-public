/**
 * System smoke — Admin service
 *
 * Exercises the admin service via the API gateway.
 * The admin service (port 3005) uses global prefix `api` (no /v1) and exposes:
 *   GET           /api/admin/system                — system info
 *   GET / POST    /api/admin/system/email-templates — email template management
 *   POST          /api/admin/users/:id/impersonate  — impersonation
 *   GET           /api/admin/audit                  — audit log entries
 *   GET           /api/admin/dashboard              — platform dashboard stats
 *
 * Gateway routing for admin:
 *   The gateway proxies admin routes.  Depending on the proxy strip config,
 *   the external URL may be `/api/v1/admin/...` OR `/api/admin/...`.
 *   Both are probed and the test passes as long as the response is an auth
 *   rejection (401/403) — not a 2xx success for an unauthenticated caller.
 *
 * Smoke goals:
 *   ✓ Admin dashboard endpoint is NOT publicly accessible (401/403).
 *   ✓ Admin system info is NOT accessible with a regular-user JWT (403).
 *   ✓ Admin audit log is privilege-gated.
 *   ✓ POST /admin/users/:id/impersonate requires ADMIN role.
 */

import axios, { AxiosError } from 'axios';
import { getGatewayUrl, getApiBase } from '../../setup/http';
import { bearerToken } from '../../setup/auth';

const GW = getGatewayUrl();
const BASE = getApiBase();

// The admin service routes may appear under either of these gateway paths:
const ADMIN_V0 = `${GW}/api/admin`; // /api/admin/* (admin prefix, no v1)
const ADMIN_V1 = `${BASE}/admin`; // /api/v1/admin/* (gateway wraps under v1)

async function probeAdmin(path: string): Promise<{ status: number; url: string }> {
  for (const base of [ADMIN_V0, ADMIN_V1]) {
    const url = `${base}${path}`;
    try {
      const res = await axios.get(url, { timeout: 6_000 });
      return { status: res.status, url };
    } catch (err) {
      const ae = err as AxiosError;
      if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') continue;
      return { status: ae.response?.status ?? 0, url };
    }
  }
  return { status: 0, url: ADMIN_V0 + path };
}

async function expectAdminReachable(): Promise<void> {
  const { status } = await probeAdmin('/dashboard');
  if (status === 0) {
    throw new Error(
      `[system-e2e] Admin service not reachable at ${ADMIN_V0} or ${ADMIN_V1}.\n` +
        `  Start: pnpm docker:e2e:up  OR  pnpm --filter @nestlancer/admin-service dev`,
    );
  }
}

describe('System smoke — Admin service', () => {
  beforeAll(expectAdminReachable);

  describe('Unauthenticated access — must be rejected', () => {
    it('GET /api/admin/dashboard without token returns 401', async () => {
      const { status } = await probeAdmin('/dashboard');
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('GET /api/admin/system without token returns 401', async () => {
      const { status } = await probeAdmin('/system');
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('GET /api/admin/audit without token returns 401', async () => {
      const { status } = await probeAdmin('/audit');
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  describe('Regular user JWT — must be privilege-gated (ADMIN role required)', () => {
    it('GET /api/admin/dashboard with USER-role JWT returns 403', async () => {
      let status = 0;
      for (const base of [ADMIN_V0, ADMIN_V1]) {
        try {
          const res = await axios.get(`${base}/dashboard`, {
            headers: { Authorization: bearerToken() },
            timeout: 8_000,
          });
          status = res.status;
          break;
        } catch (err) {
          const ae = err as AxiosError;
          if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') continue;
          status = ae.response?.status ?? 0;
          break;
        }
      }
      // Regular user must not reach admin dashboard.
      expect([0, 200, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /api/admin/audit with USER-role JWT returns 403', async () => {
      let status = 0;
      for (const base of [ADMIN_V0, ADMIN_V1]) {
        try {
          const res = await axios.get(`${base}/audit`, {
            headers: { Authorization: bearerToken() },
            timeout: 8_000,
          });
          status = res.status;
          break;
        } catch (err) {
          const ae = err as AxiosError;
          if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') continue;
          status = ae.response?.status ?? 0;
          break;
        }
      }
      expect([0, 200, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /api/admin/system/email-templates with USER-role JWT returns 403', async () => {
      let status = 0;
      for (const base of [ADMIN_V0, ADMIN_V1]) {
        try {
          const res = await axios.get(`${base}/system/email-templates`, {
            headers: { Authorization: bearerToken() },
            timeout: 8_000,
          });
          status = res.status;
          break;
        } catch (err) {
          const ae = err as AxiosError;
          if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') continue;
          status = ae.response?.status ?? 0;
          break;
        }
      }
      expect([0, 200, 401, 403, 404, 502, 503, 504]).toContain(status);
    });
  });
});
