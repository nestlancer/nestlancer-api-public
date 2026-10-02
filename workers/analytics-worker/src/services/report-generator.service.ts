import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';
import { buildAnalyticsReportPdf } from '@nestlancer/pdf';
import { StorageService } from '@nestlancer/storage';

import { AnalyticsWorkerService } from './analytics-worker.service';
import { AnalyticsJobType, Period, ExportFormat } from '../interfaces/analytics-job.interface';

@Injectable()
export class ReportGeneratorService {
  constructor(
    private readonly logger: LoggerService,
    private readonly storageService: StorageService,
    private readonly analyticsWorkerService: AnalyticsWorkerService,
    private readonly configService: ConfigService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  async generateReport(
    type: AnalyticsJobType,
    period: Period,
    format: ExportFormat,
    data: any,
  ): Promise<string> {
    this.logger.log(`Generating ${format} report for ${type} (${period})`);

    let buffer: Buffer;
    const contentType = format === ExportFormat.PDF ? 'application/pdf' : 'text/csv; charset=utf-8';
    if (format === ExportFormat.PDF) {
      buffer = await this.generatePdfBuffer(type, period, data);
    } else {
      buffer = Buffer.from(this.generateCsv(data), 'utf-8');
    }

    const filename = `report_${type}_${period}_${Date.now()}.${format === ExportFormat.PDF ? 'pdf' : 'csv'}`;
    const reportsBucket = this.configService.get<string>(
      'analytics-worker.reportS3Bucket',
      'nestlancer-reports',
    );
    const result = await this.storageService.upload(reportsBucket, filename, buffer, contentType);

    try {
      await this.prismaWrite.reportExport.create({
        data: {
          type,
          period,
          format,
          url: result.url,
        },
      });
    } catch (error) {
      await this.storageService.delete(reportsBucket, filename).catch((e) => {
        this.logger.error('Failed to cleanup report from S3 after DB failure', e.stack);
      });
      throw error;
    }

    return result.url;
  }

  /**
   * Flattens a nested object into CSV rows (key, value).
   * Dates and objects are stringified for CSV compatibility.
   */
  private generateCsv(data: any): string {
    const rows: Array<[string, string]> = [];
    const push = (prefix: string, value: unknown): void => {
      if (value === null || value === undefined) {
        rows.push([prefix, '']);
        return;
      }
      if (typeof value !== 'object' || value instanceof Date) {
        rows.push([prefix, String(value instanceof Date ? value.toISOString() : value)]);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, i) => push(`${prefix}[${i}]`, item));
        return;
      }
      for (const [k, v] of Object.entries(value)) {
        const key = prefix ? `${prefix}.${k}` : k;
        push(key, v);
      }
    };
    push('', data);
    const escape = (s: string) => {
      if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const header = 'key,value\r\n';
    const body = rows.map(([k, v]) => `${escape(k)},${escape(v)}`).join('\r\n');
    return header + body;
  }

  async generateComprehensiveReport(period: Period): Promise<string> {
    this.logger.log(`Generating comprehensive report for period: ${period}`);

    const projectData = await this.analyticsWorkerService.getLatest(AnalyticsJobType.PROJECT_STATS);
    const userData = await this.analyticsWorkerService.getLatest(AnalyticsJobType.USER_STATS);
    const revenueData = await this.analyticsWorkerService.getLatest(
      AnalyticsJobType.REVENUE_REPORT,
    );

    const comprehensiveData = {
      period,
      generatedAt: new Date(),
      projects: projectData?.data || {},
      users: userData?.data || {},
      revenue: revenueData?.data || {},
    };

    return this.generateReport(
      AnalyticsJobType.ENGAGEMENT_METRICS,
      period,
      ExportFormat.PDF,
      comprehensiveData,
    );
  }

  private async generatePdfBuffer(
    type: AnalyticsJobType,
    period: Period,
    data: any,
  ): Promise<Buffer> {
    return buildAnalyticsReportPdf(type, period, data);
  }
}
