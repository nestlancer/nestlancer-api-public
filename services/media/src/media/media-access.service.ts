import { Injectable } from '@nestjs/common';

import { PrismaReadService } from '@nestlancer/database';
import { ResourceNotFoundException } from '@nestlancer/common';

type MediaAccessRecord = {
  id?: string;
  uploaderId: string;
  contextType: string | null;
  contextId: string | null;
  /** PRIVATE files are not granted by project membership alone (NL-BUG-DEL-1). */
  visibility?: string | null;
};

@Injectable()
export class MediaAccessService {
  constructor(private readonly prismaRead: PrismaReadService) {}

  async assertCanAccessMedia(userId: string, media: MediaAccessRecord): Promise<void> {
    if (await this.canAccessMedia(userId, media)) {
      return;
    }
    throw new ResourceNotFoundException('Media');
  }

  async canAccessMedia(userId: string, media: MediaAccessRecord & { id?: string }): Promise<boolean> {
    if (media.uploaderId === userId) {
      return true;
    }

    const isPrivate = (media.visibility ?? 'PRIVATE') === 'PRIVATE';

    if (media.contextType === 'project' && media.contextId) {
      // NL-BUG-DEL-1: project membership must not expose PRIVATE operator artifacts.
      // Explicit deliverable attachments remain reachable even when PRIVATE.
      if (isPrivate) {
        return media.id ? this.isDeliverableAttachmentForUser(userId, media.id) : false;
      }
      const project = await this.prismaRead.project.findUnique({
        where: { id: media.contextId },
        select: { clientId: true, adminId: true, deletedAt: true },
      });
      if (!project || project.deletedAt) {
        return false;
      }
      return project.clientId === userId || project.adminId === userId;
    }

    if (media.contextType === 'thread' && media.contextId) {
      const member = await this.prismaRead.chatThreadMember.findUnique({
        where: { threadId_userId: { threadId: media.contextId, userId } },
      });
      return !!member;
    }

    if (media.contextType === 'message' && media.contextId) {
      // Message attachments are an explicit share path — allow even when PRIVATE.
      const message = await this.prismaRead.message.findUnique({
        where: { id: media.contextId },
        select: { senderId: true, projectId: true, threadId: true, deletedAt: true },
      });
      if (!message || message.deletedAt) {
        return false;
      }
      if (message.senderId === userId) {
        return true;
      }
      if (message.threadId) {
        const member = await this.prismaRead.chatThreadMember.findUnique({
          where: { threadId_userId: { threadId: message.threadId, userId } },
        });
        if (member) {
          return true;
        }
      }
      if (message.projectId) {
        const project = await this.prismaRead.project.findUnique({
          where: { id: message.projectId },
          select: { clientId: true, adminId: true, deletedAt: true },
        });
        if (project && !project.deletedAt) {
          return project.clientId === userId || project.adminId === userId;
        }
      }
    }

    // Deliverable attachments may lack contextType — allow project participants via JSON refs.
    if (media.id) {
      return this.isDeliverableAttachmentForUser(userId, media.id);
    }

    return false;
  }

  private async isDeliverableAttachmentForUser(userId: string, mediaId: string): Promise<boolean> {
    const projects = await this.prismaRead.project.findMany({
      where: {
        deletedAt: null,
        OR: [{ clientId: userId }, { adminId: userId }],
      },
      select: { id: true },
    });
    if (projects.length === 0) return false;

    const milestones = await this.prismaRead.milestone.findMany({
      where: { projectId: { in: projects.map((p) => p.id) } },
      select: { id: true },
    });
    if (milestones.length === 0) return false;

    const deliverables = await this.prismaRead.deliverable.findMany({
      where: { milestoneId: { in: milestones.map((m) => m.id) } },
      select: { attachments: true },
    });

    for (const row of deliverables) {
      if (!Array.isArray(row.attachments)) continue;
      if (row.attachments.map(String).includes(mediaId)) {
        return true;
      }
    }
    return false;
  }
}
