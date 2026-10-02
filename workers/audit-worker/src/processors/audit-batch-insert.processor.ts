import * as fs from 'fs';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaWriteService } from '@nestlancer/database';

import { AuditEntryDto } from '../dto/audit-entry.dto';

@Injectable()
export class AuditBatchInsertProcessor {
  private readonly logger = new Logger(AuditBatchInsertProcessor.name);
  private readonly fallbackFilePath: string;

  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly configService: ConfigService,
  ) {
    this.fallbackFilePath = this.configService.get<string>(
      'audit.fallbackFilePath',
      '/tmp/audit-fallback.jsonl',
    );
  }

  async insertBatch(entries: AuditEntryDto[]): Promise<void> {
    if (entries.length === 0) return;

    try {
      await this.prisma.auditLog.createMany({
        data: entries.map((entry) => ({
          action: entry.action,
          category: entry.category,
          description: entry.description,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          userId: entry.userId,
          metadata: entry.metadata,
          ip: entry.ip,
          userAgent: entry.userAgent,
          impersonatedBy: entry.impersonatedBy,
          createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
        })),
      });
      this.logger.log(`Successfully inserted batch of ${entries.length} audit entries.`);
    } catch (error: any) {
      this.logger.error(`Failed to insert audit batch: ${error.message}`, error.stack);
      await this.handleFallback(entries);
    }
  }

  private async handleFallback(entries: AuditEntryDto[]): Promise<void> {
    this.logger.warn(
      `Writing ${entries.length} entries to fallback file: ${this.fallbackFilePath}`,
    );
    const data = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    try {
      await fs.promises.appendFile(this.fallbackFilePath, data);
    } catch (err: any) {
      this.logger.error(`CRITICAL: Failed to write to fallback file: ${err.message}`);
      // At this point, we might want to log the data directly to console as a last resort
      this.logger.error('Audit fallback data:', data);
    }
  }
}
