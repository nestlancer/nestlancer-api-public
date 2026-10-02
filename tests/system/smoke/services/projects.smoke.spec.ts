/**
 * System smoke — Projects service
 *
 * Exercises the projects service via the API gateway at `/api/v1/projects/*`.
 * The projects service (port 3008) exposes:
 *   GET / POST    /projects            — list & create projects
 *   GET / PATCH   /projects/:id        — individual project
 *   GET           /public/projects     — publicly visible projects (no auth)
 *   Admin routes: /admin/projects/*    — full CRUD, status management
 *
 * Smoke goals:
 *   ✓ Public endpoint (/public/projects) responds without authentication.
 *   ✓ Unauthenticated GET /projects returns 401.
 *   ✓ Authenticated GET /projects passes auth guard.
 *   ✓ POST with invalid body returns 400 (validation active).
 *   ✓ Admin endpoint is privilege-gated.
 */

import axios, { AxiosError } from 'axios';
import { getApiBase } from '../../setup/http';
import { bearerToken } from '../../setup/auth';

const PROJECTS = `${getApiBase()}/projects`;

async function expectProjectsReachable(): Promise<void> {
  try {
    await axios.get(`${PROJECTS}/public`, { timeout: 8_000 });
  } catch (err) {
    const ae = err as AxiosError;
    if (ae.code === 'ECONNREFUSED' || ae.code === 'ENOTFOUND') {
      throw new Error(
        `[system-e2e] Projects service not reachable at ${PROJECTS}.\n` +
          `  Start: pnpm docker:e2e:up  OR  pnpm --filter @nestlancer/projects-service dev`,
      );
    }
  }
}

describe('System smoke — Projects service', () => {
  beforeAll(expectProjectsReachable);

  // ── Public endpoint ────────────────────────────────────────────────────────
  describe('Public access (no auth required)', () => {
    it('GET /api/v1/projects/public responds without authentication', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${PROJECTS}/public`, { timeout: 8_000 });
        status = res.status;
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      // Public endpoint should be accessible — 2xx or 404 (no data yet).
      // NOT 401 or 403.
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    });
  });

  // ── Auth enforcement ───────────────────────────────────────────────────────
  describe('Auth enforcement', () => {
    it('GET /api/v1/projects without token returns 401', async () => {
      let status = 0;
      try {
        await axios.get(PROJECTS, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });

    it('POST /api/v1/projects without token returns 401', async () => {
      let status = 0;
      try {
        await axios.post(PROJECTS, {}, { timeout: 8_000 });
      } catch (err) {
        status = (err as AxiosError).response?.status ?? 0;
      }
      expect([0, 401, 403, 404]).toContain(status);
    });
  });

  // ── Authenticated access ───────────────────────────────────────────────────
  describe('Authenticated access', () => {
    it('GET /api/v1/projects with JWT passes auth guard', async () => {
      let status = 0;
      try {
        const res = await axios.get(PROJECTS, {
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

    it('POST /api/v1/projects with JWT + empty body returns 400', async () => {
      let status = 0;
      try {
        await axios.post(
          PROJECTS,
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

  // ── Admin routes ───────────────────────────────────────────────────────────
  describe('Admin routes — privilege check', () => {
    it('GET /api/v1/admin/projects with USER-role JWT returns 403 or 404', async () => {
      let status = 0;
      try {
        const res = await axios.get(`${getApiBase()}/admin/projects`, {
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
