import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { setupApp, teardownApp, getGlobalPrefix, getApp } from './setup';

const TURNSTILE_TEST_TOKEN = 'test-token';
const uniqueEmail = () =>
  `e2e-check-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

describe('Auth Service - Check Email (E2E)', () => {
  let app: INestApplication;
  const prefix = getGlobalPrefix();

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('GET /check-email without email returns 400 validation error', async () => {
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/check-email`)
      .query({ turnstileToken: TURNSTILE_TEST_TOKEN })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('GET /check-email with a new email returns 200 and valid=true', async () => {
    const email = uniqueEmail();
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/check-email`)
      .query({
        email,
        turnstileToken: TURNSTILE_TEST_TOKEN,
      })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data?.valid).toBe(true);
  });

  it('GET /check-email without Turnstile token returns 422 guard error', async () => {
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/check-email`)
      .query({
        email: uniqueEmail(),
      })
      .set('Accept', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.status).toBe('error');
    expect(res.body.error?.code).toBe('AUTH_011');
  });
});
