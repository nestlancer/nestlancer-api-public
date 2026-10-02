import request from 'supertest';
import { createTestJwt } from '../../../libs/testing/src/helpers/test-auth.helper';
import { setupApp, teardownApp, getAppUrl, getGlobalPrefix } from './setup';

const prefix = getGlobalPrefix();

function authHeader(userId: string, role = 'USER') {
  const token = createTestJwt(
    { sub: userId, email: `${userId}@test.com`, role },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

function adminAuthHeader() {
  return authHeader('projects-e2e-admin-1', 'ADMIN');
}

function basePath() {
  return `${getAppUrl()}/${prefix}`;
}

describe('Projects Service - Admin APIs (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Auth guards', () => {
    it('GET /admin/projects without token returns 401 error', async () => {
      const res = await request(basePath()).get('/admin/projects').expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /admin/projects with USER role returns 403 error', async () => {
      const res = await request(basePath())
        .get('/admin/projects')
        .set(authHeader('normal-user', 'USER'))
        .expect(403);
      expect(res.body?.status).toBe('error');
    });
  });

  describe('Admin - list and stats (E2E)', () => {
    it('GET /admin/projects with admin token returns 200 and list (possibly empty)', async () => {
      const res = await request(basePath())
        .get('/admin/projects')
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      const payload = res.body?.data ?? res.body;
      const list = Array.isArray(payload) ? payload : payload?.data;
      expect(Array.isArray(list)).toBe(true);
    });

    it('GET /admin/projects/stats returns 200 and stats payload', async () => {
      const res = await request(basePath())
        .get('/admin/projects/stats')
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data).toBeDefined();
      expect(typeof res.body?.data?.total).toBe('number');
      expect(typeof res.body?.data?.active).toBe('number');
      expect(typeof res.body?.data?.completed).toBe('number');
    });
  });

  describe('Admin - project actions validation and errors (E2E)', () => {
    const missingProjectId = '00000000-0000-0000-0000-000000000000';

    it('GET /admin/projects/:id for non-existent id returns 404 PROJECT_001', async () => {
      const res = await request(basePath())
        .get(`/admin/projects/${missingProjectId}`)
        .set(adminAuthHeader())
        .expect(404);

      expect(res.body?.status).toBe('error');
      expect(['PROJECT_001', 'HTTP_404']).toContain(res.body?.error?.code);
    });

    it('PATCH /admin/projects/:id/status with invalid body returns 400 validation error', async () => {
      const res = await request(basePath())
        .patch(`/admin/projects/${missingProjectId}/status`)
        .set(adminAuthHeader())
        .send({})
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH /admin/projects/:id with empty body returns 400 validation error', async () => {
      const res = await request(basePath())
        .patch(`/admin/projects/${missingProjectId}`)
        .set(adminAuthHeader())
        .send({})
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('POST /admin/projects with missing required fields returns 400 validation error', async () => {
      const res = await request(basePath())
        .post('/admin/projects')
        .set(adminAuthHeader())
        .send({})
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('POST /admin/projects/:id/team without memberId returns 400 validation error', async () => {
      const res = await request(basePath())
        .post(`/admin/projects/${missingProjectId}/team`)
        .set(adminAuthHeader())
        .send({})
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('GET /admin/projects/:id/analytics for non-existent project returns 200 with zeroed analytics', async () => {
      const res = await request(basePath())
        .get(`/admin/projects/${missingProjectId}/analytics`)
        .set(adminAuthHeader())
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.projectId).toBe(missingProjectId);
      expect(typeof res.body?.data?.progress).toBe('number');
    });

    it('POST /admin/projects/:id/milestones with invalid body returns 400 validation error', async () => {
      const res = await request(basePath())
        .post(`/admin/projects/${missingProjectId}/milestones`)
        .set(adminAuthHeader())
        .send({})
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('POST /admin/projects/:id/extend with invalid body returns 400 validation error', async () => {
      const res = await request(basePath())
        .post(`/admin/projects/${missingProjectId}/extend`)
        .set(adminAuthHeader())
        .send({})
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('POST /admin/projects/:id/archive for non-existent project returns PROJECT_001 error', async () => {
      const res = await request(basePath())
        .post(`/admin/projects/${missingProjectId}/archive`)
        .set(adminAuthHeader())
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('PROJECT_001');
    });

    it('DELETE /admin/projects/:id for non-existent project returns 500 INTERNAL_ERROR', async () => {
      const res = await request(basePath())
        .delete(`/admin/projects/${missingProjectId}`)
        .set(adminAuthHeader())
        .expect(500);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Admin - idempotent utility actions (E2E)', () => {
    const anyProjectId = '00000000-0000-0000-0000-000000000000';

    it('POST /admin/projects/:id/unarchive for non-existent project returns PROJECT_001 error', async () => {
      const res = await request(basePath())
        .post(`/admin/projects/${anyProjectId}/unarchive`)
        .set(adminAuthHeader())
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('PROJECT_001');
    });

    it('POST /admin/projects/:id/duplicate returns 410 Gone (deprecated)', async () => {
      const res = await request(basePath())
        .post(`/admin/projects/${anyProjectId}/duplicate`)
        .set(adminAuthHeader())
        .expect(410);

      expect(res.body?.status).toBe('error');
    });

    it('GET /admin/projects/:id/duplicate-preview for non-existent project returns 404', async () => {
      const res = await request(basePath())
        .get(`/admin/projects/${anyProjectId}/duplicate-preview`)
        .set(adminAuthHeader())
        .expect(404);

      expect(res.body?.status).toBe('error');
    });

    it('POST /admin/projects/from-template with empty body returns 400 validation error', async () => {
      const res = await request(basePath())
        .post('/admin/projects/from-template')
        .set(adminAuthHeader())
        .send({})
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('POST /admin/projects/:id/export returns 404 for non-existent project', async () => {
      const res = await request(basePath())
        .post(`/admin/projects/${anyProjectId}/export`)
        .set(adminAuthHeader())
        .expect(404);

      expect(res.body?.status).toBe('error');
    });
  });
});
