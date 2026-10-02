import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

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
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { NestlancerConfigService } from '@nestlancer/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { UsersController } from '../../src/modules/users/users.controller';

describe('AppModule (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

    const mockHttpService = {
      request: jest.fn().mockReturnValue(of({ data: {}, status: 200, headers: {} })),
      get: jest.fn().mockReturnValue(of({ data: { status: 'ok' }, status: 200, headers: {} })),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue(mockHttpService)
      .overrideProvider(NestlancerConfigService)
      .useValue({
        port: 3000,
        get: jest.fn((key: string) => (key === 'port' ? 3000 : 'mocked-value')),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should initialize the Gateway application successfully', () => {
    expect(app).toBeDefined();
  });

  it('should resolve AppModule dependencies correctly', () => {
    const appModule = app.get(AppModule);
    expect(appModule).toBeDefined();
  });

  it('should resolve NestlancerConfigService properly', () => {
    const configService = app.get(NestlancerConfigService);
    expect(configService).toBeDefined();
    expect(configService.get('port')).toEqual(3000);
  });

  it('should instantiate the primary controllers', () => {
    const authController = app.get(AuthController);
    const usersController = app.get(UsersController);
    expect(authController).toBeDefined();
    expect(usersController).toBeDefined();
  });

  it('should have HttpService injected for proxying', () => {
    const httpService = app.get(HttpService);
    expect(httpService).toBeDefined();
    expect(typeof httpService.request).toBe('function');
  });

  it('should configure routing for auth/login to downstream service', async () => {
    const httpService = app.get(HttpService);
    const authController = app.get(AuthController);

    const mockRequest = {
      method: 'POST',
      path: '/api/v1/auth/login',
      body: { email: 'test@example.com', password: 'password' },
      headers: {},
    } as any;

    await authController.login(mockRequest);

    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:3001/api/v1/auth/login',
        method: 'POST',
      }),
    );
  });

  it('should configure routing for users/profile with path preserved', async () => {
    const httpService = app.get(HttpService);
    const usersController = app.get(UsersController);

    const mockRequest = {
      method: 'GET',
      path: '/api/v1/users/profile',
      body: {},
      headers: {},
    } as any;

    await usersController.getProfile(mockRequest);

    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:3002/api/v1/users/profile',
        method: 'GET',
      }),
    );
  });
});
