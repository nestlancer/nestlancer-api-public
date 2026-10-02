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

function basePath() {
  return `${getAppUrl()}/${prefix}`;
}

describe('Progress Service - Core Endpoints (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Routing & auth (smoke)', () => {
    const projectId = 'progress-e2e-project-smoke-1';

    it('GET /projects/:projectId/progress without token returns 401 error', async () => {
      const res = await request(basePath()).get(`/projects/${projectId}/progress`).expect(401);

      expect(res.body?.status).toBe('error');
    });

    it('GET /milestones (non-existent route) returns 404', async () => {
      const res = await request(basePath()).get('/milestones').expect(404);
      expect(res.body?.status).toBe('error');
    });
  });

  describe('Progress timeline & status (E2E)', () => {
    const userId = 'progress-e2e-client-1';
    const projectId = 'progress-e2e-project-1';

    it('GET /projects/:projectId/progress returns 200 and paginated timeline structure', async () => {
      const res = await request(basePath())
        .get(`/projects/${projectId}/progress`)
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.items)).toBe(true);
      expect(res.body?.meta).toBeDefined();
      expect(typeof res.body?.meta?.total).toBe('number');
      expect(typeof res.body?.meta?.page).toBe('number');
      expect(typeof res.body?.meta?.limit).toBe('number');
      expect(typeof res.body?.meta?.totalPages).toBe('number');
    });

    it('GET /projects/:projectId/progress/status returns 200 and summary payload', async () => {
      const res = await request(basePath())
        .get(`/projects/${projectId}/progress/status`)
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data).toBeDefined();
      expect(typeof res.body?.data?.percentageComplete).toBe('number');
      expect(typeof res.body?.data?.currentPhase).toBe('string');
    });

    it('GET /projects/:projectId/progress/milestones returns 200 and milestone summary payload', async () => {
      const res = await request(basePath())
        .get(`/projects/${projectId}/progress/milestones`)
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data).toBeDefined();
      expect(res.body?.data?.projectId).toBe(projectId);
      expect(Array.isArray(res.body?.data?.milestones)).toBe(true);
    });
  });

  describe('Progress entries - details and validation (E2E)', () => {
    const userId = 'progress-e2e-client-2';
    const projectId = 'progress-e2e-project-2';
    const missingEntryId = '00000000-0000-0000-0000-000000000000';

    it('GET /projects/:projectId/progress/:entryId for non-existent entry returns 404 error', async () => {
      const res = await request(basePath())
        .get(`/projects/${projectId}/progress/${missingEntryId}`)
        .set(authHeader(userId))
        .expect(404);

      expect(res.body?.status).toBe('error');
      expect(typeof res.body?.error?.message).toBe('string');
    });

    it('POST /projects/:projectId/progress with invalid body returns 403 (admin-only route)', async () => {
      const res = await request(basePath())
        .post(`/projects/${projectId}/progress`)
        .set(authHeader(userId))
        .send({})
        .expect(403);

      expect(res.body?.status).toBe('error');
    });
  });

  describe('Request changes validation and behavior (E2E)', () => {
    const userId = 'progress-e2e-client-3';
    const projectId = 'progress-e2e-project-3';

    it('POST /projects/:projectId/progress/request-changes with invalid body returns 400 validation error', async () => {
      const res = await request(basePath())
        .post(`/projects/${projectId}/progress/request-changes`)
        .set(authHeader(userId))
        .send({})
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('POST /projects/:projectId/progress/request-changes with valid body returns 201 and request payload', async () => {
      const payload = {
        reason: 'Need revisions to align with updated brand guidelines',
        details: [
          {
            description: 'Update hero section copy to new messaging',
          },
        ],
      };

      const res = await request(basePath())
        .post(`/projects/${projectId}/progress/request-changes`)
        .set(authHeader(userId))
        .send(payload)
        .expect(201);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data).toBeDefined();
      expect(res.body?.data?.projectId).toBe(projectId);
      expect(typeof res.body?.data?.requestId).toBe('string');
      expect(res.body?.data?.reason).toBe(payload.reason);
    });
  });

  describe('Milestone and deliverable approvals - auth & admin guards (E2E)', () => {
    const userId = 'progress-e2e-client-4';
    const projectId = 'progress-e2e-project-4';
    const milestoneId = '00000000-0000-0000-0000-000000000001';
    const deliverableId = '00000000-0000-0000-0000-000000000002';

    it('POST /milestones/:id/approve without token returns 401', async () => {
      const res = await request(basePath()).post(`/milestones/${milestoneId}/approve`).expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('POST /milestones/:id/request-revision with invalid body returns 400 validation error', async () => {
      const res = await request(basePath())
        .post(`/milestones/${milestoneId}/request-revision`)
        .set(authHeader(userId))
        .send({})
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('POST /deliverables/:id/approve without token returns 401', async () => {
      const res = await request(basePath())
        .post(`/deliverables/${deliverableId}/approve`)
        .expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('POST /deliverables/:id/reject without token returns 401', async () => {
      const res = await request(basePath())
        .post(`/deliverables/${deliverableId}/reject`)
        .expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('POST /admin/projects/:projectId/milestones without token returns 401', async () => {
      const res = await request(basePath())
        .post(`/admin/projects/${projectId}/milestones`)
        .send({})
        .expect(401);

      expect(res.body?.status).toBe('error');
    });

    it('POST /admin/projects/:projectId/milestones with non-admin role returns 403', async () => {
      const res = await request(basePath())
        .post(`/admin/projects/${projectId}/milestones`)
        .set(authHeader(userId, 'USER'))
        .send({
          name: 'E2E Milestone',
          description: 'Milestone from E2E test',
          dueDate: new Date().toISOString(),
        })
        .expect(403);

      expect(res.body?.status).toBe('error');
    });
  });

  describe('Admin progress management (E2E)', () => {
    const adminId = 'progress-e2e-admin-1';
    const projectId = 'progress-e2e-project-admin-1';

    it('GET /admin/progress/projects/:projectId returns 200 with items and meta', async () => {
      const res = await request(basePath())
        .get(`/admin/progress/projects/${projectId}`)
        .set(authHeader(adminId, 'ADMIN'))
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.items)).toBe(true);
      expect(res.body?.meta).toBeDefined();
      expect(typeof res.body?.meta?.total).toBe('number');
    });

    it('GET /admin/progress/projects/:projectId/analytics returns 200 and analytics payload', async () => {
      const res = await request(basePath())
        .get(`/admin/progress/projects/${projectId}/analytics`)
        .set(authHeader(adminId, 'ADMIN'))
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.projectId).toBe(projectId);
      expect(res.body?.analytics).toBeDefined();
      expect(Array.isArray(res.body?.analytics?.byType)).toBe(true);
      expect(Array.isArray(res.body?.analytics?.byMilestone)).toBe(true);
      expect(typeof res.body?.analytics?.totalCount).toBe('number');
    });

    it('GET /admin/progress/projects/:projectId/timeline returns 200 and timeline array', async () => {
      const res = await request(basePath())
        .get(`/admin/progress/projects/${projectId}/timeline`)
        .set(authHeader(adminId, 'ADMIN'))
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.projectId).toBe(projectId);
      expect(Array.isArray(res.body?.timeline)).toBe(true);
    });

    it('PATCH /admin/progress/projects/:projectId/status returns 200 and updated status payload', async () => {
      const body = { status: 'ON_HOLD' };

      const res = await request(basePath())
        .patch(`/admin/progress/projects/${projectId}/status`)
        .set(authHeader(adminId, 'ADMIN'))
        .send(body)
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.projectId).toBe(projectId);
      expect(res.body?.data?.newStatus).toBe(body.status);
    });

    it('POST /admin/progress/projects/:projectId/complete rejects a non-review project', async () => {
      const res = await request(basePath())
        .post(`/admin/progress/projects/${projectId}/complete`)
        .set(authHeader(adminId, 'ADMIN'))
        .send({})
        .expect(400);

      expect(res.body?.status).toBe('error');
    });
  });

  describe('Admin milestones and deliverables error paths (E2E)', () => {
    const adminId = 'progress-e2e-admin-2';
    const projectId = 'progress-e2e-project-admin-2';
    const missingMilestoneId = '00000000-0000-0000-0000-000000000010';
    const missingDeliverableId = '00000000-0000-0000-0000-000000000020';

    it('GET /admin/projects/:projectId/deliverables returns 200 and an array (possibly empty)', async () => {
      const res = await request(basePath())
        .get(`/admin/projects/${projectId}/deliverables`)
        .set(authHeader(adminId, 'ADMIN'))
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(Array.isArray(res.body?.data)).toBe(true);
    });

    it('PATCH /admin/milestones/:id for non-existent milestone returns 404 error', async () => {
      const res = await request(basePath())
        .patch(`/admin/milestones/${missingMilestoneId}`)
        .set(authHeader(adminId, 'ADMIN'))
        .send({ name: 'Updated from E2E' })
        .expect(404);

      expect(res.body?.status).toBe('error');
      expect(typeof res.body?.error?.message).toBe('string');
    });

    it('POST /admin/milestones/:id/complete for non-existent milestone returns 404 error', async () => {
      const res = await request(basePath())
        .post(`/admin/milestones/${missingMilestoneId}/complete`)
        .set(authHeader(adminId, 'ADMIN'))
        .send({})
        .expect(404);

      expect(res.body?.status).toBe('error');
      expect(typeof res.body?.error?.message).toBe('string');
    });

    it('PATCH /admin/deliverables/:id for non-existent deliverable returns 404 error', async () => {
      const res = await request(basePath())
        .patch(`/admin/deliverables/${missingDeliverableId}`)
        .set(authHeader(adminId, 'ADMIN'))
        .send({ description: 'Updated from E2E' })
        .expect(404);

      expect(res.body?.status).toBe('error');
      expect(typeof res.body?.error?.message).toBe('string');
    });

    it('DELETE /admin/deliverables/:id for non-existent deliverable returns 404 error', async () => {
      const res = await request(basePath())
        .delete(`/admin/deliverables/${missingDeliverableId}`)
        .set(authHeader(adminId, 'ADMIN'))
        .expect(404);

      expect(res.body?.status).toBe('error');
      expect(typeof res.body?.error?.message).toBe('string');
    });
  });
});
