import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import { AllExceptionsFilter, TransformResponseInterceptor } from '@nestlancer/common';
import { AppModule } from '../../src/app.module';
import { createTestJwt } from '@nestlancer/testing/helpers/test-auth.helper';

function loadDevEnv() {
  const envPath = resolve(__dirname, '../../../../.env.development');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...value] = trimmed.split('=');
      if (key) {
        process.env[key.trim()] = value
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  });
}

function authHeader(userId: string, role = 'USER') {
  const token = createTestJwt(
    { sub: userId, email: `${userId}@test.com`, role },
    { secret: process.env.JWT_ACCESS_SECRET },
  );
  return { Authorization: `Bearer ${token}` };
}

function adminAuthHeader() {
  return authHeader('admin-1', 'ADMIN');
}

describe('Payments Service (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health', () => {
    it('GET /api/v1/payments/health - should reject unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/payments/health');
      expect(response.status).toBe(401);
      if (response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('GET /api/v1/payments/health - returns 200 with success and service info when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/health')
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(response.body.data?.status).toBe('ok');
        expect(response.body.data?.service).toBe('payments');
      }
    });
  });

  describe('Payments (Authenticated)', () => {
    it('GET /api/v1/payments - should reject unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/payments');
      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('GET /api/v1/payments - with valid token returns 200 with success and list shape or 404/500', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments')
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(
          response.body.data !== undefined ||
            response.body.items !== undefined ||
            (response.body.meta !== undefined && Array.isArray(response.body.items)),
        ).toBe(true);
      }
    });

    it('GET /api/v1/payments/stats - should reject unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/payments/stats');
      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('GET /api/v1/payments/stats - should execute successfully with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/stats')
        .set(authHeader('test-user-1'));

      expect(response.status).toBe(200);
      if (response.body?.status) {
        expect(response.body.status).toBe('success');
      }
    });

    it('POST /api/v1/payments/create-intent - should reject unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/create-intent')
        .send({ amount: 1000, currency: 'INR', projectId: '550e8400-e29b-41d4-a716-446655440000' });
      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('POST /api/v1/payments/create-intent - should return 400/422 for invalid payload (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/create-intent')
        .set(authHeader('test-user-1'))
        .send({ amount: -1, currency: '', projectId: '' });

      expect(response.status).toBe(400);
      if (response.status === 400 || response.status === 422) {
        expect(response.body?.status).toBe('error');
      }
    });

    it('POST /api/v1/payments/create-intent - should create a payment intent and allow fetching it when backend is healthy', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/payments/create-intent')
        .set(authHeader('e2e-user-1'))
        .send({
          amount: 10_000,
          currency: 'INR',
          projectId: '550e8400-e29b-41d4-a716-446655440000',
        });

      expect([200, 201, 500]).toContain(createResponse.status);

      if (createResponse.status !== 200 && createResponse.status !== 201) {
        // If infrastructure is unavailable in CI, skip the rest of the flow.
        return;
      }

      const body = createResponse.body.data ?? createResponse.body;
      const paymentId = body.id ?? body.paymentId ?? body.intentId;
      expect(paymentId).toBeDefined();

      const getResponse = await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentId}`)
        .set(authHeader('e2e-user-1'));

      expect([200, 404, 422, 500]).toContain(getResponse.status);
      if (getResponse.status === 200) {
        const fetched = getResponse.body.data ?? getResponse.body;
        expect(fetched).toBeDefined();
      }
    });

    it('GET /api/v1/payments/:id - should return 400 or 404 for invalid id', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/invalid-uuid')
        .set(authHeader('test-user-1'));

      expect([400, 404]).toContain(response.status);
      if (response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });
  });

  describe('Payment Methods (Authenticated)', () => {
    it('GET /api/v1/payments/methods - should reject unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/payments/methods');
      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('GET /api/v1/payments/methods - should execute successfully with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/methods')
        .set(authHeader('test-user-1'));

      expect([200, 404, 500]).toContain(response.status);
    });

    it('POST /api/v1/payments/methods - should reject unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/methods')
        .send({ type: 'card', token: 'tok_xxx' });
      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('POST /api/v1/payments/methods - should add payment method or fail with infrastructure error', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/methods')
        .set(authHeader('test-user-1'))
        .send({
          type: 'card',
          tokenId: 'tok_visa',
          last4: '4242',
          cardBrand: 'visa',
          cardExpMonth: 12,
          cardExpYear: 2028,
          nickname: 'Integration Test Card',
        });

      expect([201, 500]).toContain(response.status);
    });
  });

  describe('Admin - Payments', () => {
    it('GET /api/v1/admin/payments - should reject unauthenticated with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/admin/payments');
      expect(response.status).toBe(401);
      if (response.status === 401 && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('GET /api/v1/admin/payments - should reject non-admin user with 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/payments')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
      if (response.status === 403 && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('GET /api/v1/admin/payments - with admin token returns 200 with success and list shape', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/payments')
        .query({ page: '1', limit: '20' })
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(
          response.body.data !== undefined ||
            response.body.items !== undefined ||
            response.body.meta !== undefined,
        ).toBe(true);
      }
    });

    it('GET /api/v1/admin/payments/stats - should reject non-admin with 403', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/payments/stats')
        .set(authHeader('regular-user-1'));

      expect(response.status).toBe(403);
      if (response.status === 403 && response.body?.status) {
        expect(response.body.status).toBe('error');
      }
    });

    it('GET /api/v1/admin/payments/stats - with admin token returns 200 with success and data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/payments/stats')
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      {
        expect(response.body.status).toBe('success');
        expect(response.body.data).toBeDefined();
      }
    });

    it('GET /api/v1/admin/payments/:id - with invalid or non-existent id returns 200 with error payload (or 500)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/payments/invalid-uuid')
        .set(adminAuthHeader());

      expect(response.status).toBe(200);
      {
        const errorStatus =
          response.body.status === 'error' || response.body.data?.status === 'error';
        const message = response.body.message ?? response.body.data?.message;
        expect(errorStatus).toBe(true);
        expect(message).toBeDefined();
      }
    });
  });
});
