import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { DocumentType } from '@prisma/client';
import { StorageService } from '@nestlancer/storage';
import { DOCUMENT_BUCKET_MAP, DOCUMENT_STORAGE_PREFIX } from './interfaces/document.interface';

@Injectable()
export class DocumentStorageService {
  constructor(
    private readonly storage: StorageService,
    private readonly configService: ConfigService,
  ) {}

  getBucket(documentType: DocumentType): string {
    const envKey = DOCUMENT_BUCKET_MAP[documentType];
    const defaults: Record<string, string> = {
      STORAGE_BUCKET_QUOTES: 'nestlancer-quotes-pdfs',
      STORAGE_BUCKET_PDFS: 'nestlancer-pdfs',
      STORAGE_BUCKET_REPORTS: 'nestlancer-reports',
      STORAGE_BUCKET_PRIVATE: 'nestlancer-private',
    };
    return this.configService.get<string>(envKey, defaults[envKey] || 'nestlancer-private');
  }

  buildStorageKey(
    documentType: DocumentType,
    entityId: string,
    versionNumber: number,
    documentNumber: string,
    extension = 'pdf',
    issuedToUserId?: string | null,
  ): string {
    const prefix = DOCUMENT_STORAGE_PREFIX[documentType];
    const safeNumber = documentNumber.replace(/[^a-zA-Z0-9-]/g, '');
    const relative = `${prefix}/${entityId}/v${versionNumber}/${safeNumber}.${extension}`;
    // New docs for a user account follow media-like account scoping.
    if (issuedToUserId) {
      return `users/${issuedToUserId}/documents/${relative}`;
    }
    return relative;
  }

  computeHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  async upload(
    bucket: string,
    key: string,
    buffer: Buffer,
    mimeType: string,
    metadata?: Record<string, string>,
  ): Promise<{ fileHash: string; fileSize: number }> {
    const fileHash = this.computeHash(buffer);
    await this.storage.upload(bucket, key, buffer, mimeType, metadata);
    return { fileHash, fileSize: buffer.length };
  }

  async getDownloadUrl(bucket: string, key: string, expiresIn = 900): Promise<string> {
    return this.storage.getSignedUrl({ bucket, key, expiresIn });
  }
}
