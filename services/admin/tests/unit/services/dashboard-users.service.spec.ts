import { Test, TestingModule } from '@nestjs/testing';
import { DashboardUsersService } from '../../../src/services/dashboard-users.service';
import { HttpService } from '@nestjs/axios';
import { PrismaReadService } from '@nestlancer/database';

describe('DashboardUsersService', () => {
  let service: DashboardUsersService;
  let prismaRead: jest.Mocked<PrismaReadService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardUsersService,
        {
          provide: HttpService,
          useValue: {},
        },
        {
          provide: PrismaReadService,
          useValue: {
            user: {
              count: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DashboardUsersService>(DashboardUsersService);
    prismaRead = module.get(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserMetrics', () => {
    it('should return various user metrics', async () => {
      (prismaRead.user.count as jest.Mock)
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(180) // active
        .mockResolvedValueOnce(15) // newThisPeriod
        .mockResolvedValueOnce(10) // previousNew
        .mockResolvedValueOnce(190) // users
        .mockResolvedValueOnce(10); // admins

      const result = await service.getUserMetrics();

      expect(result.total).toBe(200);
      expect(result.active).toBe(180);
      expect(result.newThisMonth).toBe(15);
      expect(result.byRole.user).toBe(190);
      expect(result.byRole.admin).toBe(10);
      expect(Array.isArray(result.chartData)).toBe(true);
      expect(result.trend?.current).toBe(15);
    });
  });

  describe('getUserOverview', () => {
    it('should return user overview counts', async () => {
      (prismaRead.user.count as jest.Mock)
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(180) // active
        .mockResolvedValueOnce(15) // new
        .mockResolvedValueOnce(5) // previous
        .mockResolvedValueOnce(190)
        .mockResolvedValueOnce(10);

      const result = await service.getUserOverview('MONTH');

      expect(result.total).toBe(200);
      expect(result.newThisMonth).toBe(15);
      expect(result.trend.current).toBe(15);
      expect(Array.isArray(result.chartData)).toBe(true);
    });
  });
});
