import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { PortfolioStatus, PortfolioVisibility, Prisma, ProjectStatus } from '@prisma/client';
import { StorageService } from '@nestlancer/storage';
import { CreatePortfolioDraftFromProjectDto } from '../dto/create-portfolio-draft-from-project.dto';
import {
  buildCaseStudyMarkdown,
  computeDurationLabel,
  parseTags,
  sanitizePublicText,
  slugifyTitle,
} from '../utils/portfolio-snapshot.util';

const CONFIDENTIAL_CLIENT = 'Confidential Client';

@Injectable()
export class ProjectPortfolioBridgeService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly storage: StorageService,
  ) {}

  async getPortfolioLink(projectId: string) {
    const item = await this.prismaRead.portfolioItem.findUnique({
      where: { sourceProjectId: projectId },
      select: {
        id: true,
        slug: true,
        status: true,
        visibility: true,
        publishedAt: true,
      },
    });

    if (!item) {
      return { linked: false, projectId };
    }

    const publicBase =
      process.env.FRONTEND_WEB_URL ||
      process.env.WEB_APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://dev-app.nestlancer.com';
    const isPublic =
      item.status === PortfolioStatus.PUBLISHED &&
      (item.visibility === PortfolioVisibility.PUBLIC ||
        item.visibility === PortfolioVisibility.UNLISTED);

    return {
      linked: true,
      projectId,
      portfolioItemId: item.id,
      status: item.status,
      visibility: item.visibility,
      publishedAt: item.publishedAt,
      publicUrl: isPublic ? `${publicBase}/portfolio/${item.slug || item.id}` : undefined,
    };
  }

  async getPreview(projectId: string) {
    const project = await this.loadProjectForBridge(projectId);
    const existing = await this.prismaRead.portfolioItem.findUnique({
      where: { sourceProjectId: projectId },
      select: { id: true, title: true, status: true },
    });

    const consent = await this.prismaRead.projectShowcaseConsent.findUnique({
      where: { projectId },
    });

    const milestones = await this.prismaRead.milestone.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      select: { name: true },
    });

    const deliverables = await this.prismaRead.deliverable.findMany({
      where: { milestone: { projectId } },
      select: { name: true, attachments: true, milestone: { select: { name: true } } },
    });

    const blockers: string[] = [];
    if (project.status !== ProjectStatus.COMPLETED) {
      blockers.push('Project must be COMPLETED before creating a portfolio draft');
    }
    if (existing) {
      blockers.push('A portfolio item is already linked to this project');
    }

    const description = sanitizePublicText(project.description);
    const tags = parseTags(project.tags);
    const milestoneNames = milestones.map((m) => m.name);

    const eligibleMedia = await this.buildEligibleMedia(deliverables);

    return {
      projectId,
      blockers,
      existingPortfolioItemId: existing?.id,
      consent: {
        allowPublicUse: consent?.allowPublicUse ?? false,
        hasTestimonial: Boolean(consent?.testimonialText),
      },
      suggested: {
        title: project.title,
        shortDescription: sanitizePublicText(description, 300),
        fullDescription: buildCaseStudyMarkdown({
          title: project.title,
          description,
          milestoneNames,
        }),
        completedAt: project.completedAt,
        tags,
        client: {
          name: CONFIDENTIAL_CLIENT,
        },
        projectDetails: {
          duration: computeDurationLabel(project.startDate, project.completedAt),
          technologies: tags,
          milestoneCount: milestones.length,
          deliverableCount: deliverables.length,
        },
        testimonial:
          consent?.allowPublicUse && consent.testimonialText
            ? {
                quote: consent.testimonialText,
                author: consent.testimonialAuthor ?? 'Client',
              }
            : undefined,
        stats: {
          milestones: milestones.length,
          deliverables: deliverables.length,
        },
      },
      eligibleMedia,
    };
  }

  async createDraft(projectId: string, adminId: string, dto: CreatePortfolioDraftFromProjectDto) {
    const preview = await this.getPreview(projectId);
    if (preview.blockers.length > 0) {
      throw new BadRequestException(preview.blockers.join('; '));
    }

    const project = await this.loadProjectForBridge(projectId);
    const categoryId = dto.categoryId ?? (await this.resolveDefaultCategoryId());
    const title = dto.title?.trim() || project.title;
    const slug = await this.ensureUniqueSlug(slugifyTitle(title));
    const consent = await this.prismaRead.projectShowcaseConsent.findUnique({
      where: { projectId },
    });

    const shortDescription = preview.suggested.shortDescription;
    const fullDescription = preview.suggested.fullDescription;
    const tags = preview.suggested.tags;

    const item = await this.prismaWrite.portfolioItem.create({
      data: {
        title,
        slug,
        shortDescription,
        fullDescription,
        contentFormat: 'markdown',
        categoryId,
        status: PortfolioStatus.DRAFT,
        visibility: PortfolioVisibility.PRIVATE,
        sourceProjectId: projectId,
        completedAt: project.completedAt,
        clientName: CONFIDENTIAL_CLIENT,
        tags,
        projectDetails: preview.suggested.projectDetails as Prisma.InputJsonValue,
        stats: preview.suggested.stats as Prisma.InputJsonValue,
        clientTestimonial: preview.suggested.testimonial
          ? (preview.suggested.testimonial as Prisma.InputJsonValue)
          : consent?.testimonialText
            ? ({
                quote: consent.testimonialText,
                author: consent.testimonialAuthor ?? 'Client',
              } as Prisma.InputJsonValue)
            : undefined,
        order: 0,
        likeCount: 0,
        viewCount: 0,
      },
      include: { category: true },
    });

    const promoteIds = dto.promoteMediaIds ?? [];
    const promoted: string[] = [];
    for (const mediaId of promoteIds) {
      const copy = await this.promoteMediaToPortfolio({
        sourceMediaId: mediaId,
        projectId,
        portfolioItemId: item.id,
        adminId,
      });
      promoted.push(copy.id);
    }

    if (promoted.length > 0) {
      await this.prismaWrite.portfolioItem.update({
        where: { id: item.id },
        data: {
          thumbnailId: promoted[0],
        },
      });
    }

    await this.prismaWrite.outbox.create({
      data: {
        type: 'PORTFOLIO_DRAFT_CREATED_FROM_PROJECT',
        aggregateType: 'PORTFOLIO',
        aggregateId: item.id,
        payload: { projectId, portfolioItemId: item.id, adminId, promotedMediaIds: promoted },
      },
    });

    return {
      projectId,
      portfolioItemId: item.id,
      slug: item.slug,
      status: item.status,
      promotedMediaCount: promoted.length,
      editPath: `/portfolio/${item.id}/edit`,
    };
  }

  private async loadProjectForBridge(projectId: string) {
    const project = await this.prismaRead.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async resolveDefaultCategoryId(): Promise<string> {
    const preferred = await this.prismaRead.portfolioCategory.findFirst({
      where: { slug: 'web-development' },
    });
    if (preferred) return preferred.id;
    const any = await this.prismaRead.portfolioCategory.findFirst({
      orderBy: { order: 'asc' },
    });
    if (!any) throw new BadRequestException('No portfolio categories configured');
    return any.id;
  }

  private async ensureUniqueSlug(base: string): Promise<string> {
    let slug = base;
    let attempt = 0;
    while (true) {
      const existing = await this.prismaRead.portfolioItem.findFirst({
        where: { slug, deletedAt: null },
      });
      if (!existing) return slug;
      attempt += 1;
      slug = `${base}-${attempt}`;
    }
  }

  private async buildEligibleMedia(
    deliverables: Array<{
      name: string;
      attachments: unknown;
      milestone: { name: string };
    }>,
  ) {
    const entries: Array<{
      mediaId: string;
      filename: string;
      mimeType: string;
      deliverableName: string;
      milestoneName: string;
    }> = [];

    const seen = new Set<string>();
    for (const d of deliverables) {
      if (!Array.isArray(d.attachments)) continue;
      for (const rawId of d.attachments) {
        const mediaId = String(rawId);
        if (seen.has(mediaId)) continue;
        seen.add(mediaId);
        const media = await this.prismaRead.media.findFirst({
          where: { id: mediaId, deletedAt: null },
          select: { id: true, filename: true, mimeType: true, originalFilename: true },
        });
        if (!media) continue;
        if (!media.mimeType.startsWith('image/')) continue;
        entries.push({
          mediaId: media.id,
          filename: media.originalFilename || media.filename,
          mimeType: media.mimeType,
          deliverableName: d.name,
          milestoneName: d.milestone.name,
        });
      }
    }
    return entries;
  }

  async promoteMediaToPortfolio(params: {
    sourceMediaId: string;
    projectId: string;
    portfolioItemId: string;
    adminId: string;
    role?: 'thumbnail' | 'gallery';
  }) {
    const linked = await this.isMediaOnProject(params.projectId, params.sourceMediaId);
    if (!linked) {
      throw new BadRequestException('Media is not attached to this project deliverables');
    }

    const source = await this.prismaRead.media.findFirst({
      where: { id: params.sourceMediaId, deletedAt: null },
    });
    if (!source) throw new NotFoundException('Source media not found');

    const metadata = (source.metadata ?? {}) as Record<string, unknown>;
    const sourceKey = typeof metadata.storageKey === 'string' ? metadata.storageKey : null;
    const sourceBucket =
      typeof metadata.storageBucket === 'string'
        ? metadata.storageBucket
        : process.env.STORAGE_BUCKET_PRIVATE || 'nestlancer-private';
    const publicBucket = process.env.STORAGE_BUCKET_PUBLIC || 'nestlancer-public';

    let destKey: string | null = null;
    let publicUrl: string | undefined;
    if (sourceKey) {
      const ext = source.filename.includes('.')
        ? source.filename.slice(source.filename.lastIndexOf('.'))
        : '';
      destKey = `portfolio/${params.portfolioItemId}/${Date.now()}${ext}`;
      const body = await this.storage.download(sourceBucket, sourceKey);
      const uploaded = await this.storage.upload(publicBucket, destKey, body, source.mimeType);
      publicUrl = uploaded.url;
    }

    const copy = await this.prismaWrite.media.create({
      data: {
        uploaderId: params.adminId,
        filename: source.filename,
        originalFilename: `Portfolio — ${source.originalFilename}`,
        mimeType: source.mimeType,
        size: source.size,
        visibility: 'PUBLIC',
        contextType: 'portfolio',
        contextId: params.portfolioItemId,
        status: source.status,
        urls: publicUrl ? { original: publicUrl } : (source.urls ?? undefined),
        metadata: {
          storageKey: destKey ?? sourceKey,
          storageBucket: destKey ? publicBucket : sourceBucket,
          promotedFromMediaId: source.id,
          promotedFromProjectId: params.projectId,
        },
      },
    });

    if (params.role === 'thumbnail') {
      await this.prismaWrite.portfolioItem.update({
        where: { id: params.portfolioItemId },
        data: { thumbnailId: copy.id },
      });
    } else {
      const count = await this.prismaWrite.portfolioImage.count({
        where: { portfolioItemId: params.portfolioItemId },
      });
      await this.prismaWrite.portfolioImage.create({
        data: {
          portfolioItemId: params.portfolioItemId,
          mediaId: copy.id,
          kind: 'IMAGE',
          order: count,
        },
      });
    }

    return copy;
  }

  private async isMediaOnProject(projectId: string, mediaId: string): Promise<boolean> {
    const deliverables = await this.prismaRead.deliverable.findMany({
      where: { milestone: { projectId } },
      select: { attachments: true },
    });
    return deliverables.some(
      (d) => Array.isArray(d.attachments) && d.attachments.map(String).includes(mediaId),
    );
  }
}
