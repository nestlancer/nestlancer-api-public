import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { of } from 'rxjs';
import {
  API_PREFIX,
  API_VERSION,
  AppValidationPipe,
  AllExceptionsFilter,
  TransformResponseInterceptor,
} from '@nestlancer/common';
import { AppModule } from '../../src/app.module';
import { CacheService } from '@nestlancer/cache';
import { NestlancerConfigService } from '@nestlancer/config';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { HttpService } from '@nestjs/axios';
import { SWAGGER_SERVICE_SPECS } from '../../src/swagger/swagger.config';

const basePath = `/${API_PREFIX}/${API_VERSION}`;
const mockOpenApi = {
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0' },
  paths: { '/api/v1/mock/route': { get: { operationId: 'mockRoute', responses: { '200': {} } } } },
};

function loadDevEnv() {
  const envPath = resolve(__dirname, '../../../.env.development');
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

describe('Swagger docs (integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';
    process.env.SWAGGER_ENABLED = 'true';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CacheService)
      .useValue({
        getClient: jest.fn().mockReturnValue({
          on: jest.fn(),
          quit: jest.fn(),
          set: jest.fn(),
          del: jest.fn(),
          get: jest.fn(),
        }),
      })
      .overrideProvider(PrismaWriteService)
      .useValue({})
      .overrideProvider(PrismaReadService)
      .useValue({})
      .overrideProvider(HttpService)
      .useValue({
        request: jest.fn().mockReturnValue(of({ data: mockOpenApi, status: 200, headers: {} })),
        get: jest.fn().mockReturnValue(of({ data: mockOpenApi, status: 200, headers: {} })),
      })
      .overrideProvider(NestlancerConfigService)
      .useValue({
        port: 3000,
        get: jest.fn().mockReturnValue('mocked-value'),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(`${API_PREFIX}/${API_VERSION}`);
    app.useGlobalPipes(new AppValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET docs-specs/:service returns 200 without Authorization', async () => {
    const sample = SWAGGER_SERVICE_SPECS.slice(0, 4);
    for (const { serviceKey } of sample) {
      const res = await request(app.getHttpServer())
        .get(`${basePath}/docs-specs/${serviceKey}`)
        .expect(200);

      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body.openapi).toBeDefined();
    }
  });

  it('GET docs-specs/all returns merged OpenAPI without Authorization', async () => {
    const res = await request(app.getHttpServer()).get(`${basePath}/docs-specs/all`).expect(200);

    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.info?.title).toMatch(/All Services/i);
    expect(Object.keys(res.body.paths ?? {}).length).toBeGreaterThan(0);
  });

  it('GET docs-specs index returns service list without Authorization', async () => {
    const res = await request(app.getHttpServer()).get(`${basePath}/docs-specs`).expect(200);

    const data = res.body.data ?? res.body;
    expect(data.swaggerUi).toBe('/docs/');
    expect(Array.isArray(data.services)).toBe(true);
    expect(data.services.length).toBeGreaterThan(0);
    expect(data.services[0]).toMatchObject({
      name: expect.any(String),
      serviceKey: expect.any(String),
      specUrl: expect.stringContaining('/docs-specs/'),
    });
  });

  it('GET docs-specs/unknown returns 404 without Authorization', async () => {
    await request(app.getHttpServer()).get(`${basePath}/docs-specs/not-a-real-service`).expect(404);
  });

  it('GET protected route without token returns 401', async () => {
    await request(app.getHttpServer()).get(`${basePath}/users/profile`).expect(401);
  });
});
