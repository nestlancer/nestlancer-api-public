import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { BatchCollectorService } from '../../../src/services/batch-collector.service';
import { CdnWorkerService } from '../../../src/services/cdn-worker.service';
import { CloudflareInvalidationService } from '../../../src/services/cloudflare-invalidation.service';

describe('CdnWorkerService', () => {
  let service: CdnWorkerService;
  let configService: jest.Mocked<ConfigService>;
  let cloudflareService: jest.Mocked<CloudflareInvalidationService>;
  let batchCollector: jest.Mocked<BatchCollectorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CdnWorkerService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('cloudflare') },
        },
        {
          provide: CloudflareInvalidationService,
          useValue: { invalidate: jest.fn(), purgeAll: jest.fn() },
        },
        {
          provide: BatchCollectorService,
          useValue: { setFlushCallback: jest.fn(), add: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CdnWorkerService>(CdnWorkerService);
    configService = module.get(ConfigService);
    cloudflareService = module.get(CloudflareInvalidationService);
    batchCollector = module.get(BatchCollectorService);
    // Suppress console output for tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should set flush callback on batch collector', () => {
      service.onModuleInit();
      expect(batchCollector.setFlushCallback).toHaveBeenCalled();
    });
  });

  describe('invalidatePath', () => {
    it('should add path to batch collector', async () => {
      await service.invalidatePath('/test');
      expect(batchCollector.add).toHaveBeenCalledWith('/test');
    });
  });

  describe('invalidateBatch', () => {
    it('should call provider invalidate', async () => {
      cloudflareService.invalidate.mockResolvedValue({
        id: '1',
        status: 'completed',
        paths: ['/test'],
      });
      await service.invalidateBatch(['/test']);
      expect(cloudflareService.invalidate).toHaveBeenCalledWith(['/test']);
    });

    it('should handle errors', async () => {
      cloudflareService.invalidate.mockRejectedValue(new Error('fail'));
      await expect(service.invalidateBatch(['/test'])).rejects.toThrow('fail');
    });
  });

  describe('purgeAll', () => {
    it('should call provider purgeAll', async () => {
      cloudflareService.purgeAll.mockResolvedValue();
      await service.purgeAll();
      expect(cloudflareService.purgeAll).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      cloudflareService.purgeAll.mockRejectedValue(new Error('fail'));
      await expect(service.purgeAll()).rejects.toThrow('fail');
    });
  });
});
