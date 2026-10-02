import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../src/app.module';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { EmailWorkerService } from '../../src/services/email-worker.service';
import { EmailRendererService } from '../../src/services/email-renderer.service';
import { EmailRetryService } from '../../src/services/email-retry.service';
import { EmailConsumer } from '../../src/consumers/email.consumer';
import { MailService } from '@nestlancer/mail';

describe('AppModule (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(QueuePublisherService)
      .useValue({ publish: jest.fn() })
      .overrideProvider(QueueConsumerService)
      .useValue({ consume: jest.fn(), getChannel: jest.fn(), onModuleInit: jest.fn() })
      .overrideProvider(DlqService)
      .useValue({})
      .overrideProvider('MAIL_OPTIONS')
      .useValue({
        provider: 'smtp',
        smtp: {},
        zeptomail: {},
        from: 'Test <test@example.com>',
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

  describe('Configuration & Dependencies', () => {
    it('should initialize the worker application context successfully', () => {
      expect(app).toBeDefined();
    });

    it('should resolve AppModule dependencies', () => {
      const appModule = app.get(AppModule);
      expect(appModule).toBeDefined();
    });

    it('should load email configuration', () => {
      const configService = app.get(ConfigService);
      expect(configService).toBeDefined();
    });

    it('should resolve all email processors and services', () => {
      const providers = [
        EmailWorkerService,
        EmailRendererService,
        EmailRetryService,
        EmailConsumer,
      ];

      for (const provider of providers) {
        const instance = app.get(provider);
        expect(instance).toBeDefined();
      }
    });

    it('should resolve MailModule services', () => {
      const mailService = app.get(MailService);
      expect(mailService).toBeDefined();
    });
  });
});
