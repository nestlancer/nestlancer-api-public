import { Test, TestingModule } from '@nestjs/testing';
import { EmailWorkerService } from '../../../src/services/email-worker.service';
import { MailService } from '@nestlancer/mail';
import { EmailRendererService } from '../../../src/services/email-renderer.service';
import { EmailRetryService } from '../../../src/services/email-retry.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { CacheService } from '@nestlancer/cache';

describe('EmailWorkerService', () => {
  let service: EmailWorkerService;
  let mailService: jest.Mocked<MailService>;
  let emailRenderer: jest.Mocked<EmailRendererService>;
  let retryService: jest.Mocked<EmailRetryService>;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailWorkerService,
        {
          provide: MailService,
          useValue: { send: jest.fn() },
        },
        {
          provide: EmailRendererService,
          useValue: { render: jest.fn() },
        },
        {
          provide: EmailRetryService,
          useValue: { handleFailure: jest.fn() },
        },
        {
          provide: CacheService,
          useValue: {
            exists: jest.fn().mockResolvedValue(false),
            set: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'emailWorker.rabbitmq.queue') return 'email.queue';
              if (key === 'emailWorker.from.name') return 'Test Company';
              if (key === 'emailWorker.from.email') return 'support@test.com';
              if (key === 'emailWorker.frontendUrl') return 'https://test.com';
              if (key === 'emailWorker.idempotencyTtl') return 86400;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailWorkerService>(EmailWorkerService);
    mailService = module.get(MailService);
    emailRenderer = module.get(EmailRendererService);
    retryService = module.get(EmailRetryService);
    cacheService = module.get(CacheService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processEmail', () => {
    it('should successfully render and send email', async () => {
      emailRenderer.render.mockResolvedValue('<html>Test</html>');

      const job: EmailJob = {
        type: 'WELCOME',
        to: 'user@example.com',
        data: { name: 'User' },
      } as any;

      await service.processEmail(job);

      expect(emailRenderer.render).toHaveBeenCalledWith(
        'welcome',
        expect.objectContaining({
          name: 'User',
          currentYear: expect.any(Number),
          companyName: 'Test Company',
        }),
      );

      expect(mailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Welcome to Nestlancer!',
          html: '<html>Test</html>',
          from: expect.stringContaining('@'),
          replyTo: expect.any(String),
        }),
      );
      expect(retryService.handleFailure).not.toHaveBeenCalled();
    });

    it('should call retryService on failure', async () => {
      emailRenderer.render.mockRejectedValue(new Error('Render error'));

      const job: EmailJob = {
        type: 'WELCOME',
        to: 'user@example.com',
        data: {},
      } as any;

      await service.processEmail(job);

      expect(retryService.handleFailure).toHaveBeenCalledWith(
        'email.queue',
        job,
        expect.any(Error),
      );
    });

    it('should correctly determine subject for PROJECT_UPDATE', async () => {
      emailRenderer.render.mockResolvedValue('<html>Update</html>');
      const job: EmailJob = {
        type: 'PROJECT_UPDATE',
        to: 'user@example.com',
        data: { projectName: 'My Super Project' },
      } as any;

      await service.processEmail(job);

      expect(mailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Project Update: My Super Project',
        }),
      );
    });

    it('should correctly determine subject for default', async () => {
      emailRenderer.render.mockResolvedValue('<html>Default</html>');
      const job: EmailJob = {
        type: 'UNKNOWN_TYPE',
        to: 'user@example.com',
        data: {},
      } as any;

      await service.processEmail(job);

      expect(mailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Notification from Nestlancer',
        }),
      );
    });
  });
});
