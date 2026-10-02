import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { NotificationsService } from '../../src/notifications/notifications.service';
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

  it('should initialize the HTTP service application successfully', () => {
    expect(app).toBeDefined();
  });

  it('should resolve AppModule dependencies', () => {
    const appModule = app.get(AppModule);
    expect(appModule).toBeDefined();
  });

  it('should resolve NotificationsService from the module', () => {
    const notificationsService = app.get(NotificationsService);
    expect(notificationsService).toBeDefined();
  });
});
