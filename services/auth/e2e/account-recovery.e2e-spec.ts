import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { setupApp, teardownApp, getGlobalPrefix, getApp } from './setup';

const TURNSTILE_TEST_TOKEN = 'test-token';

describe('Auth Service - Account Recovery and Verification (E2E)', () => {
  let app: INestApplication;
  const prefix = getGlobalPrefix();

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('POST /verify-email with invalid token returns 422 business error', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/verify-email`)
      .send({ token: 'invalid-token' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.status).toBe('error');
    expect(res.body.error?.code).toBe('AUTH_004');
  });

  it('POST /resend-verification returns success envelope and emailSent=true', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/resend-verification`)
      .send({ email: 'nonexistent-user-e2e@example.com' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data?.emailSent).toBe(true);
  });

  it('POST /forgot-password with Turnstile token returns success envelope and emailSent=true', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/forgot-password`)
      .send({
        email: 'forgot-password-e2e@example.com',
        turnstileToken: TURNSTILE_TEST_TOKEN,
      })
      .set('Accept', 'application/json');

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data?.emailSent).toBe(true);
  });

  it('POST /reset-password with invalid token returns 422 business error', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/reset-password`)
      .send({
        token: 'invalid-reset-token',
        newPassword: 'Str0ngP@ssw0rd!',
      })
      .set('Accept', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.status).toBe('error');
    expect(res.body.error?.code).toBe('AUTH_013');
  });

  it('POST /verify-2fa with invalid session returns 422 business error', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/verify-2fa`)
      .send({
        authSessionId: 'nonexistent-session-id',
        code: '000000',
        method: 'totp',
      })
      .set('Accept', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.status).toBe('error');
    expect(res.body.error?.code).toBe('AUTH_009');
  });
});
