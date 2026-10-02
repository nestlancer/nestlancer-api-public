import './integration.env';

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';

import { AppModule } from '../../src/app.module';
import { CdnConsumer } from '../../src/consumers/cdn.consumer';
import { BatchInvalidationProcessor } from '../../src/processors/batch-invalidation.processor';
import { PathInvalidationProcessor } from '../../src/processors/path-invalidation.processor';
import { CdnWorkerService } from '../../src/services/cdn-worker.service';

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

describe('CDN Worker (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(QueuePublisherService)
      .useValue({ publish: jest.fn() })
      .overrideProvider(QueueConsumerService)
      .useValue({ consume: jest.fn(), getChannel: jest.fn(), onModuleInit: jest.fn() })
      .overrideProvider(DlqService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Module Initialization', () => {
    it('should initialize the cdn worker application context successfully', () => {
      expect(app).toBeDefined();
    });

    it('should resolve AppModule', () => {
      const appModule = app.get(AppModule);
      expect(appModule).toBeDefined();
    });
  });

  describe('Service Resolution', () => {
    it('should resolve CdnWorkerService', () => {
      const service = app.get(CdnWorkerService);
      expect(service).toBeDefined();
    });

    it('should resolve CdnConsumer', () => {
      const consumer = app.get(CdnConsumer);
      expect(consumer).toBeDefined();
    });

    it('should resolve PathInvalidationProcessor', () => {
      const processor = app.get(PathInvalidationProcessor);
      expect(processor).toBeDefined();
    });

    it('should resolve BatchInvalidationProcessor', () => {
      const processor = app.get(BatchInvalidationProcessor);
      expect(processor).toBeDefined();
    });
    describe('CdnConsumer Logic', () => {
      let consumer: CdnConsumer;
      let service: CdnWorkerService;

      beforeEach(() => {
        consumer = app.get(CdnConsumer);
        service = app.get(CdnWorkerService);
      });

      it('should route INVALIDATE_PATH job to CdnWorkerService.invalidatePath', async () => {
        jest.spyOn(service, 'invalidatePath').mockResolvedValue(undefined);
        const msg: any = {
          content: Buffer.from(
            JSON.stringify({ type: 'INVALIDATE_PATH', paths: ['/images/1.png'] }),
          ),
        };

        await (consumer as any).handleMessage(msg);

        expect(service.invalidatePath).toHaveBeenCalledWith('/images/1.png');
      });

      it('should route INVALIDATE_BATCH job to CdnWorkerService.invalidateBatch', async () => {
        jest.spyOn(service, 'invalidateBatch').mockResolvedValue(undefined);
        const msg: any = {
          content: Buffer.from(JSON.stringify({ type: 'INVALIDATE_BATCH', paths: ['/assets/*'] })),
        };

        await (consumer as any).handleMessage(msg);

        expect(service.invalidateBatch).toHaveBeenCalledWith(['/assets/*']);
      });

      it('should route PURGE_ALL job to CdnWorkerService.purgeAll', async () => {
        jest.spyOn(service, 'purgeAll').mockResolvedValue(undefined);
        const msg: any = {
          content: Buffer.from(JSON.stringify({ type: 'PURGE_ALL' })),
        };

        await (consumer as any).handleMessage(msg);

        expect(service.purgeAll).toHaveBeenCalled();
      });

      it('should safely handle unknown job types without throwing', async () => {
        const msg: any = {
          content: Buffer.from(JSON.stringify({ type: 'UNKNOWN_JOB' })),
        };

        await expect((consumer as any).handleMessage(msg)).resolves.not.toThrow();
      });
    });

    describe('PathInvalidationProcessor', () => {
      let processor: PathInvalidationProcessor;
      let service: CdnWorkerService;

      beforeEach(() => {
        processor = app.get(PathInvalidationProcessor);
        service = app.get(CdnWorkerService);
      });

      it('should process paths individually through CdnWorkerService', async () => {
        jest.spyOn(service, 'invalidatePath').mockResolvedValue(undefined);
        await processor.process(['/path1', '/path2']);

        expect(service.invalidatePath).toHaveBeenCalledTimes(2);
        expect(service.invalidatePath).toHaveBeenCalledWith('/path1');
        expect(service.invalidatePath).toHaveBeenCalledWith('/path2');
      });
    });
  });
});
