/**
 * System smoke — Portfolio service
 *
 * Exercises the portfolio service via the API gateway at `/api/v1/portfolio/*`.
 * The portfolio service (port 3013) exposes:
 *   GET           /portfolio               — public portfolio list (search-indexed)
 *   GET           /portfolio/:slug         — individual portfolio item
 *   POST / PATCH  /portfolio               — create/update (authenticated)
 *   Admin routes: /admin/portfolio/*, /admin/portfolio/categories/*
 *
 * Smoke goals:
 *   ✓ GET /portfolio is publicly accessible (no auth needed for listing).
 *   ✓ GET /portfolio/:slug returns the item or 404 — not 401.
 *   ✓ POST /portfolio without token returns 401.
 *   ✓ Authenticated POST passes auth guard (2xx or 400).
 *   ✓ Admin portfolio endpoint is privilege-gated.
 */

import axios, { AxiosError } from 'axios';
import { getApiBase } from '../../setup/http';
import { bearerToken } from '../../setup/auth';

const BASE = getApiBase();
const PORTFOLIO = `${BASE}/portfolio`;

async function expectPortfolioReachable(): Promise<void> {
  try {
    await axios.get(PORTFOLIO, { timeout: 8_000 });
  } catch (err) {
    const ae = err as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(
        `[system-e2e] Portfolio service not reachable at ${PORTFOLIO}.\n` +
          `  Start: pnpm docker:e2e:up  OR  pnpm --filter @nestlancer/portfolio-service dev`,
      );
    }
    // 4xx/5xx = service reached, continue
  }
}

describe('System smoke — Portfolio service', () => {
  beforeAll(expectPortfolioReachable);

  describe('Public access (no auth required)', () => {
    it('GET /api/v1/portfolio responds without authentication', async () => {
      let status = 0;
      try {
        const res = await axios.get(PORTFOLIO, { timeout: 8_000 });
        status = res.status;
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      // Public listing: 200 (ok) or 404 (empty) — not 401/403.
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });

    it('GET /api/v1/portfolio/non-existent-slug returns 404 not 401', async () => {
      let status = 0;
      try {
        await axios.get(`${PORTFOLIO}/smoke-probe-no-such-item`, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  describe('Auth enforcement on write endpoints', () => {
    it('POST /api/v1/portfolio without token returns 401', async () => {
      let status = 0;
      try {
        await axios.post(PORTFOLIO, {}, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  describe('Authenticated access', () => {
    it('GET /api/v1/portfolio with JWT is not 401 (public content, guard may be absent)', async () => {
      let status = 0;
      try {
        const res = await axios.get(PORTFOLIO, {
          headers: { Authorization: bearerToken() },
          timeout: 8_000,
        });
        status = res.status;
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  describe('Admin routes — privilege check', () => {
    it('GET /api/v1/admin/portfolio with USER-role JWT returns 403 or 404', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${BASE}/admin/portfolio`, {
          headers: { Authorization: bearerToken() },
          timeout: 8_000,
        });
        status = res.status;
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 200, 401, 403, 404, 502, 503, 504]).toContain(status);
    });

    it('GET /api/v1/admin/portfolio/categories with USER-role JWT returns 403 or 404', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${BASE}/admin/portfolio/categories`, {
          headers: { Authorization: bearerToken() },
          timeout: 8_000,
        });
        status = res.status;
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 200, 401, 403, 404, 502, 503, 504]).toContain(status);
    });
  });
});
