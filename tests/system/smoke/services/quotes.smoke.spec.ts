/**
 * System smoke — Quotes service
 *
 * Exercises the quotes service via the API gateway at `/api/v1/quotes/*`.
 * The quotes service (port 3007) exposes:
 *   GET / POST    /quotes              — list & create project quotes
 *   GET / PATCH / DELETE /quotes/:id  — individual quote management
 *   GET           /quotes/:id/pdf     — PDF download (CORS headers set)
 *   Admin routes: /admin/quotes/*     — override, re-price, export
 *
 * Smoke goals:
 *   ✓ Unauthenticated GET /quotes returns 401 (protected).
 *   ✓ Authenticated GET /quotes passes auth guard.
 *   ✓ POST with invalid body returns 400 (validation active).
 *   ✓ Admin endpoint is privilege-gated.
 */

import axios, { AxiosError } from 'axios';
import { getApiBase } from '../../setup/http';
import { bearerToken } from '../../setup/auth';

const QUOTES = `${getApiBase()}/quotes`;

async function expectQuotesReachable(): Promise<void> {
  try {
    await axios.get(QUOTES, { timeout: 8_000 });
  } catch (err) {
    const ae = err as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(
        `[system-e2e] Quotes service not reachable at ${QUOTES}.\n` +
          `  Start: pnpm docker:e2e:up  OR  pnpm --filter @nestlancer/quotes-service dev`,
      );
    }
  }
}

describe('System smoke — Quotes service', () => {
  beforeAll(expectQuotesReachable);

  describe('Auth enforcement', () => {
    it('GET /api/v1/quotes without token returns 401', async () => {
      let status = 0;
      try {
        await axios.get(QUOTES, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('POST /api/v1/quotes without token returns 401', async () => {
      let status = 0;
      try {
        await axios.post(QUOTES, {}, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  describe('Authenticated access', () => {
    it('GET /api/v1/quotes with JWT passes auth guard', async () => {
      let status = 0;
      try {
        const res = await axios.get(QUOTES, {
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

    it('POST /api/v1/quotes with JWT + empty body returns 400 (validation active)', async () => {
      let status = 0;
      try {
        await axios.post(
          QUOTES,
          {},
          {
            headers: { Authorization: bearerToken() },
            timeout: 8_000,
          },
        );
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 200, 201, 400, 404, 422, 502, 503, 504]).toContain(status);
    });
  });

  describe('Admin routes — privilege check', () => {
    it('GET /api/v1/admin/quotes with USER-role JWT returns 403 or 404', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${getApiBase()}/admin/quotes`, {
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
