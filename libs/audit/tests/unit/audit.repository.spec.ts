import { Test, TestingModule } from '@nestjs/testing';
import { AuditRepository } from '../../src/audit.repository';
import { Logger } from '@nestjs/common';

describe('AuditRepository', () => {
  let repository: AuditRepository;
  let mockPrisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditRepository],
    }).compile();

    repository = module.get<AuditRepository>(AuditRepository);

    mockPrisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'new-id' }),
        createMany: jest.fn().mockResolvedValue({ count: 5 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should log warning and return temporary ID if prisma is not set', async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
    const result = await repository.create({ action: 'TEST' });

    expect(result).toContain('audit-');
    expect(loggerSpy).toHaveBeenCalledWith('PrismaService not available — audit entry logged only');
  });

  it('should use prisma to create entry if set', async () => {
    repository.setPrisma(mockPrisma);
    const entry = {
      userId: 'user-1',
      action: 'CREATE',
      resourceType: 'BLOG',
      resourceId: 'blog-1',
    };

    const result = await repository.create(entry);

    expect(result).toBe('new-id');
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });

  it('should use prisma to create batch entries', async () => {
    repository.setPrisma(mockPrisma);
    const entries = [{ action: 'TEST1' }, { action: 'TEST2' }];

    const result = await repository.createBatch(entries);

    expect(result).toBe(5);
    expect(mockPrisma.auditLog.createMany).toHaveBeenCalled();
  });
});
