import { Test, TestingModule } from '@nestjs/testing';
import { ReportGeneratorService } from '../../../src/services/report-generator.service';
import { AnalyticsWorkerService } from '../../../src/services/analytics-worker.service';
import { StorageService } from '@nestlancer/storage';
import { LoggerService } from '@nestlancer/logger';
import { ConfigService } from '@nestjs/config';
import { PrismaWriteService } from '@nestlancer/database';
import { AnalyticsJobType, Period } from '../../../src/interfaces/analytics-job.interface';

jest.mock('@nestlancer/pdf', () => ({
  buildAnalyticsReportPdf: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
}));

describe('ReportGeneratorService', () => {
  let service: ReportGeneratorService;
  let analyticsWorkerService: jest.Mocked<AnalyticsWorkerService>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportGeneratorService,
        {
          provide: AnalyticsWorkerService,
          useValue: { getLatest: jest.fn() },
        },
        {
          provide: StorageService,
          useValue: { upload: jest.fn() },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((_key: string, defaultValue?: any) => defaultValue),
          },
        },
        {
          provide: PrismaWriteService,
          useValue: {
            reportExport: { create: jest.fn().mockResolvedValue({}) },
          },
        },
      ],
    }).compile();

    service = module.get<ReportGeneratorService>(ReportGeneratorService);
    analyticsWorkerService = module.get(AnalyticsWorkerService);
    storageService = module.get(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateComprehensiveReport', () => {
    it('should generate and upload a PDF report', async () => {
      // Mock data for the report
      analyticsWorkerService.getLatest.mockResolvedValueOnce({
        data: { statuses: { ACTIVE: 1 }, totalRevenue: 100 },
      } as any); // project
      analyticsWorkerService.getLatest.mockResolvedValueOnce({
        data: { total: 50, roles: {} },
      } as any); // user
      analyticsWorkerService.getLatest.mockResolvedValueOnce({
        data: { statuses: { COMPLETED: { count: 10, amount: 100 } } },
      } as any); // revenue

      storageService.upload.mockResolvedValue({ url: 'http://test.url' } as any);

      const result = await service.generateComprehensiveReport(Period.MONTHLY);

      expect(analyticsWorkerService.getLatest).toHaveBeenCalledWith(AnalyticsJobType.PROJECT_STATS);
      expect(analyticsWorkerService.getLatest).toHaveBeenCalledWith(AnalyticsJobType.USER_STATS);
      expect(analyticsWorkerService.getLatest).toHaveBeenCalledWith(
        AnalyticsJobType.REVENUE_REPORT,
      );

      expect(storageService.upload).toHaveBeenCalled();
      expect(result).toBe('http://test.url');
    });

    it('should generate report successfully even with missing data', async () => {
      analyticsWorkerService.getLatest.mockResolvedValue(null);
      storageService.upload.mockResolvedValue({ url: 'http://test.url.missing' } as any);

      const result = await service.generateComprehensiveReport(Period.YEARLY);

      expect(storageService.upload).toHaveBeenCalled();
      expect(result).toBe('http://test.url.missing');
    });
  });
});
