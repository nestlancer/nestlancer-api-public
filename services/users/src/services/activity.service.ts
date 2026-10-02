import { Injectable } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { BusinessLogicException } from '@nestlancer/common';
import { DocumentGenerationService } from '@nestlancer/documents';

/**
 * Service for user activity tracking and data export functionality.
 * Queries audit logs for activity history and manages GDPR data export requests.
 */
@Injectable()
export class ActivityService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly documentGen: DocumentGenerationService,
  ) {}

  /**
   * Retrieves a paginated activity log for a specific user from the audit trail.
   *
   * @param userId - The ID of the user whose activity to retrieve
   * @param page - Page number for pagination (default: 1)
   * @param limit - Number of records per page (default: 20)
   * @returns Paginated list of audit log entries for the user
   */
  async getActivityLog(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prismaRead.auditLog.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          category: true,
          description: true,
          resourceType: true,
          resourceId: true,
          ip: true,
          createdAt: true,
        },
      }),
      this.prismaRead.auditLog.count({ where: { userId } }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Queues a data export job for the user (GDPR compliance).
   * Creates an outbox event to trigger asynchronous export processing.
   *
   * @param userId - The ID of the user requesting data export
   * @returns Export job metadata with estimated completion time
   */
  async requestDataExport(userId: string): Promise<any> {
    const exportId = `export_${Date.now()}_${userId.slice(-6)}`;

    await this.prismaWrite.outbox.create({
      data: {
        type: 'USER_DATA_EXPORT_REQUESTED',
        payload: { userId, exportId },
      },
    });

    return {
      exportId,
      status: 'processing',
      message: 'Data export has been queued. You will be notified when it is ready.',
      estimatedCompletion: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  /**
   * Checks the status of a previously requested data export.
   * Looks for a completion audit log entry to determine if the export is ready.
   *
   * @param userId - The ID of the user who requested the export
   * @param exportId - The unique export job identifier
   * @returns Export status with download URL if completed
   */
  async downloadDataExport(userId: string, exportId: string): Promise<any> {
    const gdprDoc = await this.prismaRead.generatedDocument.findFirst({
      where: {
        documentType: DocumentType.EXPORT_GDPR,
        entityType: 'USER',
        entityId: userId,
        metadata: {
          path: ['exportId'],
          equals: exportId,
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    if (gdprDoc) {
      const latest = await this.documentGen.getLatestDocument(
        DocumentType.EXPORT_GDPR,
        'USER',
        userId,
      );
      return {
        exportId,
        status: 'completed',
        downloadUrl: latest?.downloadUrl ?? null,
        documentNumber: gdprDoc.documentNumber,
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      };
    }

    return {
      exportId,
      status: 'processing',
      downloadUrl: null,
      expiresAt: null,
    };
  }
}
