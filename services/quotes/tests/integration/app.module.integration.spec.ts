import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { QuotesController } from '../../src/controllers/quotes.controller';
import { QuotesAdminController } from '../../src/controllers/quotes.admin.controller';
import { QuotesService } from '../../src/services/quotes.service';

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

  it('should resolve QuotesController and QuotesAdminController', () => {
    const quotesController = app.get(QuotesController);
    const adminController = app.get(QuotesAdminController);
    expect(quotesController).toBeDefined();
    expect(quotesController).toBeInstanceOf(QuotesController);
    expect(adminController).toBeDefined();
    expect(adminController).toBeInstanceOf(QuotesAdminController);
  });

  it('should resolve QuotesService as dependency of quotes controller', () => {
    const quotesService = app.get(QuotesService);
    expect(quotesService).toBeDefined();
    expect(quotesService).toBeInstanceOf(QuotesService);
  });

  it('should expose health endpoint and return quotes service status', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/quotes/health');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('quotes');
  });
});
