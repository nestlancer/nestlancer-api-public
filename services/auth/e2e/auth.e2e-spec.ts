import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { setupApp, teardownApp, getGlobalPrefix, getApp } from './setup';

describe('Auth Service - Health (smoke, E2E)', () => {
  let app: INestApplication;
  const prefix = getGlobalPrefix();

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('GET /health returns 200 and auth status ok', async () => {
    const res = await request(getApp().getHttpServer())
      .get(`/${prefix}/health`)
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data?.status).toBe('ok');
    expect(res.body.data?.service).toBe('auth');
  });
});

describe('Auth Service - Login (E2E)', () => {
  let app: INestApplication;
  const prefix = getGlobalPrefix();

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('POST /login with invalid credentials returns 422 business error', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/login`)
      .send({
        email: 'nonexistent@example.com',
        password: 'WrongP@ss123',
      })
      .set('User-Agent', 'E2ETest/1.0')
      .set('Accept', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.status).toBe('error');
    expect(res.body.error?.code).toBeDefined();
    expect(res.body.error?.message).toMatch(/invalid email or password/i);
  });

  it('POST /login with invalid payload returns 400 validation error', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/login`)
      .send({
        email: 'not-an-email',
        password: '',
      })
      .set('User-Agent', 'E2ETest/1.0')
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });
});
