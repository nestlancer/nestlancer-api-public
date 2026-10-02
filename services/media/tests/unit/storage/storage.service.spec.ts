import { Test, TestingModule } from '@nestjs/testing';
import { MediaStorageService } from '../../../src/storage/storage.service';
import { StorageService as LibStorageService } from '@nestlancer/storage';

describe('MediaStorageService', () => {
  let service: MediaStorageService;
  let mockStorageProvider: any;

  beforeEach(async () => {
    mockStorageProvider = {
      getSignedUrl: jest.fn().mockResolvedValue('https://example.com/url'),
      upload: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      download: jest.fn(),
      exists: jest.fn(),
      getFileSize: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaStorageService,
        {
          provide: LibStorageService,
          useValue: mockStorageProvider,
        },
      ],
    }).compile();

    service = module.get<MediaStorageService>(MediaStorageService);
  });

  describe('generateStorageKey', () => {
    it('should generate a structured key', () => {
      const key = service.generateStorageKey('user-1', 'photo.png');
      expect(key).toContain('users/user-1/');
      expect(key).toContain('.png');
    });
  });

  describe('generatePresignedUploadUrl', () => {
    it('should call S3 with correct params', async () => {
      const result = await service.generatePresignedUploadUrl('key', 'image/png');
      expect(result).toBe('https://example.com/url');
      expect(mockStorageProvider.getSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'put',
          contentType: 'image/png',
        }),
      );
    });
  });

  describe('generatePresignedDownloadUrl', () => {
    it('should return download URL', async () => {
      const result = await service.generatePresignedDownloadUrl('key');
      expect(result).toBe('https://example.com/url');
      expect(mockStorageProvider.getSignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'get',
        }),
      );
    });
  });

  describe('deleteFile', () => {
    it('should call S3 delete', async () => {
      await service.deleteFile('key');
      expect(mockStorageProvider.delete).toHaveBeenCalled();
    });
  });

  describe('getFileSize', () => {
    it('should return 0 (as implemented)', async () => {
      const result = await service.getFileSize('key');
      expect(result).toBe(0);
    });
  });
});
