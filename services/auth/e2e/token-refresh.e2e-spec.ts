import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { setupApp, teardownApp, getGlobalPrefix, getApp } from './setup';

describe('Auth Service - Token Refresh (E2E)', () => {
  let app: INestApplication;
  const prefix = getGlobalPrefix();

  beforeAll(async () => {
    app = await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  it('POST /refresh with invalid token returns 422 business error', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/refresh`)
      .send({ refreshToken: 'invalid-token' })
      .set('User-Agent', 'E2ETest/1.0')
      .set('Accept', 'application/json');

    expect(res.status).toBe(422);
    expect(res.body.status).toBe('error');
    expect(res.body.error?.message).toBeDefined();
  });

  it('POST /refresh with empty token returns 400 validation error', async () => {
    const res = await request(getApp().getHttpServer())
      .post(`/${prefix}/refresh`)
      .send({ refreshToken: '' })
      .set('User-Agent', 'E2ETest/1.0')
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });
});
