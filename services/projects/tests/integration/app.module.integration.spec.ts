import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { ProjectsController } from '../../src/controllers/projects.controller';
import { ProjectsAdminController } from '../../src/controllers/projects.admin.controller';
import { ProjectsPublicController } from '../../src/controllers/projects.public.controller';
import { ProjectsService } from '../../src/services/projects.service';

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

  it('should resolve ProjectsController, ProjectsAdminController and ProjectsPublicController', () => {
    const projectsController = app.get(ProjectsController);
    const adminController = app.get(ProjectsAdminController);
    const publicController = app.get(ProjectsPublicController);
    expect(projectsController).toBeDefined();
    expect(projectsController).toBeInstanceOf(ProjectsController);
    expect(adminController).toBeDefined();
    expect(adminController).toBeInstanceOf(ProjectsAdminController);
    expect(publicController).toBeDefined();
    expect(publicController).toBeInstanceOf(ProjectsPublicController);
  });

  it('should resolve ProjectsService as dependency of projects controller', () => {
    const projectsService = app.get(ProjectsService);
    expect(projectsService).toBeDefined();
    expect(projectsService).toBeInstanceOf(ProjectsService);
  });

  it('should expose health endpoint and return projects service status', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/projects/health');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('projects');
  });
});
