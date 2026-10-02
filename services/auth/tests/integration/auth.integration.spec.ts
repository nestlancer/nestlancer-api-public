import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter, TransformResponseInterceptor } from '@nestlancer/common';
import { AppModule } from '../../src/app.module';

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

const TURNSTILE_TEST_TOKEN = 'test-token';

describe('Auth Service (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.setGlobalPrefix('api/v1/auth');
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
    it('GET /api/v1/auth/health', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/auth/health').expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.service).toBe('auth');
    });
  });

  describe('Registration', () => {
    const uniqueEmail = () =>
      `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

    it('POST /api/v1/auth/register - should register successfully with valid data', async () => {
      const dto = {
        email: uniqueEmail(),
        password: 'SecureP@ss123',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true,
        turnstileToken: TURNSTILE_TEST_TOKEN,
      };

      const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send(dto);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.userId).toBeDefined();
      expect(response.body.data.email).toBe(dto.email);
      expect(response.body.data.emailVerificationSent).toBe(true);
    });

    it('POST /api/v1/auth/register - should reject invalid data with 400 (validation)', async () => {
      const invalidDto = {
        email: 'not-an-email',
        password: 'weak',
        firstName: 'J',
        lastName: 'D',
        acceptTerms: false,
        turnstileToken: TURNSTILE_TEST_TOKEN,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(invalidDto);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.error).toBeDefined();
    });

    it('POST /api/v1/auth/register - should reject missing Turnstile token with 422 (guard)', async () => {
      const dto = {
        email: uniqueEmail(),
        password: 'SecureP@ss123',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true,
        // turnstileToken intentionally omitted
      };

      const response = await request(app.getHttpServer()).post('/api/v1/auth/register').send(dto);

      expect(response.status).toBe(422);
      expect(response.body.status).toBe('error');
      expect(response.body.error?.code).toBe('AUTH_011');
    });
  });

  describe('Login', () => {
    it('POST /api/v1/auth/login - should reject invalid credentials with 422 (business logic)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongP@ss123',
        })
        .set('User-Agent', 'IntegrationTest/1.0');

      expect(response.status).toBe(422);
      expect(response.body.status).toBe('error');
      expect(response.body.error?.code).toBeDefined();
      expect(response.body.error?.message).toMatch(/invalid email or password/i);
    });

    it('POST /api/v1/auth/login - should reject invalid payload with 400 (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
          password: '',
        })
        .set('User-Agent', 'IntegrationTest/1.0');

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('Refresh Token', () => {
    it('POST /api/v1/auth/refresh - should reject invalid refresh token with 422', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .set('User-Agent', 'IntegrationTest/1.0');

      expect(response.status).toBe(422);
      expect(response.body.status).toBe('error');
      expect(response.body.error?.message).toBeDefined();
    });

    it('POST /api/v1/auth/refresh - should reject empty refresh token with 400 (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: '' })
        .set('User-Agent', 'IntegrationTest/1.0');

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('Logout', () => {
    it('POST /api/v1/auth/logout - should reject invalid refresh token with 422', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(422);
      expect(response.body.status).toBe('error');
      expect(response.body.error?.message).toBeDefined();
    });

    it('POST /api/v1/auth/logout - should reject empty refresh token with 400 (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: '' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('Logout all sessions', () => {
    it('POST /api/v1/auth/logout-all - should reject missing Authorization with 401', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/logout-all').send({});

      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
    });
  });

  describe('Verify 2FA', () => {
    it('POST /api/v1/auth/verify-2fa - should reject invalid payload with 400 (validation)', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/verify-2fa').send({
        authSessionId: '',
        code: '123',
        method: 'invalid',
      });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/auth/verify-2fa - should reject invalid session with 422', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/verify-2fa').send({
        authSessionId: 'invalid-session-id',
        code: '123456',
        method: 'totp',
      });

      expect(response.status).toBe(422);
      expect(response.body.status).toBe('error');
      expect(response.body.error?.message).toBeDefined();
    });
  });

  describe('Verify Email', () => {
    it('POST /api/v1/auth/verify-email - should reject invalid token with 422', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: 'invalid-verification-token' });

      expect(response.status).toBe(422);
      expect(response.body.status).toBe('error');
      expect(response.body.error?.message).toMatch(/invalid|expired|verification/i);
    });

    it('POST /api/v1/auth/verify-email - should reject empty token with 400 (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: '' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('Resend Verification', () => {
    it('POST /api/v1/auth/resend-verification - should accept valid email and return 200/201 with emailSent', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .send({ email: 'user@example.com' });

      expect([200, 201]).toContain(response.status);
      expect(response.body.status).toBe('success');
      expect(response.body.data.emailSent).toBe(true);
    });

    it('POST /api/v1/auth/resend-verification - should reject invalid email with 400 (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('Forgot Password', () => {
    it('POST /api/v1/auth/forgot-password - should accept valid email and return 200/201 with emailSent', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'user@example.com',
          turnstileToken: TURNSTILE_TEST_TOKEN,
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.status).toBe('success');
      expect(response.body.data.emailSent).toBe(true);
    });

    it('POST /api/v1/auth/forgot-password - should reject invalid email with 400 (validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'not-an-email',
          turnstileToken: TURNSTILE_TEST_TOKEN,
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('POST /api/v1/auth/forgot-password - should reject missing Turnstile token with 422 (guard)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'user@example.com',
          // turnstileToken intentionally omitted
        });

      expect(response.status).toBe(422);
      expect(response.body.status).toBe('error');
      expect(response.body.error?.code).toBe('AUTH_011');
    });
  });

  describe('Reset Password', () => {
    it('POST /api/v1/auth/reset-password - should reject invalid token with 422', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/reset-password').send({
        token: 'invalid-reset-token',
        newPassword: 'NewSecureP@ss123!',
      });

      expect(response.status).toBe(422);
      expect(response.body.status).toBe('error');
      expect(response.body.error?.message).toMatch(/invalid|expired|reset/i);
    });

    it('POST /api/v1/auth/reset-password - should reject weak password with 400 (validation)', async () => {
      const response = await request(app.getHttpServer()).post('/api/v1/auth/reset-password').send({
        token: 'some-token',
        newPassword: 'weak',
      });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('Check Email', () => {
    it('GET /api/v1/auth/check-email - should return 200 with valid (availability) boolean', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/check-email')
        .query({ email: 'newuser@example.com', turnstileToken: TURNSTILE_TEST_TOKEN });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(typeof response.body.data.valid).toBe('boolean');
    });

    it('GET /api/v1/auth/check-email - should reject missing email with 400 (validation)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/check-email')
        .query({ turnstileToken: TURNSTILE_TEST_TOKEN });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    it('GET /api/v1/auth/check-email - should reject missing Turnstile token with 422 (guard)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/check-email')
        .query({ email: 'newuser@example.com' });

      expect(response.status).toBe(422);
      expect(response.body.status).toBe('error');
      expect(response.body.error?.code).toBe('AUTH_011');
    });
  });
});
