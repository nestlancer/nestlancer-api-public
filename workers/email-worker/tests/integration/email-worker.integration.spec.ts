import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { EmailWorkerService } from '../../src/services/email-worker.service';
import { EmailConsumer } from '../../src/consumers/email.consumer';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { CacheService } from '@nestlancer/cache';
import { MailService } from '@nestlancer/mail';

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

describe('Email Worker (Integration)', () => {
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
      .overrideProvider(CacheService)
      .useValue({
        get: jest.fn(),
        set: jest.fn(),
        exists: jest.fn().mockResolvedValue(false),
        onModuleInit: jest.fn(),
      })
      .overrideProvider(MailService)
      .useValue({
        send: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
        onModuleInit: jest.fn(),
      })
      .overrideProvider('MAIL_OPTIONS')
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
    it('should initialize the email worker application context successfully', () => {
      expect(app).toBeDefined();
    });

    it('should resolve AppModule', () => {
      const appModule = app.get(AppModule);
      expect(appModule).toBeDefined();
    });
  });

  describe('Service Resolution', () => {
    it('should resolve EmailWorkerService', () => {
      const service = app.get(EmailWorkerService);
      expect(service).toBeDefined();
    });

    it('should resolve EmailConsumer', () => {
      const consumer = app.get(EmailConsumer);
      expect(consumer).toBeDefined();
    });
    describe('EmailConsumer Logic', () => {
      let service: EmailWorkerService;
      let queueConsumer: QueueConsumerService;

      beforeEach(() => {
        service = app.get(EmailWorkerService);
        queueConsumer = app.get(QueueConsumerService);
      });

      it('should parse message and call EmailWorkerService.processEmail', async () => {
        jest.spyOn(service, 'processEmail').mockResolvedValue(undefined);

        // Simulate module init to register the consumer
        const consumer = app.get(EmailConsumer);
        await consumer.onModuleInit();

        const payload = { type: 'WELCOME', to: 'test@example.com', data: {} };
        const msg: any = { content: Buffer.from(JSON.stringify(payload)) };

        // Extract the callback registered with consume
        const consumeCalls = (queueConsumer.consume as jest.Mock).mock.calls;
        const callback = consumeCalls[consumeCalls.length - 1][1];

        await callback(msg);

        expect(service.processEmail).toHaveBeenCalledWith(payload);
      });

      it('should throw an error for invalid JSON payloads', async () => {
        const consumer = app.get(EmailConsumer);
        await consumer.onModuleInit();

        const consumeCalls = (queueConsumer.consume as jest.Mock).mock.calls;
        const callback = consumeCalls[consumeCalls.length - 1][1];

        const msg: any = { content: Buffer.from('invalid-json') };

        await expect(callback(msg)).rejects.toThrow();
      });
    });

    describe('EmailWorkerService Logic', () => {
      let service: EmailWorkerService;

      beforeEach(() => {
        service = app.get(EmailWorkerService);
      });

      it('should map EMAIL_VERIFICATION type to correct subject', () => {
        const subject = (service as any).getSubjectForType('EMAIL_VERIFICATION', {});
        expect(subject).toBe('Verify your email address');
      });

      it('should dynamically map PROJECT_UPDATE subject', () => {
        const subject = (service as any).getSubjectForType('PROJECT_UPDATE', {
          projectName: 'Alpha',
        });
        expect(subject).toBe('Project Update: Alpha');
      });

      it('should return default subject for unknown type', () => {});
    });
  });
});
