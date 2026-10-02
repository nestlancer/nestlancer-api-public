import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { HealthService } from '../../src/services/health.service';
import { HealthPublicController } from '../../src/controllers/public/health.public.controller';
import { HealthDebugAdminController } from '../../src/controllers/admin/health-debug.admin.controller';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

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

describe('AppModule (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL ||= 'postgresql://127.0.0.1:5432/postgres';
    process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-12345';
    process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-12345';

    const { AppModule } = await import('../../src/app.module');

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [Reflector],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1/health');
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should resolve HealthPublicController and HealthDebugAdminController', () => {
    const publicController = app.get(HealthPublicController);
    const adminController = app.get(HealthDebugAdminController);
    expect(publicController).toBeDefined();
    expect(publicController).toBeInstanceOf(HealthPublicController);
    expect(adminController).toBeDefined();
    expect(adminController).toBeInstanceOf(HealthDebugAdminController);
  });

  it('should resolve HealthService as dependency of health controllers', () => {
    const healthService = app.get(HealthService);
    expect(healthService).toBeDefined();
    expect(healthService).toBeInstanceOf(HealthService);
  });

  it('should expose liveness endpoint and return alive status', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe('alive');
    expect(typeof res.body.uptime).toBe('number');
  });
});
