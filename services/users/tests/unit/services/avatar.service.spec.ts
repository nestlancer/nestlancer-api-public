import { AvatarService } from '../../../src/services/avatar.service';

describe('AvatarService', () => {
  let service: AvatarService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockStorageService: any;
  let mockConfig: any;

  beforeEach(() => {
    mockPrismaRead = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', avatar: 'old-avatar-url' }),
      },
    };
    mockPrismaWrite = {
      user: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    mockStorageService = {
      upload: jest
        .fn()
        .mockResolvedValue({ url: 'https://cdn.example.com/avatars/user-1/avatar_123' }),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, any> = {
          'usersService.avatar.allowedMimeTypes': ['image/jpeg', 'image/png', 'image/webp'],
          'usersService.avatar.maxSize': 5242880,
          'usersService.avatar.s3Bucket': 'avatars',
        };
        return config[key];
      }),
    };

    service = new AvatarService(mockPrismaWrite, mockPrismaRead, mockStorageService, mockConfig);
  });

  describe('uploadAvatar', () => {
    const mockFile = {
      mimetype: 'image/jpeg',
      size: 1024000,
      buffer: Buffer.from('fake-image-data'),
    } as Express.Multer.File;

    it('should upload avatar successfully', async () => {
      const result = await service.uploadAvatar('user-1', mockFile);
      expect(result.avatarUrl).toBeDefined();
      expect(mockStorageService.upload).toHaveBeenCalled();
      expect(mockPrismaWrite.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
        }),
      );
    });

    it('should reject unsupported file format', async () => {
      const invalidFile = { ...mockFile, mimetype: 'application/pdf' } as Express.Multer.File;

      await expect(service.uploadAvatar('user-1', invalidFile)).rejects.toThrow();
    });

    it('should reject file that is too large', async () => {
      const largeFile = { ...mockFile, size: 10000000 } as Express.Multer.File;

      await expect(service.uploadAvatar('user-1', largeFile)).rejects.toThrow();
    });
  });

  describe('removeAvatar', () => {
    it('should remove avatar when user has one', async () => {
      const result = await service.removeAvatar('user-1');
      expect(result).toBe(true);
      expect(mockPrismaWrite.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { avatar: null },
      });
    });

    it('should handle user without avatar', async () => {
      mockPrismaRead.user.findUnique.mockResolvedValue({ id: 'user-1', avatar: null });

      const result = await service.removeAvatar('user-1');
      expect(result).toBe(true);
      expect(mockPrismaWrite.user.update).not.toHaveBeenCalled();
    });
  });
});
