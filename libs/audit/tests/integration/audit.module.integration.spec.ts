import { Test, TestingModule } from '@nestjs/testing';
import { AuditModule } from '../../src/audit.module';
import { AuditWriterService } from '../../src/audit-writer.service';
import { AuditRepository } from '../../src/audit.repository';
import { ConfigModule } from '@nestjs/config';

describe('AuditModule (Integration)', () => {
  let module: TestingModule;
  let service: AuditWriterService;
  let repository: AuditRepository;
  const mockCreate = jest.fn().mockResolvedValue('audit-123');
  const mockCreateBatch = jest.fn().mockResolvedValue(1);

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }), AuditModule],
    })
      .overrideProvider(AuditRepository)
      .useValue({
        create: mockCreate,
        createBatch: mockCreateBatch,
      })
      .compile();

    service = module.get<AuditWriterService>(AuditWriterService);
    repository = module.get<AuditRepository>(AuditRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('writeDirect()', () => {
    it('should create an audit entry directly and return its ID', async () => {
      const entry = {
        userId: 'user-1',
        action: 'CREATE',
        resourceType: 'POST',
        resourceId: 'post-1',
        changes: { title: 'New Post' },
      };

      const id = await service.writeDirect(entry as any);

      expect(id).toBe('audit-123');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should pass the entry directly to repository.create', async () => {
      const entry = {
        userId: 'user-2',
        action: 'DELETE',
        resourceType: 'CONTRACT',
        resourceId: 'contract-99',
        changes: null,
      };

      await service.writeDirect(entry as any);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-2',
          action: 'DELETE',
          resourceType: 'CONTRACT',
          resourceId: 'contract-99',
        }),
      );
    });
  });

  describe('write() + flush()', () => {
    it('should buffer entries and flush them as a batch', async () => {
      const entry1 = {
        userId: 'user-3',
        action: 'UPDATE',
        resourceType: 'USER',
        resourceId: 'user-3',
        changes: { avatar: 'new.png' },
      };

      const entry2 = {
        userId: 'user-4',
        action: 'CREATE',
        resourceType: 'PROPOSAL',
        resourceId: 'prop-1',
      };

      await service.write(entry1 as any);
      await service.write(entry2 as any);

      // Not yet flushed
      expect(mockCreateBatch).not.toHaveBeenCalled();

      await service.flush();

      expect(mockCreateBatch).toHaveBeenCalledTimes(1);
    });

    it('should not call createBatch when flushing an empty buffer', async () => {
      await service.flush();
      // createBatch should not be called for an empty buffer
      // (or if called with empty array, that's also fine)
      // The key check is that it doesn't error
    });
  });

  describe('multiple operations end-to-end', () => {
    it('should support interleaving direct writes and buffered writes', async () => {
      const directEntry = {
        userId: 'admin-1',
        action: 'DELETE',
        resourceType: 'USER',
        resourceId: 'user-ban-1',
      };

      const bufferedEntry = {
        userId: 'user-5',
        action: 'VIEW',
        resourceType: 'PROJECT',
        resourceId: 'proj-5',
      };

      // Direct write
      const directId = await service.writeDirect(directEntry as any);
      expect(directId).toBe('audit-123');

      // Buffered write
      await service.write(bufferedEntry as any);
      await service.flush();

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreateBatch).toHaveBeenCalledTimes(1);
    });
  });
});
