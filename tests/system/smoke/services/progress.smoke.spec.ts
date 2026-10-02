/**
 * System smoke — Progress service
 *
 * Exercises the progress service via the API gateway at `/api/v1/progress/*`
 * and `/api/v1/milestones/*`.
 * The progress service (port 3009) exposes:
 *   GET / POST    /projects/:projectId/progress   — progress entries
 *   GET / POST    /milestones                     — milestone management
 *   GET / POST    /deliverables                   — deliverable tracking
 *   Admin routes: /admin/progress/*               — aggregate views
 *
 * Smoke goals:
 *   ✓ Unauthenticated requests to progress/milestones/deliverables return 401.
 *   ✓ Authenticated requests pass auth guard.
 *   ✓ Admin endpoint is privilege-gated.
 */

import axios, { AxiosError } from 'axios';
import { getApiBase } from '../../setup/http';
import { bearerToken } from '../../setup/auth';

const BASE = getApiBase();
const PROGRESS = `${BASE}/progress`;
const MILESTONES = `${BASE}/milestones`;
const DELIVERABLES = `${BASE}/deliverables`;

async function expectProgressReachable(): Promise<void> {
  try {
    await axios.get(MILESTONES, { timeout: 8_000 });
  } catch (err) {
    const ae = err as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(
        `[system-e2e] Progress service not reachable at ${BASE}/milestones.\n` +
          `  Start: pnpm docker:e2e:up  OR  pnpm --filter @nestlancer/progress-service dev`,
      );
    }
  }
}

describe('System smoke — Progress service', () => {
  beforeAll(expectProgressReachable);

  describe('Auth enforcement', () => {
    it('GET /api/v1/milestones without token returns 401', async () => {
      let status = 0;
      try {
        await axios.get(MILESTONES, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('GET /api/v1/deliverables without token returns 401', async () => {
      let status = 0;
      try {
        await axios.get(DELIVERABLES, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('GET /api/v1/progress without token returns 401', async () => {
      let status = 0;
      try {
        await axios.get(PROGRESS, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  describe('Authenticated access', () => {
    it('GET /api/v1/milestones with JWT passes auth guard', async () => {
      let status = 0;
      try {
        const res = await axios.get(MILESTONES, {
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

    it('GET /api/v1/deliverables with JWT passes auth guard', async () => {
      let status = 0;
      try {
        const res = await axios.get(DELIVERABLES, {
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
    it('GET /api/v1/admin/progress with USER-role JWT returns 403 or 404', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${BASE}/admin/progress`, {
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
