import { storageConfigSchema } from '../../../src/schemas/storage.schema';

describe('StorageConfig Schema', () => {
  it('should validate empty input and set defaults', () => {
    const result = storageConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.STORAGE_PROVIDER).toBe('local');
      expect(result.data.STORAGE_BUCKET_PRIVATE).toBe('nestlancer-private');
      expect(result.data.STORAGE_BUCKET_PUBLIC).toBe('nestlancer-public');
      expect(result.data.STORAGE_BUCKET_AVATARS).toBe('nestlancer-avatars');
      expect(result.data.STORAGE_BUCKET_ATTACHMENTS).toBe('nestlancer-requests');
      expect(result.data.STORAGE_BUCKET_QUOTES).toBe('nestlancer-quotes-pdfs');
      expect(result.data.STORAGE_BUCKET_DELIVERABLES).toBe('nestlancer-deliverables');
      expect(result.data.STORAGE_BUCKET_REPORTS).toBe('nestlancer-reports');
      expect(result.data.STORAGE_BUCKET_PDFS).toBe('nestlancer-pdfs');
    }
  });

  it('should strictly respect allowed providers enum', () => {
    const result = storageConfigSchema.safeParse({ STORAGE_PROVIDER: 'invalid-provider' });
    expect(result.success).toBe(false);
  });

  it('should validate with valid provider overrides', () => {
    const result = storageConfigSchema.safeParse({ STORAGE_PROVIDER: 's3' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.STORAGE_PROVIDER).toBe('s3');
    }
  });

  it('should coerce string numbers to numbers during validation', () => {
    const result = storageConfigSchema.safeParse({
      S3_PRESIGNED_URL_EXPIRY: '7200',
      STORAGE_MAX_FILE_SIZE: '500000',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.S3_PRESIGNED_URL_EXPIRY).toBe(7200);
      expect(result.data.STORAGE_MAX_FILE_SIZE).toBe(500000);
    }
  });

  it('should accept S3_LOCAL_ENDPOINT and CDN_PUBLIC_BASE_URL', () => {
    const result = storageConfigSchema.safeParse({
      S3_LOCAL_ENDPOINT: 'http://100.115.123.41:9000',
      CDN_PUBLIC_BASE_URL: 'https://cdn.example.com',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.S3_LOCAL_ENDPOINT).toBe('http://100.115.123.41:9000');
      expect(result.data.CDN_PUBLIC_BASE_URL).toBe('https://cdn.example.com');
    }
  });
});
