import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OutgoingWebhookProcessor } from '../../../src/processors/outgoing-webhook.processor';
import { HttpService } from '@nestjs/axios';
import { LoggerService } from '@nestlancer/logger';
import { SignatureVerifierService } from '../../../src/services/signature-verifier.service';
import { WebhookLoggerService } from '../../../src/services/webhook-logger.service';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { OutgoingWebhookJob } from '../../../src/interfaces/webhook-job.interface';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

// Mock generateUuid
jest.mock('@nestlancer/common', () => ({
  generateUuid: jest.fn().mockReturnValue('mocked-uuid'),
}));

describe('OutgoingWebhookProcessor', () => {
  let processor: OutgoingWebhookProcessor;
  let httpService: jest.Mocked<HttpService>;
  let signatureVerifier: jest.Mocked<SignatureVerifierService>;
  let webhookLogger: jest.Mocked<WebhookLoggerService>;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutgoingWebhookProcessor,
        {
          provide: HttpService,
          useValue: { post: jest.fn() },
        },
        {
          provide: SignatureVerifierService,
          useValue: { sign: jest.fn().mockReturnValue('mock-signature') },
        },
        {
          provide: WebhookLoggerService,
          useValue: { logDelivery: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: number) =>
              key === 'webhook-worker.outgoingTimeoutMs' ? 10000 : def,
            ),
          },
        },
        {
          provide: PrismaReadService,
          useValue: { webhook: { findUnique: jest.fn() } },
        },
        {
          provide: PrismaWriteService,
          useValue: { outbox: { create: jest.fn().mockResolvedValue({}) } },
        },
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    processor = module.get<OutgoingWebhookProcessor>(OutgoingWebhookProcessor);
    httpService = module.get(HttpService);
    signatureVerifier = module.get(SignatureVerifierService);
    webhookLogger = module.get(WebhookLoggerService);
    prismaRead = module.get(PrismaReadService);

    jest.spyOn(Date, 'now').mockReturnValue(1600000000000); // stable date
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleOutgoing', () => {
    const job: OutgoingWebhookJob = {
      webhookId: 'w1',
      event: 'project.created',
      payload: { id: 'p1' },
      attempt: 1,
    };

    it('should skip if webhook not found or disabled', async () => {
      prismaRead.webhook.findUnique.mockResolvedValue(null);
      await processor.handleOutgoing(job);
      expect(httpService.post).not.toHaveBeenCalled();

      prismaRead.webhook.findUnique.mockResolvedValue({ enabled: false } as any);
      await processor.handleOutgoing(job);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should send webhook and log success', async () => {
      prismaRead.webhook.findUnique.mockResolvedValue({
        id: 'w1',
        enabled: true,
        url: 'https://test.com',
        secret: 'sec',
      } as any);
      const mockResponse: AxiosResponse = {
        status: 200,
        data: 'OK',
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      httpService.post.mockReturnValue(of(mockResponse));

      await processor.handleOutgoing(job);

      expect(signatureVerifier.sign).toHaveBeenCalledWith({ id: 'p1' }, 'sec');
      expect(httpService.post).toHaveBeenCalledWith(
        'https://test.com',
        { id: 'p1' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Webhook-Signature': 'mock-signature',
            'X-Webhook-Event': 'project.created',
            'X-Webhook-Delivery-ID': 'mocked-uuid',
          }),
        }),
      );

      expect(webhookLogger.logDelivery).toHaveBeenCalledWith(
        'w1',
        'project.created',
        { id: 'p1' },
        {
          statusCode: 200,
          responseBody: '"OK"',
          responseTime: 0, // mocked same stable date
          attempt: 1,
        },
      );
    });

    it('should handle failure and log it, then throw error for retry', async () => {
      prismaRead.webhook.findUnique.mockResolvedValue({
        id: 'w1',
        enabled: true,
        url: 'https://test.com',
        secret: 'sec',
      } as any);
      const errorResponse = { response: { status: 400, data: 'Bad Request' } };
      httpService.post.mockReturnValue(throwError(() => errorResponse));

      await expect(processor.handleOutgoing(job)).rejects.toEqual(errorResponse);

      expect(webhookLogger.logDelivery).toHaveBeenCalledWith(
        'w1',
        'project.created',
        { id: 'p1' },
        {
          statusCode: 400,
          responseBody: '"Bad Request"',
          responseTime: 0,
          attempt: 1,
        },
      );
    });
  });
});
