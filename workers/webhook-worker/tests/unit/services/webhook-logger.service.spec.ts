import { Test, TestingModule } from '@nestjs/testing';
import { WebhookLoggerService } from '../../../src/services/webhook-logger.service';
import { PrismaWriteService } from '@nestlancer/database';

describe('WebhookLoggerService', () => {
  let service: WebhookLoggerService;
  let prismaWrite: jest.Mocked<PrismaWriteService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookLoggerService,
        {
          provide: PrismaWriteService,
          useValue: { webhookDelivery: { create: jest.fn() } },
        },
      ],
    }).compile();

    service = module.get<WebhookLoggerService>(WebhookLoggerService);
    prismaWrite = module.get(PrismaWriteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logDelivery', () => {
    it('should log successful delivery', async () => {
      prismaWrite.webhookDelivery.create.mockResolvedValue({} as any);

      const result = { statusCode: 200, responseBody: 'OK', responseTime: 120, attempt: 1 };
      await service.logDelivery('w1', 'event.name', { data: 1 }, result);

      expect(prismaWrite.webhookDelivery.create).toHaveBeenCalledWith({
        data: {
          webhookId: 'w1',
          event: 'event.name',
          payload: { data: 1 },
          statusCode: 200,
          responseBody: 'OK',
          responseTime: 120,
          attempts: 1,
          status: 'SUCCESS',
        },
      });
    });

    it('should log failed delivery (status code < 200 or >= 300)', async () => {
      prismaWrite.webhookDelivery.create.mockResolvedValue({} as any);

      const result = {
        statusCode: 500,
        responseBody: 'Internal Error',
        responseTime: 50,
        attempt: 2,
      };
      await service.logDelivery('w1', 'event.name', { data: 1 }, result);

      expect(prismaWrite.webhookDelivery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );

      const result400 = {
        statusCode: 400,
        responseBody: 'Bad request',
        responseTime: 50,
        attempt: 2,
      };
      await service.logDelivery('w2', 'event.name', { data: 1 }, result400);

      expect(prismaWrite.webhookDelivery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });
  });
});
