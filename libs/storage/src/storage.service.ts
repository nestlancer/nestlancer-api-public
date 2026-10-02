import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import {
  UploadResult,
  SignedUrlOptions,
  StorageProvider,
  StorageModuleOptions,
} from './interfaces/storage.interface';
import { LocalProvider } from './providers/local.provider';
import { S3Provider } from './providers/s3.provider';

import { Readable } from 'stream';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private provider!: StorageProvider;
  private primaryProvider?: StorageProvider;
  private fallbackProvider?: StorageProvider;

  constructor(
    @Inject('STORAGE_OPTIONS') private readonly options: StorageModuleOptions,
    @Inject('S3_CONFIG') private readonly s3Config: any,
    @Inject('LOCAL_STORAGE_CONFIG') private readonly localConfig: any,
  ) {}

  onModuleInit(): void {
    const local = new LocalProvider(this.localConfig);

    switch (this.options.provider) {
      case 's3':
        this.primaryProvider = new S3Provider(this.s3Config);
        this.fallbackProvider = local;
        this.provider = this.primaryProvider;
        break;
      case 'local':
      default:
        this.provider = local;
        break;
    }
    this.logger.log(`StorageService initialized with provider: ${this.options.provider}`);
  }

  async upload(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string,
    metadata?: Record<string, any>,
  ): Promise<UploadResult> {
    if (this.options.provider === 's3' && this.primaryProvider && this.fallbackProvider) {
      try {
        return await this.primaryProvider.upload(bucket, key, body, contentType, metadata);
      } catch (error: any) {
        this.logger.warn(
          `Cloud storage upload failed for bucket ${bucket}, falling back to local: ${error.message}`,
        );
        return await this.fallbackProvider.upload(bucket, key, body, contentType, {
          ...metadata,
          needsSync: true,
        });
      }
    }
    return this.provider.upload(bucket, key, body, contentType, metadata);
  }

  async download(bucket: string, key: string): Promise<Buffer> {
    return this.provider.download(bucket, key);
  }

  async downloadStream(bucket: string, key: string): Promise<Readable> {
    return this.provider.downloadStream(bucket, key);
  }

  async delete(bucket: string, key: string): Promise<void> {
    return this.provider.delete(bucket, key);
  }

  async getSignedUrl(options: SignedUrlOptions): Promise<string> {
    return this.provider.getSignedUrl(options);
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    return this.provider.exists(bucket, key);
  }

  async checkConnection(): Promise<void> {
    await this.provider.checkConnection();
  }

  /**
   * Returns the primary and fallback providers.
   * Useful for background synchronization tasks.
   */
  getProviders(): { primary?: StorageProvider; fallback?: StorageProvider } {
    return {
      primary: this.primaryProvider,
      fallback: this.fallbackProvider,
    };
  }

  async getFileSize(bucket: string, key: string): Promise<number> {
    if (typeof this.provider.getFileSize === 'function') {
      return this.provider.getFileSize(bucket, key);
    }
    return 0;
  }

  async copyObject(
    bucket: string,
    sourceKey: string,
    destinationKey: string,
  ): Promise<{ key: string }> {
    if (typeof this.provider.copyObject === 'function') {
      return this.provider.copyObject(bucket, sourceKey, destinationKey);
    }
    const body = await this.download(bucket, sourceKey);
    await this.upload(bucket, destinationKey, body, 'application/octet-stream');
    return { key: destinationKey };
  }

  async createMultipartUpload(
    bucket: string,
    key: string,
    contentType: string,
  ): Promise<{ uploadId: string }> {
    if (typeof this.provider.createMultipartUpload !== 'function') {
      throw new Error('Multipart upload is not supported by the configured storage provider');
    }
    return this.provider.createMultipartUpload(bucket, key, contentType);
  }

  async getSignedPartUploadUrl(
    bucket: string,
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn?: number,
  ): Promise<string> {
    if (typeof this.provider.getSignedPartUploadUrl !== 'function') {
      throw new Error('Multipart upload is not supported by the configured storage provider');
    }
    return this.provider.getSignedPartUploadUrl(bucket, key, uploadId, partNumber, expiresIn);
  }

  async completeMultipartUpload(
    bucket: string,
    key: string,
    uploadId: string,
    parts: { partNumber: number; etag: string }[],
  ): Promise<void> {
    if (typeof this.provider.completeMultipartUpload !== 'function') {
      throw new Error('Multipart upload is not supported by the configured storage provider');
    }
    return this.provider.completeMultipartUpload(bucket, key, uploadId, parts);
  }

  async abortMultipartUpload(bucket: string, key: string, uploadId: string): Promise<void> {
    if (typeof this.provider.abortMultipartUpload !== 'function') {
      return;
    }
    return this.provider.abortMultipartUpload(bucket, key, uploadId);
  }
}
