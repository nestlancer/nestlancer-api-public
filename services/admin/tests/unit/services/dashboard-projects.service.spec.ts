import { Test, TestingModule } from '@nestjs/testing';
import { DashboardProjectsService } from '../../../src/services/dashboard-projects.service';
import { HttpService } from '@nestjs/axios';
import { PrismaReadService } from '@nestlancer/database';

describe('DashboardProjectsService', () => {
  let service: DashboardProjectsService;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardProjectsService,
        {
          provide: HttpService,
          useValue: {},
        },
        {
          provide: PrismaReadService,
          useValue: {
            project: {
              count: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DashboardProjectsService>(DashboardProjectsService);
    prismaRead = module.get(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProjectMetrics', () => {
    it('should return project counts correctly', async () => {
      (prismaRead.project.count as jest.Mock).mockImplementation(async (args?: any) => {
        if (args?.where?.createdAt) return 8;
        if (args?.where?.status === 'IN_PROGRESS') return 50;
        if (args?.where?.status === 'COMPLETED') return 30;
        if (args?.where?.status === 'ON_HOLD') return 10;
        if (args?.where?.status === 'CANCELLED') return 10;
        if (args?.where?.deletedAt === null && !args?.where?.status) return 100;
        if (!args?.where) return 100;
        return 0;
      });
      (prismaRead.project.findMany as jest.Mock).mockResolvedValue([
        {
          createdAt: new Date('2026-01-01'),
          startDate: new Date('2026-01-01'),
          completedAt: new Date('2026-02-12'),
          targetEndDate: new Date('2026-02-28'),
        },
      ]);

      const metrics = await service.getProjectMetrics();

      expect(metrics.total).toBe(100);
      expect(metrics.byStatus.ACTIVE).toBe(50);
      expect(metrics.byStatus.COMPLETED).toBe(30);
      expect(metrics.avgCompletionTimeDays).toBeGreaterThan(0);
      expect(metrics.onTimeRate).toBe(100);
    });
  });

  describe('getProjectOverview', () => {
    it('should return overview counts correctly', async () => {
      (prismaRead.project.count as jest.Mock).mockResolvedValue(10);
      (prismaRead.project.findMany as jest.Mock).mockResolvedValue([]);
      const overview = await service.getProjectOverview('MONTH');
      expect(overview.active).toBe(10);
      expect(overview.completed).toBe(10);
      expect(overview.byStatus.pendingPayment).toBe(10);
      expect(overview.avgCompletionTimeDays).toBe(0);
    });
  });
});
