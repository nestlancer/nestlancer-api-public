import { Test, TestingModule } from '@nestjs/testing';
import { WebhookDeliveriesService } from '../../../src/services/webhook-deliveries.service';
import { PrismaReadService } from '@nestlancer/database';
import { QueryWebhookDeliveriesDto } from '../../../src/dto/query-webhook-deliveries.dto';

describe('WebhookDeliveriesService', () => {
  let service: WebhookDeliveriesService;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDeliveriesService,
        {
          provide: PrismaReadService,
          useValue: {
            webhookDelivery: {
              findMany: jest.fn(),
              count: jest.fn(),
              groupBy: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<WebhookDeliveriesService>(WebhookDeliveriesService);
    prismaRead = module.get(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return deliveries with pagination', async () => {
      const mockData = [{ id: '1' }];
      prismaRead.webhookDelivery.findMany.mockResolvedValue(mockData as any);
      prismaRead.webhookDelivery.count.mockResolvedValue(100);

      const query: QueryWebhookDeliveriesDto = { page: 2, limit: 10, status: 'DELIVERED' } as any;
      const result = await service.findAll('wh-1', query);

      expect(prismaRead.webhookDelivery.findMany).toHaveBeenCalledWith({
        where: { webhookId: 'wh-1', status: 'DELIVERED' },
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      expect(result.data).toEqual(mockData);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.totalPages).toBe(10);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
    });
  });

  describe('getDeliveryStats', () => {
    it('should aggregate delivery stats', async () => {
      prismaRead.webhookDelivery.groupBy.mockResolvedValue([
        { status: 'DELIVERED', _count: 50 },
        { status: 'FAILED', _count: 5 },
      ] as any);

      const result = await service.getDeliveryStats('wh-1');

      expect(prismaRead.webhookDelivery.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { webhookId: 'wh-1' },
        _count: true,
      });

      expect(result).toEqual({ DELIVERED: 50, FAILED: 5 });
    });
  });
});
