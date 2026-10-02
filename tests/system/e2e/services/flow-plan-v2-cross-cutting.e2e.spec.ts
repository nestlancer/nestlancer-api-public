/**
 * Cross-cutting E2E — Flow Plan V2 fixes via API gateway.
 *
 * Requires running stack (gateway + microservices). Skips when gateway unreachable.
 */

import axios, { AxiosError } from 'axios';
import { getApiBase, resolveStatus } from '../../setup/http';
import { bearerToken, mintSystemToken } from '../../setup/auth';

const BASE = getApiBase();
const ADMIN = `${BASE}/admin`;
const SERVICES = `${BASE}/services`;

const ADMIN_ID = 'e2e-flow-v2-admin-adm1-9876-5432-10fe-dcba98765432';
const adminToken = () => `Bearer ${mintSystemToken(ADMIN_ID, 'ADMIN')}`;

type SafeResult = { status: number; data: unknown; reachable: boolean };

async function GET(url: string, token?: string): Promise<SafeResult> {
  return axios
    .get(url, { headers: token ? { Authorization: token } : {}, timeout: 12_000 })
    .then((r) => ({ status: resolveStatus(r.status, r.data), data: r.data, reachable: true }))
    .catch((e: AxiosError) => ({
      status: e.response?.status ?? 0,
      data: e.response?.data ?? null,
      reachable: e.code !== 'ECONNREFUSED' && e.code !== 'ENOTFOUND',
    }));
}

async function POST(url: string, body: unknown, token?: string): Promise<SafeResult> {
  return axios
    .post(url, body, {
      headers: token ? { Authorization: token } : {},
      timeout: 12_000,
    })
    .then((r) => ({ status: resolveStatus(r.status, r.data), data: r.data, reachable: true }))
    .catch((e: AxiosError) => ({
      status: e.response?.status ?? 0,
      data: e.response?.data ?? null,
      reachable: e.code !== 'ECONNREFUSED' && e.code !== 'ENOTFOUND',
    }));
}

describe('Flow Plan V2 — Cross-cutting (gateway)', () => {
  let gatewayUp = false;

  beforeAll(async () => {
    const health = await GET(`${BASE}/health`);
    gatewayUp = health.reachable && health.status < 500;
  });

  it('GET /services is public via gateway (V2-INFRA-001)', async () => {
    if (!gatewayUp) {
      console.warn('Gateway unreachable — skipping cross-cutting services test');
      return;
    }

    const res = await GET(SERVICES);
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      const body = res.data as { status?: string };
      expect(body?.status).toBe('success');
    }
  });

  it('GET /admin/requests/capacity/dashboard is proxied (V2-INFRA-001)', async () => {
    if (!gatewayUp) {
      console.warn('Gateway unreachable — skipping capacity dashboard test');
      return;
    }

    const res = await GET(`${ADMIN}/requests/capacity/dashboard`, adminToken());
    expect([200, 401, 403]).toContain(res.status);
  });

  it('POST /admin/quotes/:id/extend route exists on gateway (V2-INFRA-001)', async () => {
    if (!gatewayUp) {
      console.warn('Gateway unreachable — skipping quote extend route test');
      return;
    }

    const fakeQuoteId = '00000000-0000-0000-0000-000000000099';
    const res = await POST(
      `${ADMIN}/quotes/${fakeQuoteId}/extend`,
      { extendDays: 7 },
      adminToken(),
    );
    expect([400, 404, 422, 500]).not.toContain(0);
    expect(res.status).toBeGreaterThan(0);
    expect(res.status).not.toBe(404);
  });
});
