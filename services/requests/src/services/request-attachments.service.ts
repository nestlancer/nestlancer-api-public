import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { StorageService } from '@nestlancer/storage';
import { BusinessLogicException } from '@nestlancer/common';

type AttachmentRecord = {
  id: string;
  filename: string;
  fileUrl: string;
  storageBucket: string | null;
  storageKey: string | null;
  mimeType: string;
  size: number;
  createdAt: Date;
};

@Injectable()
export class RequestAttachmentsService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
  ) {}

  private defaultBucket(): string {
    return this.config.get<string>('requestsService.attachments.s3Bucket') || 'nestlancer-requests';
  }

  private formatAttachment(a: AttachmentRecord) {
    return {
      id: a.id,
      filename: a.filename,
      type: a.mimeType,
      size: a.size,
      uploadedAt: a.createdAt,
    };
  }

  private resolveStorageLocation(attachment: {
    storageBucket: string | null;
    storageKey: string | null;
    fileUrl: string;
  }): { bucket: string; key: string } | null {
    if (attachment.storageBucket && attachment.storageKey) {
      return { bucket: attachment.storageBucket, key: attachment.storageKey };
    }

    try {
      const urlObj = new URL(attachment.fileUrl);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return { bucket: parts[0]!, key: parts.slice(1).join('/') };
      }
    } catch {
      /* legacy rows may have non-URL values */
    }

    return null;
  }

  async getAttachments(userId: string, requestId: string) {
    const request = await this.prismaWrite.projectRequest.findFirst({
      where: { id: requestId, userId, deletedAt: null },
      include: { attachments: true } as any,
    });

    if (!request) throw new BusinessLogicException('Request not found', 'REQUEST_001');

    return (request as any).attachments.map((a: AttachmentRecord) => this.formatAttachment(a));
  }

  async getAttachmentDownloadUrl(userId: string, requestId: string, attachmentId: string) {
    const request = await this.prismaWrite.projectRequest.findFirst({
      where: { id: requestId, userId, deletedAt: null },
    });

    if (!request) throw new BusinessLogicException('Request not found', 'REQUEST_001');

    return this.presignedDownloadForAttachment(requestId, attachmentId);
  }

  async getAttachmentDownloadUrlAdmin(requestId: string, attachmentId: string) {
    const request = await this.prismaRead.projectRequest.findFirst({
      where: { id: requestId, deletedAt: null },
    });

    if (!request) throw new BusinessLogicException('Request not found', 'REQUEST_001');

    return this.presignedDownloadForAttachment(requestId, attachmentId);
  }

  private async presignedDownloadForAttachment(requestId: string, attachmentId: string) {
    const attachment = await this.prismaRead.requestAttachment.findFirst({
      where: { id: attachmentId, requestId },
    });

    if (!attachment) throw new BusinessLogicException('Attachment not found', 'REQUEST_012');

    const location = this.resolveStorageLocation(attachment);
    if (!location) {
      throw new BusinessLogicException('Attachment storage location unavailable', 'REQUEST_012');
    }

    const downloadUrl = await this.storageService.getSignedUrl({
      bucket: location.bucket,
      key: location.key,
      operation: 'get',
      expiresIn: 3600,
    });

    return { downloadUrl, expiresIn: 3600 };
  }

  async addAttachment(userId: string, requestId: string, file: any) {
    const request = await this.prismaWrite.projectRequest.findFirst({
      where: { id: requestId, userId, deletedAt: null },
      include: { _count: { select: { attachments: true } } } as any,
    });

    if (!request) throw new BusinessLogicException('Request not found', 'REQUEST_001');

    if (request.status !== 'DRAFT' && request.status !== 'CHANGES_REQUESTED') {
      throw new BusinessLogicException('Cannot modify submitted request', 'REQUEST_003');
    }

    const maxCount = this.config.get<number>('requestsService.attachments.maxCount') || 10;
    if ((request as any)._count.attachments >= maxCount) {
      throw new BusinessLogicException('Too many attachments', 'REQUEST_011');
    }

    const allowedMimeTypes =
      this.config.get<string[]>('requestsService.attachments.allowedMimeTypes') || [];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BusinessLogicException('Unsupported file format', 'REQUEST_012');
    }

    const maxSize = this.config.get<number>('requestsService.attachments.maxSize') || 10485760;
    if (file.size > maxSize) {
      throw new BusinessLogicException('File too large', 'REQUEST_012');
    }

    const bucket = this.defaultBucket();
    const key = `requests/${requestId}/${Date.now()}_${file.originalname}`;

    const uploadResult = await this.storageService.upload(bucket, key, file.buffer, file.mimetype);

    let attachment;
    try {
      attachment = await this.prismaWrite.requestAttachment.create({
        data: {
          requestId,
          filename: file.originalname,
          fileUrl: uploadResult.url,
          storageBucket: bucket,
          storageKey: uploadResult.key,
          mimeType: file.mimetype,
          size: file.size,
        },
      });
    } catch (error) {
      await this.storageService.delete(bucket, key).catch((e) => {
        console.error('Failed to cleanup attachment from S3 after DB failure', e);
      });
      throw error;
    }

    return this.formatAttachment(attachment as AttachmentRecord);
  }

  async removeAttachment(userId: string, requestId: string, attachmentId: string) {
    const request = await this.prismaWrite.projectRequest.findFirst({
      where: { id: requestId, userId, deletedAt: null },
    });

    if (!request) throw new BusinessLogicException('Request not found', 'REQUEST_001');

    if (request.status !== 'DRAFT' && request.status !== 'CHANGES_REQUESTED') {
      throw new BusinessLogicException('Cannot modify submitted request', 'REQUEST_003');
    }

    const attachment = await this.prismaWrite.requestAttachment.findFirst({
      where: { id: attachmentId, requestId },
    });

    if (!attachment) throw new BusinessLogicException('Attachment not found', 'REQUEST_012');

    await this.prismaWrite.requestAttachment.delete({
      where: { id: attachmentId },
    });

    const location = this.resolveStorageLocation(attachment);
    if (location) {
      try {
        await this.storageService.delete(location.bucket, location.key);
      } catch (e) {
        console.error('Failed to delete attachment from storage', e);
      }
    }

    return true;
  }
}
