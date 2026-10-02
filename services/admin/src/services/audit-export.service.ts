import { Injectable } from '@nestjs/common';
import { QueuePublisherService } from '@nestlancer/queue';
import { ExportAuditDto } from '../dto/export-audit.dto';
import { AuditExportResult } from '../interfaces/audit.interface';

@Injectable()
export class AuditExportService {
  constructor(private readonly queueService: QueuePublisherService) {}

  async triggerExport(dto: ExportAuditDto): Promise<AuditExportResult> {
    const jobId = `export_${Date.now()}`;

    // Publish export task to background worker
    await this.queueService.publish('admin', 'AUDIT_EXPORT', {
      jobId,
      filters: dto,
    });

    return {
      jobId,
      status: 'QUEUED',
    };
  }
}
