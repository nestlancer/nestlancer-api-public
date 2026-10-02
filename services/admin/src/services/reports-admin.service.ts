import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { buildAnalyticsReportPdf } from '@nestlancer/pdf';
import { StorageService } from '@nestlancer/storage';
import { DashboardUsersService } from './dashboard-users.service';
import { DashboardProjectsService } from './dashboard-projects.service';
import { DashboardRevenueService } from './dashboard-revenue.service';
import { GenerateReportDto } from '../dto/generate-report.dto';

@Injectable()
export class ReportsAdminService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
    private readonly usersService: DashboardUsersService,
    private readonly projectsService: DashboardProjectsService,
    private readonly revenueService: DashboardRevenueService,
  ) {}

  async listReports(page = 1, limit = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * safeLimit;

    const [items, total] = await Promise.all([
      this.prismaRead.reportExport.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prismaRead.reportExport.count(),
    ]);

    return {
      items,
      pagination: {
        page,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /** PIPE-001: operator-triggered report generation (was cron-only). */
  async generateReport(dto: GenerateReportDto) {
    const type = (dto.type || 'OVERVIEW').toUpperCase();
    const period = (dto.period || 'WEEKLY').toUpperCase();
    const format = (dto.format || 'PDF').toUpperCase();

    const data = await this.collectReportData(type, period);
    const reportsBucket = this.configService.get<string>(
      'STORAGE_BUCKET_REPORTS',
      'nestlancer-reports',
    );

    let buffer: Buffer;
    let contentType: string;
    let ext: string;

    if (format === 'CSV') {
      buffer = Buffer.from(this.toCsv(data), 'utf-8');
      contentType = 'text/csv; charset=utf-8';
      ext = 'csv';
    } else {
      buffer = await buildAnalyticsReportPdf(type, period, data);
      contentType = 'application/pdf';
      ext = 'pdf';
    }

    const filename = `report_${type}_${period}_${Date.now()}.${ext}`;
    const uploaded = await this.storageService.upload(
      reportsBucket,
      filename,
      buffer,
      contentType,
    );

    const row = await this.prismaWrite.reportExport.create({
      data: {
        type,
        period,
        format,
        url: uploaded.url,
      },
    });

    return {
      id: row.id,
      type: row.type,
      period: row.period,
      format: row.format,
      url: row.url,
      createdAt: row.createdAt,
    };
  }

  private async collectReportData(type: string, period: string): Promise<Record<string, unknown>> {
    const dashPeriod = period === 'DAILY' ? 'TODAY' : period === 'YEARLY' ? 'YEAR' : period === 'MONTHLY' ? 'MONTH' : 'WEEK';

    if (type === 'USER_STATS') {
      return { users: await this.usersService.getUserMetrics(dashPeriod as any) };
    }
    if (type === 'PROJECT_STATS') {
      return { projects: await this.projectsService.getProjectMetrics(dashPeriod as any) };
    }
    if (type === 'REVENUE_REPORT') {
      return { revenue: await this.revenueService.getRevenue({ period: dashPeriod } as any) };
    }

    const [users, projects, revenue] = await Promise.all([
      this.usersService.getUserMetrics(dashPeriod as any),
      this.projectsService.getProjectMetrics(dashPeriod as any),
      this.revenueService.getRevenue({ period: dashPeriod } as any),
    ]);
    return { users, projects, revenue };
  }

  private toCsv(data: Record<string, unknown>): string {
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
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        push(prefix ? `${prefix}.${key}` : key, nested);
      }
    };
    push('', data);
    return ['key,value', ...rows.map(([k, v]) => `"${k.replace(/"/g, '""')}","${v.replace(/"/g, '""')}"`)].join(
      '\n',
    );
  }

  async getDownloadUrl(id: string) {
    const report = await this.prismaRead.reportExport.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const bucket = this.configService.get<string>('STORAGE_BUCKET_REPORTS', 'nestlancer-reports');
    const keyMatch = report.url.match(/\/([^/?]+\.(pdf|csv))(?:\?|$)/i);

    if (keyMatch) {
      const downloadUrl = await this.storageService.getSignedUrl({
        bucket,
        key: keyMatch[1],
        expiresIn: 3600,
      });
      return {
        id: report.id,
        type: report.type,
        period: report.period,
        format: report.format,
        downloadUrl,
        expiresIn: 3600,
        createdAt: report.createdAt,
      };
    }

    return {
      id: report.id,
      type: report.type,
      period: report.period,
      format: report.format,
      downloadUrl: report.url,
      expiresIn: 3600,
      createdAt: report.createdAt,
    };
  }
}
