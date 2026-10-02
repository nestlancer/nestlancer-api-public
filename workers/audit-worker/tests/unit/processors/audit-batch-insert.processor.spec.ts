import { Test, TestingModule } from '@nestjs/testing';
import { AuditBatchInsertProcessor } from '../../../src/processors/audit-batch-insert.processor';
import { PrismaWriteService } from '@nestlancer/database';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditEntry } from '../../../src/interfaces/audit-job.interface';
import * as fs from 'fs';

jest.mock('fs', () => ({
  promises: {
    appendFile: jest.fn(),
  },
}));

describe('AuditBatchInsertProcessor', () => {
  let processor: AuditBatchInsertProcessor;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditBatchInsertProcessor,
        {
          provide: PrismaWriteService,
          useValue: {
            auditLog: { createMany: jest.fn() },
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('/tmp/test-fallback.jsonl') },
        },
      ],
    }).compile();

    processor = module.get<AuditBatchInsertProcessor>(AuditBatchInsertProcessor);
    prismaWrite = module.get(PrismaWriteService);
    configService = module.get(ConfigService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('insertBatch', () => {
    it('should skip if batch is empty', async () => {
      await processor.insertBatch([]);
      expect(prismaWrite.auditLog.createMany).not.toHaveBeenCalled();
    });

    it('should insert batch of audit logs', async () => {
      const batch: AuditEntry[] = [
        {
          action: 'CREATE',
          category: 'USER_MANAGEMENT',
          description: 'Created user',
          resourceType: 'User',
          resourceId: 'user1',
          userId: 'admin1',
          ip: '127.0.0.1',
          userAgent: 'Jest',
        },
      ];

      await processor.insertBatch(batch);

      expect(prismaWrite.auditLog.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            action: 'CREATE',
            resourceType: 'User',
            resourceId: 'user1',
          }),
        ]),
      });
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        'Successfully inserted batch of 1 audit entries.',
      );
    });

    it('should handle prisma errors and fallback to file', async () => {
      const batch: AuditEntry[] = [
        {
          action: 'CREATE',
          category: 'USER_MANAGEMENT',
          resourceType: 'User',
          resourceId: 'user1',
        } as any,
      ];
      (prismaWrite.auditLog.createMany as jest.Mock).mockRejectedValue(new Error('Db Error'));
      (fs.promises.appendFile as jest.Mock).mockResolvedValue(true);

      await processor.insertBatch(batch);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to insert audit batch: Db Error'),
        expect.any(String),
      );
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Writing 1 entries to fallback file: /tmp/test-fallback.jsonl',
      );
      expect(fs.promises.appendFile).toHaveBeenCalledWith(
        '/tmp/test-fallback.jsonl',
        expect.any(String),
      );
    });

    it('should log critical error if fallback file write fails', async () => {
      const batch: AuditEntry[] = [
        {
          action: 'CREATE',
          category: 'USER_MANAGEMENT',
          resourceType: 'User',
          resourceId: 'user1',
        } as any,
      ];
      (prismaWrite.auditLog.createMany as jest.Mock).mockRejectedValue(new Error('Db Error'));
      (fs.promises.appendFile as jest.Mock).mockRejectedValue(new Error('File Error'));

      await processor.insertBatch(batch);

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'CRITICAL: Failed to write to fallback file: File Error',
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Audit fallback data:',
        expect.any(String),
      );
    });
  });
});
