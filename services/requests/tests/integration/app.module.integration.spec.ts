import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { RequestsController } from '../../src/controllers/requests.controller';
import { RequestsAdminController } from '../../src/controllers/requests.admin.controller';
import { RequestsService } from '../../src/services/requests.service';

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
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should resolve RequestsController and RequestsAdminController', () => {
    const requestsController = app.get(RequestsController);
    const adminController = app.get(RequestsAdminController);
    expect(requestsController).toBeDefined();
    expect(requestsController).toBeInstanceOf(RequestsController);
    expect(adminController).toBeDefined();
    expect(adminController).toBeInstanceOf(RequestsAdminController);
  });

  it('should resolve RequestsService as dependency of requests controller', () => {
    const requestsService = app.get(RequestsService);
    expect(requestsService).toBeDefined();
    expect(requestsService).toBeInstanceOf(RequestsService);
  });

  it('should expose health endpoint and return requests service status', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/requests/health');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('requests');
  });
});
