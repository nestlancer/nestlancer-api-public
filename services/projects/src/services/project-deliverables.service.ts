import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { BusinessLogicException, clientAccessibleProjectWhere } from '@nestlancer/common';
import { NestlancerConfigService } from '@nestlancer/config';
import { StorageService } from '@nestlancer/storage';

type DeliverableMediaUrl = {
  url: string;
  label: string;
  mediaId: string;
  size?: number;
};

@Injectable()
export class ProjectDeliverablesService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly storage: StorageService,
    private readonly config: NestlancerConfigService,
  ) {}

  private async resolveAttachmentUrls(attachments: unknown): Promise<DeliverableMediaUrl[]> {
    if (!Array.isArray(attachments) || attachments.length === 0) {
      return [];
    }

    const mediaIds = attachments.map((id) => String(id));
    const mediaRecords = await this.prismaRead.media.findMany({
      where: { id: { in: mediaIds } },
    });
    const mediaById = new Map(mediaRecords.map((media) => [media.id, media]));

    return Promise.all(
      mediaIds.map(async (mediaId) => {
        const media = mediaById.get(mediaId);
        const label = media?.originalFilename || media?.filename || 'File';
        const size = typeof media?.size === 'number' ? media.size : undefined;

        if (!media) {
          return { url: '', label, mediaId, size };
        }

        const metadata = media.metadata as Record<string, unknown> | null;
        const storageKey = typeof metadata?.storageKey === 'string' ? metadata.storageKey : null;

        if (!storageKey) {
          return { url: '', label, mediaId, size };
        }

        const url = await this.storage.getSignedUrl({
          bucket: this.config.storageBucketPrivate,
          key: storageKey,
          expiresIn: 3600,
        });

        return { url, label, mediaId, size };
      }),
    );
  }

  async getDeliverables(
    userId: string,
    projectId: string,
  ): Promise<{ total: number; completed: number; pending: number; items: any[] }> {
    const project = await this.prismaRead.project.findFirst({
      where: clientAccessibleProjectWhere(userId, projectId),
    });

    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');

    const milestones = await this.prismaRead.milestone.findMany({
      where: { projectId },
      select: { id: true, status: true },
    });

    const milestoneIds = milestones.map((m) => m.id);

    // NL-DEL-003/004: heal stale open deliverables under already-approved milestones.
    const approvedMilestoneIds = milestones
      .filter((m) => String(m.status).toUpperCase() === 'APPROVED')
      .map((m) => m.id);
    if (approvedMilestoneIds.length > 0) {
      await this.prismaWrite.deliverable.updateMany({
        where: {
          milestoneId: { in: approvedMilestoneIds },
          status: {
            in: [
              'READY_FOR_REVIEW',
              'PENDING',
              'IN_PROGRESS',
              'REVISION_REQUESTED',
            ],
          },
        },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      });
    }

    // NL-DEL-002 / DEL-003: PENDING|IN_PROGRESS|REVIEW|COMPLETED with all
    // deliverables closed → APPROVED (not only COMPLETED).
    const cascadeEligible = new Set(['PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']);
    const healIds = milestones
      .filter((m) => cascadeEligible.has(String(m.status).toUpperCase()))
      .map((m) => m.id);
    for (const mid of healIds) {
      const remaining = await this.prismaWrite.deliverable.count({
        where: {
          milestoneId: mid,
          status: {
            in: [
              'READY_FOR_REVIEW',
              'PENDING',
              'IN_PROGRESS',
              'REVISION_REQUESTED',
            ],
          },
        },
      });
      if (remaining === 0) {
        const anyDeliverables = await this.prismaWrite.deliverable.count({
          where: { milestoneId: mid },
        });
        if (anyDeliverables > 0) {
          const now = new Date();
          await this.prismaWrite.milestone.updateMany({
            where: {
              id: mid,
              status: { in: ['PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'] },
            },
            data: { status: 'APPROVED', approvedAt: now, completedAt: now },
          });
        }
      }
    }

    const items = await this.prismaRead.deliverable.findMany({
      where: { milestoneId: { in: milestoneIds } },
      orderBy: { createdAt: 'desc' },
    });

    for (const item of items) {
      if (item.attachments && Array.isArray(item.attachments)) {
        (item as any).mediaUrls = await this.resolveAttachmentUrls(item.attachments);
      }
    }

    const total = items.length;
    const completed = items.filter((i) => i.status === 'APPROVED').length;
    const pending = items.filter(
      (i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS',
    ).length;

    return {
      total,
      completed,
      pending,
      items,
    };
  }

  // Admin and contractor methods would be here to upload and approve
}
