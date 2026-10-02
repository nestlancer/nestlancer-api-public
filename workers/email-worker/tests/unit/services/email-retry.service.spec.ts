import { Test, TestingModule } from '@nestjs/testing';
import { EmailRetryService } from '../../../src/services/email-retry.service';
import { QueuePublisherService, DlqService } from '@nestlancer/queue';
import { Logger } from '@nestjs/common';

describe('EmailRetryService', () => {
  let service: EmailRetryService;
  let publisherService: jest.Mocked<QueuePublisherService>;
  let dlqService: jest.Mocked<DlqService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailRetryService,
        {
          provide: QueuePublisherService,
          useValue: { sendToQueue: jest.fn() },
        },
        {
          provide: DlqService,
          useValue: { sendToDlq: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<EmailRetryService>(EmailRetryService);
    publisherService = module.get(QueuePublisherService);
    dlqService = module.get(DlqService);

    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleFailure', () => {
    it('should send to DLQ if max retries exceeded', async () => {
      const message = { to: 'test@example.com', retryCount: 3 };
      const error = new Error('Test Error');

      await service.handleFailure('email.queue', message, error);

      expect(dlqService.sendToDlq).toHaveBeenCalledWith('email.queue', message, error.message);
      expect(publisherService.sendToQueue).not.toHaveBeenCalled();
    });

    it('should requeue with delay if within retry limit (first retry)', async () => {
      const message = { to: 'test@example.com' }; // no retry count yet
      const error = new Error('Test Error');

      await service.handleFailure('email.queue', message, error);

      expect(publisherService.sendToQueue).toHaveBeenCalledWith(
        'email.queue',
        { to: 'test@example.com', retryCount: 1 },
        { headers: { 'x-delay': 60000 } }, // 1 min (first retry)
      );
      expect(dlqService.sendToDlq).not.toHaveBeenCalled();
    });

    it('should requeue with delay if within retry limit (last retry)', async () => {
      const message = { to: 'test@example.com', retryCount: 2 };
      const error = new Error('Test Error');

      await service.handleFailure('email.queue', message, error);

      expect(publisherService.sendToQueue).toHaveBeenCalledWith(
        'email.queue',
        { to: 'test@example.com', retryCount: 3 },
        { headers: { 'x-delay': 1800000 } }, // 30 mins
      );
    });
  });
});
