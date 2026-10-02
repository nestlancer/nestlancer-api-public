import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { setupApp, teardownApp, getGlobalPrefix, getApp } from './setup';

const TURNSTILE_TEST_TOKEN = 'test-token';
const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

describe('Auth Service - Registration (E2E)', () => {
  let app: INestApplication;
  const prefix = getGlobalPrefix();
  let registeredEmail: string;

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('POST /register with valid data returns 201 and userId', async () => {
    registeredEmail = uniqueEmail();
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/register`)
      .send({
        email: registeredEmail,
        password: 'StrongP@ssw0rd!',
        firstName: 'Jane',
        lastName: 'Doe',
        acceptTerms: true,
        turnstileToken: TURNSTILE_TEST_TOKEN,
      })
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data?.userId).toBeDefined();
    expect(res.body.data?.email).toBe(registeredEmail);
    expect(res.body.data?.emailVerificationSent).toBe(true);
  });

  it('POST /register with duplicate email returns 409 conflict', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/register`)
      .send({
        email: registeredEmail,
        password: 'AnotherP@ss1!',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true,
        turnstileToken: TURNSTILE_TEST_TOKEN,
      })
      .set('Accept', 'application/json');

    expect(res.status).toBe(409);
    expect(res.body.status).toBe('error');
  });

  it('POST /register with weak password returns 400 validation error', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/register`)
      .send({
        email: uniqueEmail(),
        password: '123',
        firstName: 'Weak',
        lastName: 'Password',
        acceptTerms: true,
        turnstileToken: TURNSTILE_TEST_TOKEN,
      })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('POST /register without Turnstile token returns 422 guard error', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/register`)
      .send({
        email: uniqueEmail(),
        password: 'StrongP@ssw0rd!',
        firstName: 'Jane',
        lastName: 'Doe',
        acceptTerms: true,
      })
      .set('Accept', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.status).toBe('error');
    expect(res.body.error?.code).toBe('AUTH_011');
  });
});
