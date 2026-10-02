import { Injectable } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { PrismaReadService } from '@nestlancer/database';
import { DocumentGenerationService } from '@nestlancer/documents';
import { QueryLogsDto } from '../dto/query-logs.dto';

@Injectable()
export class SystemLogsService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly documentGen: DocumentGenerationService,
  ) {}

  async queryLogs(query: QueryLogsDto) {
    const { page = 1, limit = 50, level, service } = query as any;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (level && level !== 'all') {
      where.category = level.toUpperCase();
    }
    if (service && service !== 'all') {
      where.resourceType = service;
    }

    const items = await this.prismaRead.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await this.prismaRead.auditLog.count({ where });

    return {
      data: items.map((i) => ({
        timestamp: i.createdAt,
        level: i.category,
        service: i.resourceType || 'system',
        message: i.description,
      })),
      total,
    };
  }

  async generateDownloadLink(query: QueryLogsDto) {
    const { level, service } = query as any;
    const where: any = {};
    if (level && level !== 'all') where.category = level.toUpperCase();
    if (service && service !== 'all') where.resourceType = service;

    const logs = await this.prismaRead.auditLog.findMany({
      where,
      take: 10000,
      orderBy: { createdAt: 'desc' },
    });

    const csvHeader = 'timestamp,level,service,message,userId,action\n';
    const csvRows = logs
      .map(
        (l) =>
          `"${l.createdAt.toISOString()}","${l.category}","${l.resourceType || 'system'}","${l.description.replace(/"/g, '""')}","${l.userId || ''}","${l.action}"`,
      )
      .join('\n');

    const jobId = `logs_${Date.now()}`;
    const buffer = Buffer.from(csvHeader + csvRows, 'utf-8');

    const result = await this.documentGen.storeBinary({
      documentType: DocumentType.EXPORT_LOGS,
      entityType: 'SYSTEM_LOGS',
      entityId: jobId,
      buffer,
      mimeType: 'text/csv',
      extension: 'csv',
      triggeredByEvent: 'SYSTEM_LOG_EXPORT',
      changeReason: 'System log CSV export',
      metadata: { filters: query },
    });

    return {
      jobId,
      status: 'COMPLETED',
      documentNumber: result.documentNumber,
      downloadUrl: result.downloadUrl,
      // Inline payload so admin UI can download even when signed URL host is internal-only.
      contentBase64: buffer.toString('base64'),
      mimeType: 'text/csv',
      filename: `${result.documentNumber || jobId}.csv`,
      expiresIn: 3600,
    };
  }
}
