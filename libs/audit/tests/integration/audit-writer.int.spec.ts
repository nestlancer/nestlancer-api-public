import { Test, TestingModule } from '@nestjs/testing';
import { AuditWriterService } from '../../src/audit-writer.service';
import { AuditRepository } from '../../src/audit.repository';
import { PrismaWriteService } from '@nestlancer/database';

describe('AuditWriterService (Integration)', () => {
  let service: AuditWriterService;
  let repository: AuditRepository;
  let prisma: PrismaWriteService;

  const mockPrisma = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'mocked' }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditWriterService,
        AuditRepository,
        {
          provide: PrismaWriteService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AuditWriterService>(AuditWriterService);
    repository = module.get<AuditRepository>(AuditRepository);
    prisma = module.get<PrismaWriteService>(PrismaWriteService);

    (repository as any).prisma = prisma;
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('should buffer and then flush audit entries', async () => {
    const entry = {
      userId: 'user-1',
      action: 'CREATE',
      resourceType: 'PROJECT',
      resourceId: 'proj-1',
      changes: { status: 'new' },
    };

    // 1. Write to buffer
    await service.write(entry as any);

    // 2. Verify not yet flushed
    expect(mockPrisma.auditLog.createMany).not.toHaveBeenCalled();

    // 3. Force flush
    await service.flush();

    // 4. Verify flushed
    expect(mockPrisma.auditLog.createMany).toHaveBeenCalledTimes(1);
  });

  it('should write direct without buffering', async () => {
    const entry = {
      userId: 'user-2',
      action: 'DELETE',
      resourceType: 'PROJECT',
      resourceId: 'proj-2',
    };

    await service.writeDirect(entry as any);

    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
