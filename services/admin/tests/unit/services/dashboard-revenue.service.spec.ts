import { Test, TestingModule } from '@nestjs/testing';
import { DashboardRevenueService } from '../../../src/services/dashboard-revenue.service';
import { HttpService } from '@nestjs/axios';
import { PrismaReadService } from '@nestlancer/database';

describe('DashboardRevenueService', () => {
  let service: DashboardRevenueService;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardRevenueService,
        {
          provide: HttpService,
          useValue: {},
        },
        {
          provide: PrismaReadService,
          useValue: {
            payment: {
              aggregate: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DashboardRevenueService>(DashboardRevenueService);
    prismaRead = module.get(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRevenue', () => {
    it('should return period revenue with chart and categories', async () => {
      const now = new Date();
      (prismaRead.payment.findMany as jest.Mock).mockResolvedValue([
        {
          amount: 1000,
          paidAt: now,
          createdAt: now,
          method: 'UPI',
          project: { quote: { request: { category: 'Web' } } },
        },
        {
          amount: 500,
          paidAt: now,
          createdAt: now,
          method: 'BANK',
          project: { quote: { request: { category: 'Web' } } },
        },
      ]);

      const result = await service.getRevenue({ period: 'MONTH' as any });

      expect(result.total).toBe(1500);
      expect(result.currency).toBe('INR');
      expect(result.chartData.length).toBeGreaterThan(0);
      expect(result.byCategory).toEqual([{ category: 'Web', amount: 1500 }]);
    });

    it('should default to 0 if no payments', async () => {
      (prismaRead.payment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRevenue({});
      expect(result.total).toBe(0);
      expect(result.byCategory).toEqual([]);
    });
  });

  describe('getRevenueOverview', () => {
    it('should return revenue overview', async () => {
      const now = new Date();
      (prismaRead.payment.findMany as jest.Mock).mockResolvedValue([
        {
          amount: 2000,
          paidAt: now,
          createdAt: now,
          method: null,
          project: { quote: { request: { category: 'Mobile' } } },
        },
      ]);
      const result = await service.getRevenueOverview('MONTH');
      expect(result.total).toBe(2000);
      expect(result.trend.current).toBeGreaterThanOrEqual(0);
    });
  });
});
