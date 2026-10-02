import { Test, TestingModule } from '@nestjs/testing';
import { StorageModule } from '../../src/storage.module';
import { StorageService } from '../../src/storage.service';
import { ConfigModule } from '@nestjs/config';
import { NestlancerConfigService } from '@nestlancer/config';
import { promises as fs } from 'fs';

// Mock fs
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    promises: {
      ...actualFs.promises,
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue(Buffer.from('test')),
      unlink: jest.fn().mockResolvedValue(undefined),
      access: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('StorageModule (Integration)', () => {
  let module: TestingModule;
  let service: StorageService;

  beforeAll(async () => {
    const mockConfigService = {
      storageProvider: 'local',
      localStoragePath: '/tmp/nestlancer-storage',
      localStorageUrl: 'http://localhost:3000/storage',
      s3AccessKeyId: 'test-key-id',
      s3SecretAccessKey: 'test-secret-key',
      s3Endpoint: 'test-endpoint',
      s3Region: 'test-region',
    };

    module = await Test.createTestingModule({
      imports: [
        StorageModule.forRoot({
          provider: 'local',
          local: { basePath: '/tmp/nestlancer-storage', baseUrl: '' },
        }),
      ],
    })
      .useMocker((token) => {
        if (token === NestlancerConfigService) {
          return mockConfigService;
        }
      })
      .compile();

    service = module.get<StorageService>(StorageService);
    service.onModuleInit();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should upload a file using local provider', async () => {
    const body = Buffer.from('hello world');
    const result = await service.upload('avatars', 'user-123.png', body, 'image/png');

    expect(result.key).toBe('user-123.png');
    expect(result.size).toBe(body.length);
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it('should get a signed URL', async () => {
    const url = await service.getSignedUrl({ bucket: 'docs', key: 'resume.pdf' });
    expect(url).toContain('docs/resume.pdf');
  });
});
