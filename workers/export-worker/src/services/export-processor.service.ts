import { Injectable, Logger } from '@nestjs/common';
import { DocumentType, Prisma } from '@prisma/client';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { DocumentGenerationService, GeneratedDocumentResult } from '@nestlancer/documents';
import archiver from 'archiver';
import { PassThrough } from 'stream';

/** Queue routing keys (from outbox-routing) → handler event types. */
const ROUTING_KEY_TO_EVENT_TYPE: Record<string, string> = {
  'export.project': 'PROJECT_EXPORT_REQUESTED',
  'export.user.data': 'USER_DATA_EXPORT_REQUESTED',
  'export.revenue': 'REVENUE_EXPORT_REQUESTED',
  'export.blog.posts': 'BLOG_POSTS_EXPORT_REQUESTED',
};

function buildProjectExportReadme(projectTitle: string, payload: Record<string, unknown>): string {
  const jobId = String(payload.jobId || '');
  return `================================================================================
  NESTLANCER — PROJECT HANDOFF EXPORT (ADMIN)
================================================================================

  Project:         ${projectTitle}
  Export type:     PROJECT_EXPORT (DocumentType.EXPORT_PROJECT)
  Job ID:          ${jobId}
  Trigger:         POST /api/v1/admin/projects/:id/export
  Worker:          export-worker → export.project routing key

--------------------------------------------------------------------------------
  ARCHIVE CONTENTS
--------------------------------------------------------------------------------

  project-export.json     Full project snapshot (admin-level detail)
  README.txt              This file

--------------------------------------------------------------------------------
  NOT INCLUDED (by design)
--------------------------------------------------------------------------------

  ✗ Deliverable files (S3 uploads — use Deliverables tab)
  ✗ Message threads
  ✗ quote.internalNotes, admin notes
  ✗ Generated PDF documents (quote/contract/invoice PDFs)

  Amounts in project-export.json are in paise (÷ 100 for INR display).

================================================================================
  Nestlancer Technologies Pvt Ltd · Internal use only
================================================================================
`;
}

@Injectable()
export class ExportProcessorService {
  private readonly logger = new Logger(ExportProcessorService.name);

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly documentGen: DocumentGenerationService,
  ) {}

  async process(routingKey: string, payload: Record<string, unknown>): Promise<void> {
    const eventType =
      (payload.type as string) || ROUTING_KEY_TO_EVENT_TYPE[routingKey] || routingKey;

    switch (eventType) {
      case 'USER_DATA_EXPORT_REQUESTED':
        await this.exportUserData(payload);
        break;
      case 'PROJECT_EXPORT_REQUESTED':
        await this.exportProject(payload);
        break;
      case 'AUDIT_EXPORT':
        await this.exportAudit(payload);
        break;
      case 'REVENUE_EXPORT_REQUESTED':
        await this.exportRevenue(payload);
        break;
      case 'BLOG_POSTS_EXPORT_REQUESTED':
        await this.exportBlogPosts(payload);
        break;
      default:
        this.logger.debug(`Ignoring unhandled export event: ${eventType}`);
    }
  }

  private async emitExportCompleted(payload: Record<string, unknown>): Promise<void> {
    await this.prismaWrite.outbox.create({
      data: {
        type: 'EXPORT_COMPLETED',
        aggregateType: 'EXPORT',
        aggregateId: String(payload.exportId || payload.jobId || payload.documentId || ''),
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }

  private async createZipBuffer(files: Record<string, string>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const stream = new PassThrough();
      const chunks: Buffer[] = [];

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
      archive.on('error', reject);

      archive.pipe(stream);
      for (const [name, content] of Object.entries(files)) {
        archive.append(content, { name });
      }
      archive.finalize();
    });
  }

  private async exportUserData(payload: Record<string, unknown>) {
    const userId = (payload.userId as string) || (payload.aggregateId as string);
    if (!userId) return;

    const user = await this.prismaRead.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        preferences: true,
      },
    });

    const projects = await this.prismaRead.project.findMany({
      where: { clientId: userId },
      select: { id: true, title: true, status: true, createdAt: true },
    });

    const payments = await this.prismaRead.payment.findMany({
      where: { clientId: userId },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paidAt: true,
        createdAt: true,
      },
    });

    const exportData = { user, projects, payments, exportedAt: new Date().toISOString() };
    const zipBuffer = await this.createZipBuffer({
      'user-data.json': JSON.stringify(exportData, null, 2),
      'README.txt':
        'GDPR data export from Nestlancer. Contains profile, projects, and payment metadata.',
    });

    const result = await this.documentGen.storeBinary({
      documentType: DocumentType.EXPORT_GDPR,
      entityType: 'USER',
      entityId: userId,
      buffer: zipBuffer,
      mimeType: 'application/zip',
      extension: 'zip',
      issuedToUserId: userId,
      triggeredByEvent: 'USER_DATA_EXPORT_REQUESTED',
      changeReason: 'GDPR data export',
      metadata: { jobId: payload.jobId, exportId: payload.exportId },
    });

    await this.completeExport(result, {
      exportType: 'gdpr',
      exportId: payload.exportId || payload.jobId,
      userId,
      requestedByUserId: userId,
      title: 'Your data export is ready',
    });
  }

  private async exportProject(payload: Record<string, unknown>) {
    const projectId = (payload.projectId as string) || (payload.aggregateId as string);
    if (!projectId) return;

    const project = await this.prismaRead.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: { select: { id: true, name: true, status: true, amount: true } },
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        quote: {
          select: {
            id: true,
            title: true,
            totalAmount: true,
            status: true,
            quoteNumber: true,
          },
        },
      },
    });
    if (!project) return;

    const payments = await this.prismaRead.payment.findMany({
      where: { projectId },
      select: { id: true, amount: true, status: true, paidAt: true, milestoneId: true },
    });

    const exportData = { project, payments, exportedAt: new Date().toISOString() };
    const zipBuffer = await this.createZipBuffer({
      'project-export.json': JSON.stringify(exportData, null, 2),
      'README.txt': buildProjectExportReadme(project.title, payload),
    });

    const result = await this.documentGen.storeBinary({
      documentType: DocumentType.EXPORT_PROJECT,
      entityType: 'PROJECT',
      entityId: projectId,
      buffer: zipBuffer,
      mimeType: 'application/zip',
      extension: 'zip',
      triggeredByEvent: 'PROJECT_EXPORT_REQUESTED',
      changeReason: 'Project handoff export',
      metadata: { jobId: payload.jobId, title: project.title },
    });

    await this.completeExport(result, {
      exportType: 'project',
      exportId: payload.jobId,
      projectId,
      requestedByUserId: payload.requestedBy || payload.requestedByUserId,
      title: `Project export ready: ${project.title}`,
    });
  }

  private async exportAudit(payload: Record<string, unknown>) {
    const filters = (payload.filters as Record<string, unknown>) || {};
    const format = String(filters.format || payload.format || 'csv').toLowerCase();
    const logs = await this.prismaRead.auditLog.findMany({
      where: {
        ...(filters.userId ? { userId: filters.userId as string } : {}),
        ...(filters.action ? { action: filters.action as string } : {}),
      },
      take: 10000,
      orderBy: { createdAt: 'desc' },
    });

    const jobId = (payload.jobId as string) || `audit_${Date.now()}`;
    let buffer: Buffer;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      buffer = Buffer.from(
        JSON.stringify({ logs, exportedAt: new Date().toISOString(), filters }, null, 2),
        'utf-8',
      );
      mimeType = 'application/json';
      extension = 'json';
    } else {
      const csvHeader = 'id,userId,action,category,resourceType,resourceId,createdAt\n';
      const csvRows = logs
        .map(
          (l) =>
            `${l.id},${l.userId || ''},${l.action},${l.category},${l.resourceType || ''},${l.resourceId || ''},${l.createdAt.toISOString()}`,
        )
        .join('\n');
      buffer = Buffer.from(csvHeader + csvRows, 'utf-8');
      mimeType = 'text/csv';
      extension = 'csv';
    }

    const result = await this.documentGen.storeBinary({
      documentType: DocumentType.EXPORT_AUDIT,
      entityType: 'AUDIT',
      entityId: jobId,
      buffer,
      mimeType,
      extension,
      triggeredByEvent: 'AUDIT_EXPORT',
      changeReason: 'Audit log export',
      metadata: { ...filters, format },
    });

    await this.completeExport(result, {
      exportType: 'audit',
      exportId: jobId,
      requestedByUserId: payload.requestedByUserId,
      title: 'Audit log export is ready',
    });
  }

  private async exportRevenue(payload: Record<string, unknown>) {
    const startDate =
      payload.startDate || payload.from
        ? new Date((payload.startDate || payload.from) as string)
        : undefined;
    const endDate =
      payload.endDate || payload.to
        ? new Date((payload.endDate || payload.to) as string)
        : undefined;
    const format = String(payload.format || 'csv').toLowerCase();

    const payments = await this.prismaRead.payment.findMany({
      where: {
        status: 'COMPLETED',
        ...(startDate || endDate
          ? {
              paidAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      include: {
        project: { select: { title: true } },
        client: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const rows = payments.map((p) => ({
      id: p.id,
      project: p.project.title,
      client: `${p.client.firstName} ${p.client.lastName}`,
      clientEmail: p.client.email,
      amount: p.amount,
      currency: p.currency,
      paidAt: p.paidAt?.toISOString() || null,
    }));

    const jobId =
      (payload.exportId as string) || (payload.jobId as string) || `revenue_${Date.now()}`;
    let buffer: Buffer;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      buffer = Buffer.from(
        JSON.stringify(
          {
            payments: rows,
            exportedAt: new Date().toISOString(),
            period: { from: payload.from, to: payload.to },
          },
          null,
          2,
        ),
        'utf-8',
      );
      mimeType = 'application/json';
      extension = 'json';
    } else {
      const csvHeader = 'id,project,client,clientEmail,amount,currency,paidAt\n';
      const csvRows = rows
        .map(
          (p) =>
            `${p.id},"${p.project}","${p.client}",${p.clientEmail},${p.amount},${p.currency},${p.paidAt || ''}`,
        )
        .join('\n');
      buffer = Buffer.from(csvHeader + csvRows, 'utf-8');
      mimeType = 'text/csv';
      extension = 'csv';
    }

    const result = await this.documentGen.storeBinary({
      documentType: DocumentType.EXPORT_REVENUE,
      entityType: 'REVENUE',
      entityId: jobId,
      buffer,
      mimeType,
      extension,
      triggeredByEvent: 'REVENUE_EXPORT_REQUESTED',
      changeReason: 'Revenue export',
      metadata: {
        startDate: payload.startDate || payload.from,
        endDate: payload.endDate || payload.to,
        format,
      },
    });

    await this.completeExport(result, {
      exportType: 'revenue',
      exportId: jobId,
      requestedByUserId: payload.requestedByUserId,
      title: 'Revenue export is ready',
    });
  }

  private async exportBlogPosts(payload: Record<string, unknown>) {
    const filters = (payload.filters as Record<string, unknown>) || {};
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.categoryId) where.categoryId = filters.categoryId;

    const posts = await this.prismaRead.blogPost.findMany({
      where,
      take: 5000,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        excerpt: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const exportId = (payload.exportId as string) || `blog_${Date.now()}`;
    const buffer = Buffer.from(
      JSON.stringify({ posts, exportedAt: new Date().toISOString() }, null, 2),
    );

    const result = await this.documentGen.storeBinary({
      documentType: DocumentType.EXPORT_AUDIT,
      entityType: 'BLOG',
      entityId: exportId,
      buffer,
      mimeType: 'application/json',
      extension: 'json',
      triggeredByEvent: 'BLOG_POSTS_EXPORT_REQUESTED',
      changeReason: 'Blog posts export',
      metadata: filters,
    });

    await this.completeExport(result, {
      exportType: 'blog',
      exportId,
      requestedByUserId: payload.requestedByUserId,
      title: 'Blog posts export is ready',
    });
  }

  private async completeExport(
    result: GeneratedDocumentResult,
    meta: Record<string, unknown>,
  ): Promise<void> {
    await this.emitExportCompleted({
      ...meta,
      documentId: result.id,
      downloadUrl: result.downloadUrl,
    });
    this.logger.log(`Export completed: ${meta.exportType} document=${result.id}`);
  }
}
