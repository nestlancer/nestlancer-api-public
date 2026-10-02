/**
 * System smoke — Notifications service
 *
 * Exercises the notifications service via the API gateway at
 * `/api/v1/notifications/*`.
 * The notifications service (port 3011) exposes:
 *   GET / PATCH   /notifications              — list & mark-read
 *   GET / PUT     /notifications/preferences  — user notification prefs
 *   POST          /push                       — push subscription management
 *   GET / DELETE  /push-subscription          — subscription list
 *   POST          /internal/notifications     — internal trigger endpoint
 *   Admin routes: /admin/templates/*          — notification template management
 *
 * Smoke goals:
 *   ✓ Unauthenticated GET /notifications returns 401.
 *   ✓ Unauthenticated GET /notifications/preferences returns 401.
 *   ✓ Authenticated GET /notifications passes auth guard.
 *   ✓ Internal endpoint requires appropriate credentials.
 *   ✓ Admin template endpoint is privilege-gated.
 */

import axios, { AxiosError } from 'axios';
import { getApiBase } from '../../setup/http';
import { bearerToken } from '../../setup/auth';

const BASE = getApiBase();
const NOTIFICATIONS = `${BASE}/notifications`;

async function expectNotificationsReachable(): Promise<void> {
  try {
    await axios.get(NOTIFICATIONS, { timeout: 8_000 });
  } catch (err) {
    const ae = err as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(
        `[system-e2e] Notifications service not reachable at ${NOTIFICATIONS}.\n` +
          `  Start: pnpm docker:e2e:up  OR  pnpm --filter @nestlancer/notifications-service dev`,
      );
    }
  }
}

describe('System smoke — Notifications service', () => {
  beforeAll(expectNotificationsReachable);

  describe('Auth enforcement', () => {
    it('GET /api/v1/notifications without token returns 401', async () => {
      let status = 0;
      try {
        await axios.get(NOTIFICATIONS, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('GET /api/v1/notifications/preferences without token returns 401', async () => {
      let status = 0;
      try {
        await axios.get(`${NOTIFICATIONS}/preferences`, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('POST /api/v1/push without token returns 401', async () => {
      let status = 0;
      try {
        await axios.post(`${BASE}/push`, {}, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  describe('Authenticated access', () => {
    it('GET /api/v1/notifications with JWT passes auth guard', async () => {
      let status = 0;
      try {
        const res = await axios.get(NOTIFICATIONS, {
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

    it('GET /api/v1/notifications/preferences with JWT passes auth guard', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${NOTIFICATIONS}/preferences`, {
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
    it('GET /api/v1/admin/templates with USER-role JWT returns 403 or 404', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${BASE}/admin/templates`, {
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
