import { Injectable } from '@nestjs/common';
import { PrismaReadService, ReadOnly } from '@nestlancer/database';

export type AdminMediaReference = {
  type: string;
  resourceId: string;
  label: string;
  adminPath: string;
};

type DeliverableReferenceRow = {
  id: string;
  name: string;
  projectId: string | null;
};

type ProgressReferenceRow = {
  id: string;
  type: string;
  projectId: string;
};

@Injectable()
export class AdminMediaReferencesService {
  constructor(private readonly prismaRead: PrismaReadService) {}

  @ReadOnly()
  async findReferences(mediaId: string): Promise<{
    references: AdminMediaReference[];
    referenceCount: number;
  }> {
    const references: AdminMediaReference[] = [];

    const media = await this.prismaRead.media.findUnique({
      where: { id: mediaId },
      select: { contextType: true, contextId: true, filename: true },
    });

    if (!media) {
      return { references: [], referenceCount: 0 };
    }

    if (media.contextType && media.contextId) {
      references.push({
        type: media.contextType,
        resourceId: media.contextId,
        label: `${media.contextType}: ${media.contextId}`,
        adminPath: this.contextAdminPath(media.contextType, media.contextId),
      });
    }

    const portfolioImages = await this.prismaRead.portfolioImage.findMany({
      where: { mediaId },
      include: { portfolioItem: { select: { id: true, title: true, slug: true } } },
    });
    for (const row of portfolioImages) {
      references.push({
        type: 'portfolio_image',
        resourceId: row.portfolioItem.id,
        label: `Portfolio image: ${row.portfolioItem.title}`,
        adminPath: `/portfolio/${row.portfolioItem.id}`,
      });
    }

    const portfolioHero = await this.prismaRead.portfolioItem.findMany({
      where: { OR: [{ thumbnailId: mediaId }, { videoId: mediaId }] },
      select: { id: true, title: true },
    });
    for (const row of portfolioHero) {
      references.push({
        type: 'portfolio_hero',
        resourceId: row.id,
        label: `Portfolio hero: ${row.title}`,
        adminPath: `/portfolio/${row.id}`,
      });
    }

    const blogPosts = await this.prismaRead.blogPost.findMany({
      where: { featuredImageId: mediaId },
      select: { id: true, title: true },
    });
    for (const row of blogPosts) {
      references.push({
        type: 'blog',
        resourceId: row.id,
        label: `Blog featured: ${row.title}`,
        adminPath: `/blog/${row.id}`,
      });
    }

    const shareLinks = await this.prismaRead.mediaShareLink.findMany({
      where: { mediaId },
      select: { id: true, token: true },
    });
    for (const row of shareLinks) {
      references.push({
        type: 'share',
        resourceId: row.id,
        label: `Share link: ${row.token.slice(0, 8)}…`,
        adminPath: `/media?share=${row.token}`,
      });
    }

    const deliverables = await this.prismaRead.$queryRaw<DeliverableReferenceRow[]>`
      SELECT d.id, d.name, m."projectId"
      FROM "Deliverable" d
      INNER JOIN "Milestone" m ON m.id = d."milestoneId"
      WHERE d.attachments IS NOT NULL
        AND d.attachments::jsonb @> ${JSON.stringify([mediaId])}::jsonb
    `;
    for (const row of deliverables) {
      references.push({
        type: 'deliverable',
        resourceId: row.id,
        label: `Deliverable: ${row.name}`,
        adminPath: row.projectId ? `/projects/${row.projectId}` : `/projects`,
      });
    }

    const progressEntries = await this.prismaRead.$queryRaw<ProgressReferenceRow[]>`
      SELECT id, type, "projectId"
      FROM "ProgressEntry"
      WHERE details IS NOT NULL
        AND (
          (details->'attachmentIds')::jsonb @> ${JSON.stringify([mediaId])}::jsonb
          OR (details->'attachmentids')::jsonb @> ${JSON.stringify([mediaId])}::jsonb
        )
    `;
    for (const row of progressEntries) {
      references.push({
        type: 'progress',
        resourceId: row.id,
        label: `PROGRESS entry: ${row.type}`,
        adminPath: `/projects/${row.projectId}`,
      });
    }

    const fileMessages = await this.prismaRead.message.findMany({
      where: { type: 'FILE' },
      select: { id: true, projectId: true, threadId: true, content: true },
    });
    for (const row of fileMessages) {
      const parsed = this.parseMessageMediaId(row.content);
      if (parsed === mediaId) {
        references.push({
          type: 'message',
          resourceId: row.id,
          label: `Message attachment`,
          adminPath: row.projectId
            ? `/messages/projects/${row.projectId}`
            : row.threadId
              ? `/messages/threads/${row.threadId}`
              : '/messages',
        });
      }
    }

    const unique = references.filter((ref, index, all) => {
      const key = `${ref.type}:${ref.resourceId}:${ref.label}`;
      return all.findIndex((r) => `${r.type}:${r.resourceId}:${r.label}` === key) === index;
    });

    return { references: unique, referenceCount: unique.length };
  }

  private contextAdminPath(contextType: string, contextId: string): string {
    switch (contextType) {
      case 'project':
        return `/projects/${contextId}`;
      case 'thread':
        return `/messages/threads/${contextId}`;
      case 'message':
        return `/messages/${contextId}`;
      default:
        return `/media?search=${encodeURIComponent(contextId)}`;
    }
  }

  private parseMessageMediaId(content: string | null | undefined): string | null {
    if (!content) return null;
    try {
      const parsed = JSON.parse(content) as { mediaId?: string };
      return parsed.mediaId ? String(parsed.mediaId) : null;
    } catch {
      return null;
    }
  }
}
