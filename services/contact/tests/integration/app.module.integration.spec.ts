import './integration.env';

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import request from 'supertest';

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

  it('should bootstrap and resolve AppModule', () => {
    const appModule = app.get(AppModule);
    expect(appModule).toBeDefined();
  });

  it('should expose public health and return 200 with status healthy and service name', async () => {
    const response = await request(app.getHttpServer()).get('/contact/health');
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.status).toBe('healthy');
    expect(response.body.service).toBe('contact');
  });
});
