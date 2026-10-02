import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { StorageService as LibStorageService } from '@nestlancer/storage';
import { MediaStorageService } from '../../src/storage/storage.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { NestlancerConfigService as ConfigLibService } from '@nestlancer/config';
import { MediaController } from '../../src/media/media.controller';
import { MediaRootController } from '../../src/media/media-root.controller';
import { MediaAdminController } from '../../src/media/media.admin.controller';
import { MediaService } from '../../src/media/media.service';
import { MediaAdminService } from '../../src/media/media-admin.service';
import { ShareController } from '../../src/share/share.controller';

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
    })
      .overrideProvider(LibStorageService)
      .useValue({
        getSignedUrl: jest.fn().mockResolvedValue('https://example.com'),
        upload: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        exists: jest.fn().mockResolvedValue(true),
        download: jest.fn().mockResolvedValue(Buffer.from('')),
        onModuleInit: jest.fn(),
      })
      .overrideProvider(MediaStorageService)
      .useValue({
        generateStorageKey: jest.fn().mockReturnValue('key'),
        generatePresignedUploadUrl: jest.fn().mockResolvedValue('https://example.com'),
        generatePresignedDownloadUrl: jest.fn().mockResolvedValue('https://example.com'),
        upload: jest.fn().mockResolvedValue({}),
        deleteFile: jest.fn().mockResolvedValue({}),
        getFileSize: jest.fn().mockResolvedValue(0),
      })
      .overrideProvider(PrismaWriteService)
      .useValue({
        media: {
          findFirst: jest.fn().mockResolvedValue({ id: '1', metadata: { storageKey: 'key' } }),
          create: jest.fn().mockResolvedValue({ id: '1' }),
          update: jest.fn().mockResolvedValue({ id: '1' }),
          delete: jest.fn().mockResolvedValue({ id: '1' }),
        },
        mediaShareLink: {
          create: jest.fn().mockResolvedValue({ id: '1' }),
          findUnique: jest.fn().mockResolvedValue({ id: '1' }),
          delete: jest.fn().mockResolvedValue({ id: '1' }),
        },
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
      })
      .overrideProvider(PrismaReadService)
      .useValue({
        media: {
          findFirst: jest.fn().mockResolvedValue({ id: '1', metadata: { storageKey: 'key' } }),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          findUnique: jest.fn().mockResolvedValue({ id: '1', metadata: { storageKey: 'key' } }),
          aggregate: jest.fn().mockResolvedValue({ _sum: { size: 0 } }),
          groupBy: jest.fn().mockResolvedValue([]),
        },
        mediaShareLink: {
          findUnique: jest.fn().mockResolvedValue({ id: '1' }),
        },
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
      })
      .overrideProvider(ConfigLibService)
      .useValue({
        get: jest.fn().mockReturnValue('https://nestlancer.com'),
        getOptional: jest.fn().mockReturnValue('https://nestlancer.com'),
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

  it('should initialize the HTTP service application successfully', () => {
    expect(app).toBeDefined();
  });

  it('should resolve AppModule', () => {
    const appModule = app.get(AppModule);
    expect(appModule).toBeDefined();
  });

  it('should resolve media controllers registered by MediaModule', () => {
    expect(app.get(MediaController)).toBeDefined();
    expect(app.get(MediaRootController)).toBeDefined();
    expect(app.get(MediaAdminController)).toBeDefined();
  });

  it('should resolve media services', () => {
    expect(app.get(MediaService)).toBeDefined();
    expect(app.get(MediaAdminService)).toBeDefined();
  });

  it('should resolve ShareController from ShareModule', () => {
    expect(app.get(ShareController)).toBeDefined();
  });
});
