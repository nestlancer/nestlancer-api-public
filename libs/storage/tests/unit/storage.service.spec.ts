import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../../src/storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let mockProvider: any;

  beforeEach(async () => {
    mockProvider = {
      upload: jest.fn().mockResolvedValue({ key: 'test', url: 'http://test.com' }),
      download: jest.fn().mockResolvedValue(Buffer.from('test')),
      delete: jest.fn().mockResolvedValue(undefined),
      getSignedUrl: jest.fn().mockResolvedValue('http://signed.com'),
      exists: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'STORAGE_OPTIONS',
          useValue: { provider: 'local' },
        },
        { provide: 'S3_CONFIG', useValue: {} },
        { provide: 'LOCAL_STORAGE_CONFIG', useValue: {} },
        StorageService,
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    (service as any).provider = mockProvider;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call upload on provider', async () => {
    const result = await service.upload('b', 'k', Buffer.from(''), 'text/plain');
    expect(result).toEqual({ key: 'test', url: 'http://test.com' });
    expect(mockProvider.upload).toHaveBeenCalled();
  });

  it('should call download on provider', async () => {
    const result = await service.download('b', 'k');
    expect(result.toString()).toBe('test');
    expect(mockProvider.download).toHaveBeenCalled();
  });
});
