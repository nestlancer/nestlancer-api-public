import { Test, TestingModule } from '@nestjs/testing';
import { WebhookIngestionService } from '../../../src/services/webhook-ingestion.service';
import { PrismaWriteService } from '@nestlancer/database';
import { WebhookDispatcherService } from '../../../src/services/webhook-dispatcher.service';
import { RazorpayProvider } from '../../../src/providers/razorpay.provider';
import { CloudflareProvider } from '../../../src/providers/cloudflare.provider';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

describe('WebhookIngestionService', () => {
  let service: WebhookIngestionService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let dispatcher: jest.Mocked<WebhookDispatcherService>;
  let razorpayProvider: jest.Mocked<RazorpayProvider>;

  beforeEach(async () => {
    const mockPrismaWrite = {
      webhookLog: {
        create: jest
          .fn()
          .mockImplementation((args) => Promise.resolve({ id: 'log_123', ...args.data })),
        update: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const mockDispatcher = {
      dispatch: jest.fn().mockResolvedValue(true),
    };

    const mockRazorpay = {
      name: 'razorpay',
      verifySignature: jest.fn(),
      parseEvent: jest.fn(),
    };

    const mockCloudflare = {
      name: 'cloudflare',
      verifySignature: jest.fn(),
      parseEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookIngestionService,
        { provide: PrismaWriteService, useValue: mockPrismaWrite },
        { provide: WebhookDispatcherService, useValue: mockDispatcher },
        { provide: RazorpayProvider, useValue: mockRazorpay },
        { provide: CloudflareProvider, useValue: mockCloudflare },
      ],
    }).compile();

    service = module.get<WebhookIngestionService>(WebhookIngestionService);
    prismaWrite = module.get(PrismaWriteService) as any;
    dispatcher = module.get(WebhookDispatcherService) as any;
    razorpayProvider = module.get(RazorpayProvider) as any;
  });

  describe('handleIncoming', () => {
    it('should throw BadRequestException if provider is not supported', async () => {
      await expect(service.handleIncoming('unknown', Buffer.from(''), {})).rejects.toThrow();
    });

    it('should throw UnauthorizedException if signature is invalid', async () => {
      razorpayProvider.verifySignature.mockReturnValue(false);

      await expect(service.handleIncoming('razorpay', Buffer.from(''), {})).rejects.toThrow();
    });

    it('should process webhook successfully', async () => {
      const payload = { event: 'payment.captured' };
      const rawBody = Buffer.from(JSON.stringify(payload));
      const headers = { 'x-razorpay-signature': 'valid' };

      razorpayProvider.verifySignature.mockReturnValue(true);
      razorpayProvider.parseEvent.mockReturnValue({
        provider: 'razorpay',
        eventType: 'payment.captured',
        eventId: 'evt_123',
        timestamp: new Date(),
        data: payload,
        targetQueue: 'payments.webhook.queue',
      });

      await service.handleIncoming('razorpay', rawBody, headers);

      expect(razorpayProvider.verifySignature).toHaveBeenCalledWith(rawBody, headers);
      expect(prismaWrite.webhookLog.create).toHaveBeenCalled();
      expect(dispatcher.dispatch).toHaveBeenCalled();
      expect(prismaWrite.webhookLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'log_123' },
          data: expect.objectContaining({ status: 'PROCESSED' }),
        }),
      );
    });
  });
});
