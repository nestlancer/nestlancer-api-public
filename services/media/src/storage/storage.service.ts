import { Injectable, Logger } from '@nestjs/common';
import { StorageService as LibStorageService } from '@nestlancer/storage';
import { MediaConfig } from '../config/media.config';
import { generateUuid } from '@nestlancer/common';
import * as path from 'path';

@Injectable()
export class MediaStorageService {
  private readonly logger = new Logger(MediaStorageService.name);

  constructor(private readonly storageProvider: LibStorageService) {}

  generateStorageKey(userId: string, filename: string): string {
    const ext = path.extname(filename);
    const id = generateUuid();
    const date = new Date().toISOString().split('T')[0];
    return `users/${userId}/${date}/${id}${ext}`;
  }

  async generatePresignedUploadUrl(key: string, mimeType: string) {
    return this.storageProvider.getSignedUrl({
      bucket: MediaConfig.S3_PRIVATE_BUCKET,
      key,
      expiresIn: MediaConfig.PRESIGNED_URL_EXPIRY,
      operation: 'put',
      contentType: mimeType,
    });
  }

  async generatePresignedDownloadUrl(key: string, filename?: string) {
    const safeName = (filename || key.split('/').pop() || 'download').replace(
      /["\\\r\n]/g,
      '_',
    );
    return this.storageProvider.getSignedUrl({
      bucket: MediaConfig.S3_PRIVATE_BUCKET,
      key,
      expiresIn: MediaConfig.PRESIGNED_URL_EXPIRY,
      operation: 'get',
      contentDisposition: `attachment; filename="${safeName}"`,
    });
  }

  async upload(bucket: string, key: string, buffer: Buffer, contentType: string) {
    return this.storageProvider.upload(bucket, key, buffer, contentType);
  }

  async deleteFile(key: string) {
    return this.storageProvider.delete(MediaConfig.S3_PRIVATE_BUCKET, key);
  }

  async getFileSize(key: string): Promise<number> {
    return this.storageProvider.getFileSize(MediaConfig.S3_PRIVATE_BUCKET, key);
  }

  get privateBucket(): string {
    return MediaConfig.S3_PRIVATE_BUCKET;
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<string> {
    await this.storageProvider.copyObject(this.privateBucket, sourceKey, destinationKey);
    return destinationKey;
  }

  async createMultipartUpload(key: string, contentType: string) {
    return this.storageProvider.createMultipartUpload(this.privateBucket, key, contentType);
  }

  async getSignedPartUploadUrl(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn?: number,
  ): Promise<string> {
    return this.storageProvider.getSignedPartUploadUrl(
      this.privateBucket,
      key,
      uploadId,
      partNumber,
      expiresIn ?? MediaConfig.PRESIGNED_URL_EXPIRY,
    );
  }

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: { partNumber: number; etag: string }[],
  ): Promise<void> {
    return this.storageProvider.completeMultipartUpload(this.privateBucket, key, uploadId, parts);
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    return this.storageProvider.abortMultipartUpload(this.privateBucket, key, uploadId);
  }
}
