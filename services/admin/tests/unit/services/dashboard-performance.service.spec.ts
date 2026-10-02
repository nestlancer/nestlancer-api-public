import { Test, TestingModule } from '@nestjs/testing';
import { DashboardPerformanceService } from '../../../src/services/dashboard-performance.service';
import { HttpService } from '@nestjs/axios';

describe('DashboardPerformanceService', () => {
  let service: DashboardPerformanceService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardPerformanceService,
        {
          provide: HttpService,
          useValue: {
            axiosRef: {
              get: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DashboardPerformanceService>(DashboardPerformanceService);
    httpService = module.get(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPerformance', () => {
    it('should return performance metrics using prometheus data if available', async () => {
      const mockMemVal = 100 * 1024 * 1024; // 100MB
      httpService.axiosRef.get.mockResolvedValue({
        data: {
          data: {
            result: [{ value: ['timestamp', mockMemVal.toString()] }],
          },
        },
      } as any);

      const result = await service.getPerformance();

      expect(httpService.axiosRef.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/query'),
        expect.objectContaining({ timeout: expect.any(Number) }),
      );
      expect(result.memoryUsage).toBe(100);
      expect(result.uptime).toBeDefined();
    });

    it('should return default performance metrics on error', async () => {
      httpService.axiosRef.get.mockRejectedValue(new Error('Network Error'));

      const result = await service.getPerformance();

      expect(result.memoryUsage).toBe(45.2);
    });
  });

  describe('getSystemPerformance', () => {
    it('should return system performance overview', async () => {
      const result = await service.getSystemPerformance();
      expect(result.health).toBe('healthy');
      expect(result.p50).toBe(45);
    });
  });
});
