import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { NestlancerConfigService } from '@nestlancer/config';
import { JwtStrategy } from '@nestlancer/auth-lib';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), AppModule],
    })
      .overrideProvider(NestlancerConfigService)
      .useValue({ get: jest.fn().mockReturnValue('test-secret') })
      .overrideProvider(ConfigService)
      .useValue({ get: jest.fn().mockReturnValue('test-secret') })
      .overrideProvider(PrismaWriteService)
      .useValue({})
      .overrideProvider(PrismaReadService)
      .useValue({})
      .overrideProvider(JwtService)
      .useValue({ sign: jest.fn(), verify: jest.fn() })
      .overrideProvider(HttpService)
      .useValue({ get: jest.fn(), post: jest.fn() })
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
    expect(app).toBeDefined();
    const appModule = app.get(AppModule);
    expect(appModule).toBeDefined();
  });
});
