import { StorageService } from '../../src/storage.service';
import { StorageProvider } from '../../src/interfaces/storage.interface';
import { LocalProvider } from '../../src/providers/local.provider';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageModule } from '../../src/storage.module';

describe('StorageIntegration', () => {
  let storageService: StorageService;
  let provider: StorageProvider;
  const testBucket = 'test-int-bucket';
  const basePath = join(process.cwd(), 'tmp', 'storage-int');

  beforeAll(async () => {
    // Use LocalProvider for integration tests to avoid real AWS/R2 bills
    provider = new LocalProvider({ basePath });

    storageService = new StorageService({ provider: 'local' }, {}, { basePath });

    storageService.onModuleInit();

    await fs.mkdir(basePath, { recursive: true }).catch(() => {});
  });

  afterAll(async () => {
    await fs.rm(basePath, { recursive: true, force: true }).catch(() => {});
  });

  it('should upload, check existence, download, and delete a file', async () => {
    const testKey = 'integration-test.txt';
    const fileContent = Buffer.from('Integration test content');

    // 1. Upload
    const uploadResult = await storageService.upload(
      testBucket,
      testKey,
      fileContent,
      'text/plain',
    );
    expect(uploadResult.key).toBe(testKey);
    expect(uploadResult.size).toBe(fileContent.length);

    // 2. Exists
    const exists = await storageService.exists(testBucket, testKey);
    expect(exists).toBe(true);

    // 3. Download
    const downloadedBuffer = await storageService.download(testBucket, testKey);
    expect(downloadedBuffer.toString()).toBe('Integration test content');

    // 4. Delete
    await storageService.delete(testBucket, testKey);

    // 5. Exists check after delete
    const existsAfterDelete = await storageService.exists(testBucket, testKey);
    expect(existsAfterDelete).toBe(false);
  });
});
