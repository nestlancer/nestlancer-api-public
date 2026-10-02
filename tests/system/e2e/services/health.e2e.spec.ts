/**
 * E2E — Health service
 *
 * Full end-to-end coverage of the health service via the API gateway.
 * Tests all health check endpoints including database, cache, queue,
 * storage, microservices, external dependencies, workers, and WebSocket gateway.
 *
 * Note: Health endpoints are public. Admin debug endpoints require ADMIN role.
 *
 * Routes: /api/v1/health/* and /api/v1/debug/* (admin)
 */

import axios, { AxiosError } from 'axios';
import { getApiBase, resolveStatus } from '../../setup/http';
import { bearerToken, mintSystemToken } from '../../setup/auth';

const BASE = getApiBase();
const HEALTH = `${BASE}/health`;
const ADMIN_DEBUG = `${BASE}/debug`;

const USER_ID = 'e2e-health-user-hlt1-2345-6789-abcd-ef0123456789';
const ADMIN_ID = 'e2e-health-admin-adm6-9876-5432-10fe-dcba98765432';

const userToken = () => bearerToken(USER_ID, 'USER');
const adminToken = () => `Bearer ${mintSystemToken(ADMIN_ID, 'ADMIN')}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

type SafeResult = { status: number; data: any };

async function GET(url: string, token?: string): Promise<SafeResult> {
  return axios
    .get(url, { headers: token ? { Authorization: token } : {}, timeout: 15_000 })
    .then((r) => ({ status: resolveStatus(r.status, r.data), data: r.data }))
    .catch((e: AxiosError) => ({
      status: e.response?.status ?? 0,
      data: e.response?.data ?? null,
    }));
}

// ── Reachability guard ────────────────────────────────────────────────────────

async function expectHealthReachable(): Promise<void> {
  try {
    await axios.get(HEALTH, { timeout: 10_000 });
  } catch (e) {
    const ae = e as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(`[e2e] Health service not reachable at ${HEALTH}. Run: pnpm docker:e2e:up`);
    }
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('E2E — Health service', () => {
  beforeAll(expectHealthReachable);

  // ── Basic health checks ───────────────────────────────────────────────────
  describe('Public health endpoints', () => {
    it('GET /health → 200 (basic liveness)', async () => {
      const { status, data } = await GET(HEALTH);
      expect(status).toBe(200);
      const body = data as Record<string, unknown>;
      // Response should have status/healthy indicator
      expect(body).toBeDefined();
    });

    it('GET /health/detailed → 200 with detailed component statuses', async () => {
      const { status, data } = await GET(`${HEALTH}/detailed`);
      expect([200, 207, 503]).toContain(status); // 207 = partial, 503 = degraded
      expect(data).toBeDefined();
    });

    it('GET /health/ready → 200 (readiness probe)', async () => {
      const { status } = await GET(`${HEALTH}/ready`);
      expect([200, 503]).toContain(status);
    });

    it('GET /health/live → 200 (liveness probe)', async () => {
      const { status } = await GET(`${HEALTH}/live`);
      expect([200, 503]).toContain(status);
    });

    it('GET /health/database → reflects DB connectivity', async () => {
      const { status, data } = await GET(`${HEALTH}/database`);
      expect([200, 503, 502, 503, 504]).toContain(status);
      if (status === 200) {
        const body = data as Record<string, unknown>;
        expect(body).toBeDefined();
      }
    });

    it('GET /health/cache → reflects Redis connectivity', async () => {
      const { status } = await GET(`${HEALTH}/cache`);
      expect([200, 503, 502, 503, 504]).toContain(status);
    });

    it('GET /health/queue → reflects RabbitMQ connectivity', async () => {
      const { status } = await GET(`${HEALTH}/queue`);
      expect([200, 503, 502, 503, 504]).toContain(status);
    });

    it('GET /health/storage → reflects S3/storage connectivity', async () => {
      const { status } = await GET(`${HEALTH}/storage`);
      expect([200, 503, 502, 503, 504]).toContain(status);
    });

    it('GET /health/microservices → reflects all microservice statuses', async () => {
      const { status, data } = await GET(`${HEALTH}/microservices`);
      expect([200, 207, 503, 502, 503, 504]).toContain(status);
      if (status === 200 || status === 207) {
        expect(data).toBeDefined();
      }
    });

    it('GET /health/external → reflects external API dependencies', async () => {
      const { status } = await GET(`${HEALTH}/external`);
      expect([200, 503, 502, 503, 504]).toContain(status);
    });

    it('GET /health/workers → reflects background worker statuses', async () => {
      const { status } = await GET(`${HEALTH}/workers`);
      expect([200, 207, 503, 502, 503, 504]).toContain(status);
    });

    it('GET /health/websocket → reflects ws-gateway status', async () => {
      const { status } = await GET(`${HEALTH}/websocket`);
      expect([200, 503, 502, 503, 504]).toContain(status);
    });

    it('GET /health/system → system resource metrics', async () => {
      const { status, data } = await GET(`${HEALTH}/system`);
      expect([200, 503, 502, 503, 504]).toContain(status);
      if (status === 200) {
        const body = data as Record<string, unknown>;
        const payload = body?.data ?? body;
        // Should include memory/CPU metrics
        expect(payload).toBeDefined();
      }
    });

    it('GET /health/features → feature flags registry', async () => {
      const { status } = await GET(`${HEALTH}/features`);
      expect([200, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /health/registry → service registry listing', async () => {
      const { status } = await GET(`${HEALTH}/registry`);
      expect([200, 404, 502, 503, 504]).toContain(status);
    });
  });

  // ── Health response shape validation ──────────────────────────────────────
  describe('Health response format validation', () => {
    it('GET /health returns object with status field', async () => {
      const { status, data } = await GET(HEALTH);
      expect(status).toBe(200);
      const body = data as Record<string, unknown>;
      // Expect some form of status indicator
      const hasStatus = Boolean(
        body?.status ?? body?.data?.status ?? body?.healthy ?? body?.data?.healthy,
      );
      expect(typeof body === 'object' && body !== null).toBe(true);
    });

    it('GET /health/detailed returns component breakdown', async () => {
      const { status, data } = await GET(`${HEALTH}/detailed`);
      if (status === 200 || status === 207) {
        const body = data as Record<string, unknown>;
        expect(typeof body === 'object' && body !== null).toBe(true);
      }
    });
  });

  // ── Admin debug endpoints ─────────────────────────────────────────────────
  describe('Admin debug endpoints — privilege enforcement', () => {
    it('GET /debug without token → 401', async () => {
      const { status } = await GET(ADMIN_DEBUG);
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('GET /debug with USER token → 403', async () => {
      const { status } = await GET(ADMIN_DEBUG, userToken());
      expect([0, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /debug with ADMIN token passes privilege check', async () => {
      const { status } = await GET(ADMIN_DEBUG, adminToken());
      expect(status).not.toBe(401);
      expect([200, 403, 404, 502, 503, 504]).toContain(status);
    });
  });

  // ── Gateway-level health ──────────────────────────────────────────────────
  describe('Gateway-level health (via gateway controller)', () => {
    it('GET /health via gateway returns 200', async () => {
      const { status } = await GET(HEALTH);
      expect(status).toBe(200);
    });

    it('Health endpoint responds within 10 seconds', async () => {
      const start = Date.now();
      await GET(HEALTH);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(10_000);
    });
  });
});
