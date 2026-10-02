import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { JwtStrategy } from '@nestlancer/auth-lib';
import { ConfigService } from '@nestjs/config';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

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

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('QUEUE_OPTIONS')
      .useValue({ url: process.env.RABBITMQ_URL || 'amqp://localhost:5672' })
      .overrideProvider(ConfigService)
      .useValue({ get: jest.fn().mockReturnValue('test-secret') })
      .overrideProvider(PrismaWriteService)
      .useValue({})
      .overrideProvider(PrismaReadService)
      .useValue({})
      .overrideProvider(JwtStrategy)
      .useValue({ validate: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should bootstrap and resolve AppModule', () => {
    const appModule = app.get(AppModule);
    expect(appModule).toBeDefined();
  });

  it('should expose webhooks health at GET /health and return 200 with status ok and service name', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('webhooks-inbound');
  });
});
