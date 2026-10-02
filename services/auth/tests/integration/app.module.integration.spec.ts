import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { AuthPublicController } from '../../src/controllers/auth.public.controller';
import { AuthService } from '../../src/services/auth.service';
import { TurnstileGuard } from '../../src/guards/turnstile.guard';

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
    process.env.NODE_ENV = 'development';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [Reflector],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should resolve AppModule and register AuthPublicController', () => {
    const controller = app.get(AuthPublicController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(AuthPublicController);
  });

  it('should resolve AuthService as a dependency of the auth controller', () => {
    const authService = app.get(AuthService);
    expect(authService).toBeDefined();
  });

  it('should resolve TurnstileGuard from the module', () => {
    const guard = app.get(TurnstileGuard);
    expect(guard).toBeDefined();
    expect(guard).toBeInstanceOf(TurnstileGuard);
  });

  it('should expose health endpoint and return auth service status', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('auth');
  });
});
