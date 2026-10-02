import { DocumentType } from '@prisma/client';
import { DocumentStorageService } from '../../src/document-storage.service';

describe('DocumentStorageService', () => {
  let service: DocumentStorageService;
  let storage: { upload: jest.Mock; getSignedUrl: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    storage = {
      upload: jest.fn().mockResolvedValue(undefined),
      getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/doc.pdf'),
    };
    configService = {
      get: jest.fn().mockImplementation((key: string, fallback?: string) => fallback),
    };
    service = new DocumentStorageService(storage as any, configService as any);
  });

  it('builds a versioned storage key', () => {
    const key = service.buildStorageKey(DocumentType.INVOICE, 'pay-123', 2, 'NL-INV-2026-000001');
    expect(key).toBe('invoices/pay-123/v2/NL-INV-2026-000001.pdf');
  });

  it('scopes storage key under the issued user account when provided', () => {
    const key = service.buildStorageKey(
      DocumentType.INVOICE,
      'pay-123',
      2,
      'NL-INV-2026-000001',
      'pdf',
      'user-abc',
    );
    expect(key).toBe('users/user-abc/documents/invoices/pay-123/v2/NL-INV-2026-000001.pdf');
  });

  it('uploads buffer and returns hash and size', async () => {
    const buffer = Buffer.from('pdf-content');
    const result = await service.upload(
      'nestlancer-pdfs',
      'invoices/p1/v1/doc.pdf',
      buffer,
      'application/pdf',
    );

    expect(storage.upload).toHaveBeenCalledWith(
      'nestlancer-pdfs',
      'invoices/p1/v1/doc.pdf',
      buffer,
      'application/pdf',
      undefined,
    );
    expect(result.fileSize).toBe(buffer.length);
    expect(result.fileHash).toHaveLength(64);
  });

  it('returns signed download URL', async () => {
    const url = await service.getDownloadUrl('nestlancer-pdfs', 'invoices/p1/v1/doc.pdf');
    expect(url).toBe('https://signed.example/doc.pdf');
    expect(storage.getSignedUrl).toHaveBeenCalledWith({
      bucket: 'nestlancer-pdfs',
      key: 'invoices/p1/v1/doc.pdf',
      expiresIn: 900,
    });
  });
});
