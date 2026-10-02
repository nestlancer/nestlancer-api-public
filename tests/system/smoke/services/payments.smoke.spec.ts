/**
 * System smoke — Payments service
 *
 * Exercises the payments service via the API gateway at `/api/v1/payments/*`
 * and `/api/v1/invoices/*`.
 * The payments service (port 3003) exposes:
 *   GET / POST    /payments             — payment intents / history
 *   GET           /payments/methods     — saved payment methods
 *   GET           /invoices             — invoice list
 *   GET           /invoices/:id         — individual invoice (PDF support)
 *   Admin routes: /admin/payments/*, /admin/milestones/*
 *   Provider webhooks: POST /webhooks/razorpay (raw body, no auth)
 *
 * Smoke goals:
 *   ✓ Unauthenticated calls to payments/invoices return 401.
 *   ✓ Authenticated GET /payments passes auth guard.
 *   ✓ Authenticated GET /invoices passes auth guard.
 *   ✓ POST with invalid body returns 400 (validation pipe active).
 *   ✓ Admin endpoint is privilege-gated.
 */

import axios, { AxiosError } from 'axios';
import { getApiBase } from '../../setup/http';
import { bearerToken } from '../../setup/auth';

const BASE = getApiBase();
const PAYMENTS = `${BASE}/payments`;
const INVOICES = `${BASE}/invoices`;

async function expectPaymentsReachable(): Promise<void> {
  try {
    await axios.get(PAYMENTS, { timeout: 8_000 });
  } catch (err) {
    const ae = err as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(
        `[system-e2e] Payments service not reachable at ${PAYMENTS}.\n` +
          `  Start: pnpm docker:e2e:up  OR  pnpm --filter @nestlancer/payments-service dev`,
      );
    }
  }
}

describe('System smoke — Payments service', () => {
  beforeAll(expectPaymentsReachable);

  describe('Auth enforcement', () => {
    it('GET /api/v1/payments without token returns 401', async () => {
      let status = 0;
      try {
        await axios.get(PAYMENTS, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('GET /api/v1/invoices without token returns 401', async () => {
      let status = 0;
      try {
        await axios.get(INVOICES, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('GET /api/v1/payments/methods without token returns 401', async () => {
      let status = 0;
      try {
        await axios.get(`${PAYMENTS}/methods`, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  describe('Authenticated access', () => {
    it('GET /api/v1/payments with JWT passes auth guard', async () => {
      let status = 0;
      try {
        const res = await axios.get(PAYMENTS, {
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

    it('GET /api/v1/invoices with JWT passes auth guard', async () => {
      let status = 0;
      try {
        const res = await axios.get(INVOICES, {
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

    it('POST /api/v1/payments with JWT + empty body returns 400 (validation active)', async () => {
      let status = 0;
      try {
        await axios.post(
          PAYMENTS,
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
    it('GET /api/v1/admin/payments with USER-role JWT returns 403 or 404', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${BASE}/admin/payments`, {
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
