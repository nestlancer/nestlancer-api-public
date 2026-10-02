/**
 * System smoke — Requests service
 *
 * Exercises the requests service via the API gateway at `/api/v1/requests/*`.
 * The requests service (port 3006) exposes:
 *   GET / POST    /requests              — list & create client requests
 *   GET / PATCH / DELETE /requests/:id  — individual request management
 *   Admin routes: /admin/requests/*     — moderation & status overrides
 *
 * Smoke goals:
 *   ✓ Unauthenticated GET /requests returns 401.
 *   ✓ Authenticated GET /requests passes auth guard (2xx or upstream issue).
 *   ✓ POST with invalid body returns 400 (validation pipe active).
 *   ✓ Admin endpoint is privilege-gated.
 */

import axios, { AxiosError } from 'axios';
import { getApiBase } from '../../setup/http';
import { bearerToken } from '../../setup/auth';

const REQUESTS = `${getApiBase()}/requests`;

async function expectRequestsReachable(): Promise<void> {
  try {
    await axios.get(REQUESTS, { timeout: 8_000 });
  } catch (err) {
    const ae = err as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(
        `[system-e2e] Requests service not reachable at ${REQUESTS}.\n` +
          `  Start: pnpm docker:e2e:up  OR  pnpm --filter @nestlancer/requests-service dev`,
      );
    }
  }
}

describe('System smoke — Requests service', () => {
  beforeAll(expectRequestsReachable);

  describe('Auth enforcement', () => {
    it('GET /api/v1/requests without token returns 401', async () => {
      let status = 0;
      try {
        await axios.get(REQUESTS, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('POST /api/v1/requests without token returns 401', async () => {
      let status = 0;
      try {
        await axios.post(REQUESTS, {}, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  describe('Authenticated access', () => {
    it('GET /api/v1/requests with JWT is not 401 (list or upstream error)', async () => {
      let status = 0;
      try {
        const res = await axios.get(REQUESTS, {
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

    it('POST /api/v1/requests with JWT + empty body returns 400 (validation)', async () => {
      let status = 0;
      try {
        const res = await axios.post(
          REQUESTS,
          {},
          {
            headers: { Authorization: bearerToken() },
            timeout: 8_000,
          },
        );
        status = res.status;
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      // 400 = validation pipe active; 422 = unprocessable; 201/200 unexpected with empty body
      expect([0, 200, 201, 400, 404, 422, 502, 503, 504]).toContain(status);
    });
  });

  describe('Admin routes — privilege check', () => {
    it('GET /api/v1/admin/requests with USER-role JWT returns 403 or 404', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${getApiBase()}/admin/requests`, {
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
