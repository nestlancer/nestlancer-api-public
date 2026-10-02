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

describe('Projects Service - Client & Public APIs (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET /projects/health returns 200 and success envelope', async () => {
      const res = await request(getAppUrl().replace(/\/$/, ''))
        .get(`/${prefix}/projects/health`)
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data?.status).toBe('ok');
      expect(res.body?.data?.service).toBe('projects');
    });
  });

  describe('Auth guards', () => {
    it('GET /projects without token returns 401 error', async () => {
      const res = await request(basePath()).get('/projects').expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /projects/stats without token returns 401 error', async () => {
      const res = await request(basePath()).get('/projects/stats').expect(401);
      expect(res.body?.status).toBe('error');
    });
  });

  describe('Client - list and stats (E2E)', () => {
    const userId = 'projects-e2e-client-1';

    it('GET /projects returns 200 and list (possibly empty) for authenticated user', async () => {
      const res = await request(basePath()).get('/projects').set(authHeader(userId)).expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('GET /projects/stats returns 200 and stats payload for user', async () => {
      const res = await request(basePath())
        .get('/projects/stats')
        .set(authHeader(userId))
        .expect(200);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data).toBeDefined();
      expect(typeof res.body?.data?.total).toBe('number');
      expect(typeof res.body?.data?.active).toBe('number');
      expect(typeof res.body?.data?.completed).toBe('number');
      expect(typeof res.body?.data?.cancelled).toBe('number');
    });
  });

  describe('Client - project details and relations errors (E2E)', () => {
    const userId = 'projects-e2e-client-2';
    const missingProjectId = '00000000-0000-0000-0000-000000000000';

    it('GET /projects/:id for non-existent id returns 422 PROJECT_001 business error', async () => {
      const res = await request(basePath())
        .get(`/projects/${missingProjectId}`)
        .set(authHeader(userId))
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('PROJECT_001');
      expect(typeof res.body?.error?.message).toBe('string');
    });

    it('GET /projects/:id/timeline for non-existent id returns 422 PROJECT_001 business error', async () => {
      const res = await request(basePath())
        .get(`/projects/${missingProjectId}/timeline`)
        .set(authHeader(userId))
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('PROJECT_001');
    });

    it('GET /projects/:id/deliverables for non-existent id returns 422 PROJECT_001 business error', async () => {
      const res = await request(basePath())
        .get(`/projects/${missingProjectId}/deliverables`)
        .set(authHeader(userId))
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('PROJECT_001');
    });

    it('GET /projects/:id/payments for non-existent id returns 422 PROJECT_001 business error', async () => {
      const res = await request(basePath())
        .get(`/projects/${missingProjectId}/payments`)
        .set(authHeader(userId))
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('PROJECT_001');
    });

    it('GET /projects/:id/progress for non-existent id returns 422 PROJECT_001 business error', async () => {
      const res = await request(basePath())
        .get(`/projects/${missingProjectId}/progress`)
        .set(authHeader(userId))
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('PROJECT_001');
    });

    it('GET /projects/:id/milestones for non-existent id returns 422 PROJECT_001 business error', async () => {
      const res = await request(basePath())
        .get(`/projects/${missingProjectId}/milestones`)
        .set(authHeader(userId))
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('PROJECT_001');
    });

    it('GET /projects/:id/messages for non-existent id returns 422 PROJECT_001 business error', async () => {
      const res = await request(basePath())
        .get(`/projects/${missingProjectId}/messages`)
        .set(authHeader(userId))
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('PROJECT_001');
    });

    it('GET /projects/:id/feedback for non-existent id returns 422 PROJECT_001 business error', async () => {
      const res = await request(basePath())
        .get(`/projects/${missingProjectId}/feedback`)
        .set(authHeader(userId))
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('PROJECT_001');
    });
  });

  describe('Client - actions validation and business errors (E2E)', () => {
    const userId = 'projects-e2e-client-3';
    const missingProjectId = '00000000-0000-0000-0000-000000000000';

    it('POST /projects/:id/approve with invalid body returns 400 validation error', async () => {
      const res = await request(basePath())
        .post(`/projects/${missingProjectId}/approve`)
        .set(authHeader(userId))
        .send({})
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('POST /projects/:id/approve with valid body for non-existent project returns 422 PROJECT_001', async () => {
      const res = await request(basePath())
        .post(`/projects/${missingProjectId}/approve`)
        .set(authHeader(userId))
        .send({
          rating: 5,
          feedback: {
            quality: 5,
            communication: 5,
            timeliness: 5,
            professionalism: 5,
            overallSatisfaction: 5,
          },
          comments: 'Great work overall',
        })
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('PROJECT_001');
    });

    it('POST /projects/:id/request-revision with invalid body returns 400 validation error', async () => {
      const res = await request(basePath())
        .post(`/projects/${missingProjectId}/request-revision`)
        .set(authHeader(userId))
        .send({})
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('POST /projects/:id/request-revision with valid body for non-existent project returns 422 PROJECT_001', async () => {
      const res = await request(basePath())
        .post(`/projects/${missingProjectId}/request-revision`)
        .set(authHeader(userId))
        .send({
          area: 'Homepage',
          priority: 'high',
          description: 'Need changes to homepage copy',
          details: ['Update hero section content for clarity.'],
        })
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('PROJECT_001');
    });

    it('POST /projects/:id/messages without content returns 400 validation error', async () => {
      const res = await request(basePath())
        .post(`/projects/${missingProjectId}/messages`)
        .set(authHeader(userId))
        .send({})
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('POST /projects/:id/messages with content for non-existent project returns 422 PROJECT_001', async () => {
      const res = await request(basePath())
        .post(`/projects/${missingProjectId}/messages`)
        .set(authHeader(userId))
        .send({
          content: 'E2E test project message',
        })
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('PROJECT_001');
    });

    it('POST /projects/:id/feedback without title/feedback returns 400 validation error', async () => {
      const res = await request(basePath())
        .post(`/projects/${missingProjectId}/feedback`)
        .set(authHeader(userId))
        .send({})
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('POST /projects/:id/feedback with valid body for non-existent project returns 422 PROJECT_001', async () => {
      const res = await request(basePath())
        .post(`/projects/${missingProjectId}/feedback`)
        .set(authHeader(userId))
        .send({
          title: 'Feedback from E2E test',
          feedback: 'Overall experience was positive.',
        })
        .expect(422);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('PROJECT_001');
    });
  });

  describe('Public projects', () => {
    it('GET /public returns 200 and list (possibly empty)', async () => {
      const res = await request(basePath()).get('/public').expect(200);

      expect(res.body?.status).toBe('success');
      const data = res.body?.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('GET /public/:id for non-existent id returns 422 NOT_FOUND style business error', async () => {
      const res = await request(basePath()).get('/public/non-existent-slug').expect(422);

      expect(res.body?.status).toBe('error');
      expect(typeof res.body?.error?.message).toBe('string');
    });
  });
});
