import { Test, TestingModule } from '@nestjs/testing';
import { DocumentType } from '@prisma/client';
import { SystemLogsService } from '../../../src/services/system-logs.service';
import { PrismaReadService } from '@nestlancer/database';
import { DocumentGenerationService } from '@nestlancer/documents';
import { QueryLogsDto } from '../../../src/dto/query-logs.dto';

describe('SystemLogsService', () => {
  let service: SystemLogsService;
  let prismaRead: jest.Mocked<PrismaReadService>;
  let documentGen: { storeBinary: jest.Mock };

  beforeEach(async () => {
    documentGen = {
      storeBinary: jest.fn().mockResolvedValue({
        documentNumber: 'NL-EXP-LOG-2026-000001',
        downloadUrl: 'http://internal/example.csv',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemLogsService,
        {
          provide: PrismaReadService,
          useValue: {
            auditLog: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: DocumentGenerationService,
          useValue: documentGen,
        },
      ],
    }).compile();

    service = module.get<SystemLogsService>(SystemLogsService);
    prismaRead = module.get(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queryLogs', () => {
    it('should query logs effectively', async () => {
      const mockLogs = [
        { createdAt: new Date(), category: 'INFO', resourceType: 'auth', description: 'Log in' },
      ];
      (prismaRead.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs as any);
      (prismaRead.auditLog.count as jest.Mock).mockResolvedValue(1);

      const dto: QueryLogsDto = { page: 1, limit: 10, level: 'info', service: 'auth' } as any;
      const result = await service.queryLogs(dto);

      expect(prismaRead.auditLog.findMany).toHaveBeenCalledWith({
        where: { category: 'INFO', resourceType: 'auth' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });

      expect(result.total).toBe(1);
      expect(result.data.length).toBe(1);
      expect(result.data[0].level).toBe('INFO');
    });
  });

  describe('generateDownloadLink', () => {
    it('should generate download payload with inline base64 content', async () => {
      (prismaRead.auditLog.findMany as jest.Mock).mockResolvedValue([
        {
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          category: 'INFO',
          resourceType: 'auth',
          description: 'hello',
          userId: 'u1',
          action: 'LOGIN',
        },
      ]);

      const dto: QueryLogsDto = {};
      const result = await service.generateDownloadLink(dto);

      expect(documentGen.storeBinary).toHaveBeenCalledWith(
        expect.objectContaining({
          documentType: DocumentType.EXPORT_LOGS,
          mimeType: 'text/csv',
          extension: 'csv',
        }),
      );
      expect(result.status).toBe('COMPLETED');
      expect(result.downloadUrl).toBe('http://internal/example.csv');
      expect(result.contentBase64).toBeTruthy();
      expect(result.mimeType).toBe('text/csv');
      expect(Buffer.from(result.contentBase64, 'base64').toString('utf8')).toContain('hello');
    });
  });
});
