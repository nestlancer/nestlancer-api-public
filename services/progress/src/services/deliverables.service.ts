import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { NestlancerConfigService } from '@nestlancer/config';
import { StorageService } from '@nestlancer/storage';
import { assertProjectWorkAllowed } from '@nestlancer/common';
import { UploadDeliverableDto } from '../dto/upload-deliverable.dto';
import { UpdateDeliverableDto } from '../dto/update-deliverable.dto';
import { MilestoneApprovalService } from './milestone-approval.service';

@Injectable()
export class DeliverablesService {
  private readonly logger = new Logger(DeliverablesService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly storage: StorageService,
    private readonly config: NestlancerConfigService,
    private readonly milestoneApproval: MilestoneApprovalService,
  ) {}

  async create(projectId: string, dto: UploadDeliverableDto) {
    const milestone = await this.prismaRead.milestone.findFirst({
      where: { id: dto.milestoneId, projectId },
      include: { project: { select: { id: true, clientId: true, title: true, status: true } } },
    });
    if (!milestone) throw new NotFoundException('Milestone not found for this project');
    assertProjectWorkAllowed(milestone.project.status ?? 'IN_PROGRESS');

    const deliverable = await this.prismaWrite.$transaction(async (tx: any) => {
      let deliverableName = 'Deliverable';
      const explicitName = dto.name?.trim();
      const description = dto.description?.trim();
      if (explicitName) {
        deliverableName = explicitName;
      } else if (description) {
        deliverableName = description.length > 80 ? `${description.slice(0, 79).trimEnd()}…` : description;
      } else if (milestone.name?.trim()) {
        deliverableName = String(milestone.name).trim();
      } else if (dto.mediaIds.length > 0) {
        const media = await tx.media.findFirst({
          where: { id: { in: dto.mediaIds } },
          select: { filename: true },
          orderBy: { createdAt: 'asc' },
        });
        if (media?.filename?.trim()) {
          deliverableName = media.filename.trim();
        }
      }

      // NL-DATA-002: return existing deliverable with same name on this milestone.
      const existing = await tx.deliverable.findFirst({
        where: {
          milestoneId: dto.milestoneId,
          name: { equals: deliverableName, mode: 'insensitive' },
        },
        orderBy: { createdAt: 'asc' },
      });
      if (existing) {
        return existing;
      }

      const created = await tx.deliverable.create({
        data: {
          milestoneId: dto.milestoneId,
          name: deliverableName,
          description: dto.description,
          status: 'READY_FOR_REVIEW',
          attachments: dto.mediaIds,
        },
      });

      // Keep ownership (uploaderId) unchanged; tag media for organization inside the uploader's storage.
      if (dto.mediaIds.length > 0) {
        await tx.media.updateMany({
          where: {
            id: { in: dto.mediaIds },
            OR: [{ contextType: null }, { contextId: null }],
          },
          data: {
            contextType: 'project',
            contextId: projectId,
          },
        });
      }

      await tx.outbox.create({
        data: {
          type: 'DELIVERABLE_UPLOADED',
          aggregateType: 'DELIVERABLE',
          aggregateId: created.id,
          payload: {
            deliverableId: created.id,
            projectId,
            milestoneId: dto.milestoneId,
            userId: milestone.project.clientId,
            projectTitle: milestone.project.title,
            name: created.name,
          },
        },
      });

      return created;
    });

    return deliverable;
  }

  async getProjectDeliverables(projectId: string) {
    const milestones = await this.prismaRead.milestone.findMany({
      where: { projectId },
      select: { id: true, status: true },
    });

    const milestoneIds = milestones.map((m) => m.id);
    const approvedMilestoneIds = milestones
      .filter((m) => String(m.status).toUpperCase() === 'APPROVED')
      .map((m) => m.id);

    // NL-DEL-003/004: heal stale open deliverables under already-approved milestones.
    if (approvedMilestoneIds.length > 0) {
      await this.milestoneApproval.healOpenDeliverablesForApprovedMilestones(approvedMilestoneIds);
    }

    // NL-DEL-002 / DEL-003: PENDING|IN_PROGRESS|REVIEW|COMPLETED with all
    // deliverables closed → advance milestone (not only COMPLETED).
    const cascadeIds = milestones
      .filter((m) =>
        ['PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'].includes(
          String(m.status).toUpperCase(),
        ),
      )
      .map((m) => m.id);
    for (const mid of cascadeIds) {
      try {
        // actorId must be a real user or null — 'system' violates ProgressEntry_actorId_fkey
        // and 500s this GET for any milestone whose deliverables are already closed.
        await this.milestoneApproval.advanceIfDeliverablesClosed(
          mid,
          null,
          'Reconciled after deliverable approval',
        );
      } catch (err) {
        this.logger.error(
          `deliverable reconcile failed for milestone ${mid}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    const deliverables = await this.prismaRead.deliverable.findMany({
      where: { milestoneId: { in: milestoneIds } },
      orderBy: { createdAt: 'desc' },
    });

    for (const d of deliverables) {
      if (d.attachments && Array.isArray(d.attachments)) {
        const mediaIds = d.attachments.map((id) => String(id));
        const mediaRecords = await this.prismaRead.media.findMany({
          where: { id: { in: mediaIds } },
        });
        const mediaById = new Map(mediaRecords.map((media) => [media.id, media]));

        const mediaUrls = await Promise.all(
          mediaIds.map(async (mediaId) => {
            const media = mediaById.get(mediaId);
            const label = media?.originalFilename || media?.filename || 'File';

            if (!media) {
              return { url: '', label, mediaId };
            }

            const metadata = media.metadata as Record<string, unknown> | null;
            const storageKey =
              typeof metadata?.storageKey === 'string' ? metadata.storageKey : null;
            const size = typeof media.size === 'number' ? media.size : undefined;

            if (!storageKey) {
              return { url: '', label, mediaId, size };
            }

            return {
              url: await this.storage.getSignedUrl({
                bucket: this.config.storageBucketPrivate,
                key: storageKey,
                expiresIn: 3600,
              }),
              label,
              mediaId,
              size,
            };
          }),
        );
        (d as any).mediaUrls = mediaUrls;
      }
    }

    return deliverables;
  }

  async update(id: string, dto: UpdateDeliverableDto) {
    try {
      const existing = await this.prismaRead.deliverable.findUnique({
        where: { id },
        include: {
          milestone: {
            include: { project: { select: { id: true, clientId: true, title: true } } },
          },
        },
      });
      if (!existing) throw new NotFoundException('Deliverable not found');

      const data: { description?: string; status?: any } = {};
      if (dto.status !== undefined) data.status = dto.status;
      if (dto.description !== undefined) {
        data.description = dto.description;
      } else if (dto.status === 'REJECTED' && dto.rejectionReason?.trim()) {
        data.description = `Rejected: ${dto.rejectionReason.trim()}`;
      }

      const deliverable = await this.prismaWrite.$transaction(async (tx: any) => {
        const updated = await tx.deliverable.update({
          where: { id },
          data,
        });

        if (dto.status === 'APPROVED' && existing.status !== 'APPROVED') {
          await tx.outbox.create({
            data: {
              type: 'DELIVERABLE_APPROVED',
              aggregateType: 'DELIVERABLE',
              aggregateId: id,
              payload: {
                deliverableId: id,
                projectId: existing.milestone.project.id,
                userId: existing.milestone.project.clientId,
                projectTitle: existing.milestone.project.title,
                name: existing.name,
              },
            },
          });
        }

        return updated;
      });

      // NL-DEL-002: admin deliverable approve must also clear "Awaiting client approval".
      if (dto.status === 'APPROVED' && existing.status !== 'APPROVED' && existing.milestone) {
        await this.milestoneApproval.advanceIfDeliverablesClosed(
          existing.milestone.id,
          existing.milestone.project.clientId,
          'Approved via admin deliverable acceptance',
        );
      }

      return deliverable;
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundException('Deliverable not found');
      }
      throw error;
    }
  }

  async delete(id: string) {
    try {
      await this.prismaWrite.deliverable.delete({
        where: { id },
      });
      return { success: true };
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundException('Deliverable not found');
      }
      throw error;
    }
  }
}
