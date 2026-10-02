import { Test, TestingModule } from '@nestjs/testing';
import { PushProviderService } from '../../../src/services/push-provider.service';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { Logger } from '@nestjs/common';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

describe('PushProviderService', () => {
  let service: PushProviderService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushProviderService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PushProviderService>(PushProviderService);
    configService = module.get(ConfigService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should configure web-push if keys are present', () => {
      configService.get.mockImplementation((key) => {
        if (key === 'notificationWorker.vapid.publicKey') return 'pub';
        if (key === 'notificationWorker.vapid.privateKey') return 'priv';
        if (key === 'notificationWorker.vapid.subject') return 'mailto:test@example.com';
        return null;
      });

      service.onModuleInit();

      expect(webpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:test@example.com',
        'pub',
        'priv',
      );
    });

    it('should warn if keys are missing', () => {
      configService.get.mockReturnValue(undefined);
      service.onModuleInit();
      expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    });
  });

  describe('sendNotification', () => {
    it('should send push notification', async () => {
      (webpush.sendNotification as jest.Mock).mockResolvedValue(true);
      const result = await service.sendNotification({ endpoint: 'url' }, { title: 'T', body: 'B' });
      expect(webpush.sendNotification).toHaveBeenCalledWith(
        { endpoint: 'url' },
        JSON.stringify({ title: 'T', body: 'B' }),
      );
      expect(result).toBe(true);
    });

    it('should detect invalid subscriptions and return false', async () => {
      (webpush.sendNotification as jest.Mock).mockRejectedValue({ statusCode: 410 });
      const result = await service.sendNotification({ endpoint: 'url' }, { title: 'T', body: 'B' });
      expect(result).toBe(false);

      (webpush.sendNotification as jest.Mock).mockRejectedValue({ statusCode: 404 });
      const result2 = await service.sendNotification(
        { endpoint: 'url' },
        { title: 'T', body: 'B' },
      );
      expect(result2).toBe(false);
    });

    it('should rethrow other errors', async () => {
      (webpush.sendNotification as jest.Mock).mockRejectedValue({
        statusCode: 500,
        message: 'Server error',
      });
      await expect(
        service.sendNotification({ endpoint: 'url' }, { title: 'T', body: 'B' }),
      ).rejects.toEqual({ statusCode: 500, message: 'Server error' });
    });
  });
});
