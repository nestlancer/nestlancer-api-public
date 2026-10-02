import { Test, TestingModule } from '@nestjs/testing';
import { AuditWriterService } from '../../src/audit-writer.service';
import { AuditRepository } from '../../src/audit.repository';
import { AuditEntry } from '../../src/interfaces/audit-entry.interface';

describe('AuditWriterService', () => {
  let service: AuditWriterService;
  let module: TestingModule;

  const mockRepository = {
    create: jest.fn().mockResolvedValue('audit-id'),
    createBatch: jest.fn().mockResolvedValue(2),
  };

  const previousBatchSize = process.env.AUDIT_WORKER_BATCH_SIZE;
  const previousFlushInterval = process.env.AUDIT_WORKER_FLUSH_INTERVAL;

  beforeEach(async () => {
    process.env.AUDIT_WORKER_BATCH_SIZE = '50';
    process.env.AUDIT_WORKER_FLUSH_INTERVAL = '5000';
    jest.useFakeTimers();

    module = await Test.createTestingModule({
      providers: [AuditWriterService, { provide: AuditRepository, useValue: mockRepository }],
    }).compile();

    service = module.get<AuditWriterService>(AuditWriterService);
    mockRepository.create.mockReset().mockResolvedValue('audit-id');
    mockRepository.createBatch.mockReset().mockResolvedValue(2);
  });

  afterEach(async () => {
    service.onModuleDestroy();
    await module.close();
    jest.useRealTimers();

    if (previousBatchSize === undefined) {
      delete process.env.AUDIT_WORKER_BATCH_SIZE;
    } else {
      process.env.AUDIT_WORKER_BATCH_SIZE = previousBatchSize;
    }

    if (previousFlushInterval === undefined) {
      delete process.env.AUDIT_WORKER_FLUSH_INTERVAL;
    } else {
      process.env.AUDIT_WORKER_FLUSH_INTERVAL = previousFlushInterval;
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should buffer entries and not flush immediately', async () => {
    const entry: AuditEntry = {
      userId: 'user-1',
      action: 'UPDATE',
      resourceType: 'PROJECT',
      resourceId: 'proj-1',
    };

    await service.write(entry);

    expect(mockRepository.createBatch).not.toHaveBeenCalled();
  });

  it('should flush when batch size is reached', async () => {
    const entry: AuditEntry = {
      userId: 'user-1',
      action: 'UPDATE',
      resourceType: 'PROJECT',
      resourceId: 'proj-1',
    };

    for (let i = 0; i < 50; i++) {
      await service.write(entry);
    }

    expect(mockRepository.createBatch).toHaveBeenCalledTimes(1);
    expect(mockRepository.createBatch).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ action: 'UPDATE' })]),
    );
    expect(mockRepository.createBatch.mock.calls[0][0]).toHaveLength(50);
  });

  it('should flush on interval', async () => {
    const entry: AuditEntry = {
      userId: 'user-1',
      action: 'UPDATE',
      resourceType: 'PROJECT',
      resourceId: 'proj-1',
    };

    await service.write(entry);

    await jest.advanceTimersByTimeAsync(5000);

    expect(mockRepository.createBatch).toHaveBeenCalledTimes(1);
  });

  it('should write direct without buffering', async () => {
    const entry: AuditEntry = {
      userId: 'user-1',
      action: 'DELETE',
      resourceType: 'USER',
      resourceId: 'user-2',
    };

    const result = await service.writeDirect(entry);

    expect(result).toBe('audit-id');
    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
      }),
    );
  });

  it('should re-add to buffer on flush failure', async () => {
    mockRepository.createBatch.mockRejectedValueOnce(new Error('DB Error'));

    const entry: AuditEntry = {
      userId: 'user-1',
      action: 'UPDATE',
      resourceType: 'PROJECT',
      resourceId: 'proj-1',
    };

    await service.write(entry);
    await service.flush();

    expect(mockRepository.createBatch).toHaveBeenCalled();
    expect((service as any).buffer).toContain(entry);
  });
});
