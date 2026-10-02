import request from 'supertest';
import { createTestJwt } from '../../../libs/testing/src/helpers/test-auth.helper';
import {
  setupApp,
  teardownApp,
  getApp,
  getGlobalPrefix,
  E2E_USER_ID,
  E2E_PROJECT_ID,
} from './setup';

const prefix = getGlobalPrefix();

function basePath() {
  return getApp().getHttpServer();
}

function authHeader(userId: string, role = 'USER') {
  const token = createTestJwt(
    { sub: userId, email: `${userId}@test.com`, role },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

describe('Payments Service - Payment Intent (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('GET /payments/health without token returns 401', async () => {
      const res = await request(basePath()).get(`/${prefix}/payments/health`).expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('GET /payments/health with valid token returns 200 and status ok', async () => {
      const res = await request(basePath())
        .get(`/${prefix}/payments/health`)
        .set(authHeader(E2E_USER_ID))
        .expect(200);
      expect(res.body?.status).toBe('success');
      expect(res.body?.data).toBeDefined();
      expect(res.body?.data?.status).toBe('ok');
      expect(res.body?.data?.service).toBe('payments');
    });
  });

  describe('POST /payments/create-intent', () => {
    it('returns 401 when no token is sent', async () => {
      const res = await request(basePath())
        .post(`/${prefix}/payments/create-intent`)
        .send({
          projectId: E2E_PROJECT_ID,
          amount: 1000,
        })
        .expect(401);
      expect(res.body?.status).toBe('error');
    });

    it('returns 400 and validation error when body is invalid (missing projectId)', async () => {
      const res = await request(basePath())
        .post(`/${prefix}/payments/create-intent`)
        .set(authHeader(E2E_USER_ID))
        .send({ amount: 1000 })
        .expect(400);
      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when projectId is not a valid UUID', async () => {
      const res = await request(basePath())
        .post(`/${prefix}/payments/create-intent`)
        .set(authHeader(E2E_USER_ID))
        .send({ projectId: 'not-a-uuid', amount: 1000 })
        .expect(400);
      expect(res.body?.status).toBe('error');
    });

    it('returns 201 and body with id, projectId, amount, clientSecret when payload is valid and user/project exist', async () => {
      const res = await request(basePath())
        .post(`/${prefix}/payments/create-intent`)
        .set(authHeader(E2E_USER_ID))
        .send({
          projectId: E2E_PROJECT_ID,
          amount: 5000,
          currency: 'INR',
        })
        .expect(201);

      expect(res.body?.status).toBe('success');
      expect(res.body?.data).toBeDefined();
      expect(res.body?.data?.id).toBeDefined();
      expect(res.body?.data?.projectId).toBe(E2E_PROJECT_ID);
      expect(res.body?.data?.amount).toBe(5000);
      expect(res.body?.data?.currency).toBe('INR');
      expect(res.body?.data?.clientSecret).toBeDefined();
      expect(res.body?.data?.status).toBeDefined();
    });
  });
});
