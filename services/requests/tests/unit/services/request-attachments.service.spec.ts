import { RequestAttachmentsService } from '../../../src/services/request-attachments.service';

describe('RequestAttachmentsService', () => {
  let service: RequestAttachmentsService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockStorageService: any;
  let mockConfig: any;

  const mockAttachment = {
    id: 'att-1',
    filename: 'doc.pdf',
    fileUrl: 'https://cdn.example.com/nestlancer-requests/requests/req-1/doc.pdf',
    storageBucket: 'nestlancer-requests',
    storageKey: 'requests/req-1/doc.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    createdAt: new Date(),
  };

  const mockRequest = {
    id: 'req-1',
    userId: 'user-1',
    status: 'DRAFT',
    attachments: [mockAttachment],
    _count: { attachments: 1 },
  };

  beforeEach(() => {
    mockPrismaRead = {
      projectRequest: { findFirst: jest.fn().mockResolvedValue(mockRequest) },
      requestAttachment: { findFirst: jest.fn().mockResolvedValue(mockAttachment) },
    };
    mockPrismaWrite = {
      projectRequest: { findFirst: jest.fn().mockResolvedValue(mockRequest) },
      requestAttachment: {
        findFirst: jest.fn().mockResolvedValue(mockAttachment),
        create: jest.fn().mockResolvedValue({
          id: 'att-2',
          filename: 'new.pdf',
          fileUrl: 'https://cdn.example.com/nestlancer-requests/requests/req-1/new.pdf',
          storageBucket: 'nestlancer-requests',
          storageKey: 'requests/req-1/new.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          createdAt: new Date(),
        }),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    mockStorageService = {
      upload: jest.fn().mockResolvedValue({
        url: 'https://cdn.example.com/nestlancer-requests/requests/req-1/new.pdf',
        key: 'requests/req-1/new.pdf',
      }),
      delete: jest.fn().mockResolvedValue(undefined),
      getSignedUrl: jest.fn().mockResolvedValue('https://signed.example.com/doc.pdf'),
    };
    mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, any> = {
          'requestsService.attachments.maxCount': 10,
          'requestsService.attachments.allowedMimeTypes': ['application/pdf', 'image/jpeg'],
          'requestsService.attachments.maxSize': 10485760,
          'requestsService.attachments.s3Bucket': 'nestlancer-requests',
        };
        return config[key];
      }),
    };

    service = new RequestAttachmentsService(
      mockPrismaWrite,
      mockPrismaRead,
      mockStorageService,
      mockConfig,
    );
  });

  describe('getAttachments', () => {
    it('should return formatted attachments list without raw url', async () => {
      const result = await service.getAttachments('user-1', 'req-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'att-1',
        filename: 'doc.pdf',
        type: 'application/pdf',
        size: 1024,
        uploadedAt: mockAttachment.createdAt,
      });
      expect(result[0]).not.toHaveProperty('url');
    });

    it('should throw for non-existent request', async () => {
      mockPrismaWrite.projectRequest.findFirst.mockResolvedValue(null);
      await expect(service.getAttachments('user-1', 'invalid')).rejects.toThrow();
    });
  });

  describe('getAttachmentDownloadUrl', () => {
    it('should return presigned download url', async () => {
      const result = await service.getAttachmentDownloadUrl('user-1', 'req-1', 'att-1');
      expect(result.downloadUrl).toBe('https://signed.example.com/doc.pdf');
      expect(result.expiresIn).toBe(3600);
      expect(mockStorageService.getSignedUrl).toHaveBeenCalledWith({
        bucket: 'nestlancer-requests',
        key: 'requests/req-1/doc.pdf',
        operation: 'get',
        expiresIn: 3600,
      });
    });
  });

  describe('addAttachment', () => {
    const mockFile = {
      mimetype: 'application/pdf',
      size: 2048,
      buffer: Buffer.from('data'),
      originalname: 'new.pdf',
    } as Express.Multer.File;

    it('should add attachment successfully', async () => {
      const result = await service.addAttachment('user-1', 'req-1', mockFile);
      expect(result.id).toBe('att-2');
      expect(result).not.toHaveProperty('url');
      expect(mockStorageService.upload).toHaveBeenCalled();
    });

    it('should reject when request is not in DRAFT status', async () => {
      mockPrismaWrite.projectRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        status: 'SUBMITTED',
      });
      await expect(service.addAttachment('user-1', 'req-1', mockFile)).rejects.toThrow();
    });

    it('should reject when max attachments reached', async () => {
      mockPrismaWrite.projectRequest.findFirst.mockResolvedValue({
        ...mockRequest,
        _count: { attachments: 10 },
      });
      await expect(service.addAttachment('user-1', 'req-1', mockFile)).rejects.toThrow();
    });

    it('should reject unsupported file type', async () => {
      const badFile = { ...mockFile, mimetype: 'application/exe' } as Express.Multer.File;
      await expect(service.addAttachment('user-1', 'req-1', badFile)).rejects.toThrow();
    });

    it('should reject file too large', async () => {
      const largeFile = { ...mockFile, size: 20000000 } as Express.Multer.File;
      await expect(service.addAttachment('user-1', 'req-1', largeFile)).rejects.toThrow();
    });
  });

  describe('removeAttachment', () => {
    it('should remove attachment successfully', async () => {
      const result = await service.removeAttachment('user-1', 'req-1', 'att-1');
      expect(result).toBe(true);
      expect(mockPrismaWrite.requestAttachment.delete).toHaveBeenCalledWith({
        where: { id: 'att-1' },
      });
      expect(mockStorageService.delete).toHaveBeenCalledWith(
        'nestlancer-requests',
        'requests/req-1/doc.pdf',
      );
    });

    it('should throw for non-existent attachment', async () => {
      mockPrismaWrite.requestAttachment.findFirst.mockResolvedValue(null);
      await expect(service.removeAttachment('user-1', 'req-1', 'invalid')).rejects.toThrow();
    });
  });
});
