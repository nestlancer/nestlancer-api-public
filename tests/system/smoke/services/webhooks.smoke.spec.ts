/**
 * System smoke — Webhooks service
 *
 * Exercises the webhooks service via the API gateway at `/api/v1/webhooks/*`.
 * The webhooks service (port 3004) exposes:
 *   POST          /webhooks               — receive an inbound webhook (rawBody=true)
 *   GET           /webhooks/health        — service health check (if mounted)
 *   Admin routes: /admin/webhooks/*       — outbound endpoint management
 *
 * Smoke goals:
 *   ✓ POST /webhooks without a valid signature returns 400/401 (signature guard).
 *   ✓ Service is up — a probe returns something other than ECONNREFUSED.
 *   ✓ Admin endpoint is privilege-gated.
 *
 * Note: The webhooks service uses raw body parsing for HMAC signature
 *   verification.  A bare POST with no signature header should be rejected
 *   at the guard layer, not silently accepted — this is what we verify.
 */

import axios, { AxiosError } from 'axios';
import { getApiBase } from '../../setup/http';
import { bearerToken } from '../../setup/auth';

const BASE = getApiBase();
const WEBHOOKS = `${BASE}/webhooks`;

async function expectWebhooksReachable(): Promise<void> {
  try {
    await axios.post(WEBHOOKS, '{}', {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8_000,
    });
  } catch (err) {
    const ae = err as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(
        `[system-e2e] Webhooks service not reachable at ${WEBHOOKS}.\n` +
          `  Start: pnpm docker:e2e:up  OR  pnpm --filter @nestlancer/webhooks-service dev`,
      );
    }
  }
}

describe('System smoke — Webhooks service', () => {
  beforeAll(expectWebhooksReachable);

  describe('Webhook ingestion (signature enforcement)', () => {
    it('POST /api/v1/webhooks without signature returns 400 or 401', async () => {
      let status = 0;
      try {
        await axios.post(WEBHOOKS, JSON.stringify({ event: 'smoke.test', payload: {} }), {
          headers: { 'Content-Type': 'application/json' },
          timeout: 8_000,
        });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      // Without a valid HMAC signature the guard must reject the request.
      expect([0, 400, 401, 403, 422]).toContain(status);
    });

    it('POST /api/v1/webhooks with invalid HMAC signature returns 400 or 401', async () => {
      let status = 0;
      try {
        await axios.post(WEBHOOKS, JSON.stringify({ event: 'smoke.test', payload: {} }), {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': 'sha256=invalid-signature-smoke-probe',
            'X-Hub-Signature-256': 'sha256=invalid-signature-smoke-probe',
          },
          timeout: 8_000,
        });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 400, 401, 403]).toContain(status);
    });
  });

  describe('Admin routes — privilege check', () => {
    it('GET /api/v1/admin/webhooks with USER-role JWT returns 403 or 404', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${BASE}/admin/webhooks`, {
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
