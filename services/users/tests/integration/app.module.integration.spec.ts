import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { UsersController } from '../../src/controllers/users.controller';
import { UsersAdminController } from '../../src/controllers/users.admin.controller';
import { ProfileService } from '../../src/services/profile.service';

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

  it('should resolve UsersController and UsersAdminController', () => {
    const usersController = app.get(UsersController);
    const adminController = app.get(UsersAdminController);
    expect(usersController).toBeDefined();
    expect(usersController).toBeInstanceOf(UsersController);
    expect(adminController).toBeDefined();
    expect(adminController).toBeInstanceOf(UsersAdminController);
  });

  it('should resolve ProfileService as dependency of users controller', () => {
    const profileService = app.get(ProfileService);
    expect(profileService).toBeDefined();
    expect(profileService).toBeInstanceOf(ProfileService);
  });

  it('should expose health endpoint and return users service status', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/users/health');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('users');
  });
});
