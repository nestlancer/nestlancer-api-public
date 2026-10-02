import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaReadService } from '@nestlancer/database';
import { doesProjectStatusAllowMessaging } from '@nestlancer/common';

import { ThreadMemberStintService } from './thread-member-stint.service';

@Injectable()
export class MessagingAccessService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly stints: ThreadMemberStintService,
  ) {}

  async requireProjectParticipant(userId: string, projectId: string) {
    const project = await this.prismaRead.project.findUnique({
      where: { id: projectId },
      select: { id: true, clientId: true, adminId: true, status: true, deletedAt: true },
    });
    if (!project || project.deletedAt) {
      throw new NotFoundException('Project not found');
    }
    if (project.clientId !== userId && project.adminId !== userId) {
      throw new ForbiddenException('You are not a participant in this project');
    }
    return project;
  }

  async requireProjectMessagingAllowed(userId: string, projectId: string) {
    const project = await this.requireProjectParticipant(userId, projectId);
    if (!doesProjectStatusAllowMessaging(project.status)) {
      throw new ForbiddenException(
        'Messaging is not available for this project yet or it has been closed',
      );
    }
    return project;
  }

  async requireThreadMember(userId: string, threadId: string) {
    const member = await this.prismaRead.chatThreadMember.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this conversation');
    }
    return member;
  }

  /** Active member or former member with retained history access. */
  async requireThreadHistoryAccess(userId: string, threadId: string) {
    const stints = await this.stints.getStintsForUserThread(userId, threadId);
    if (stints.length === 0) {
      throw new ForbiddenException('You are not a member of this conversation');
    }
    return stints;
  }

  async requireMessageAccess(userId: string, messageId: string) {
    const message = await this.prismaRead.message.findUnique({
      where: { id: messageId },
      select: { id: true, projectId: true, threadId: true },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.projectId) {
      await this.requireProjectParticipant(userId, message.projectId);
    } else if (message.threadId) {
      await this.requireThreadHistoryAccess(userId, message.threadId);
    } else {
      throw new NotFoundException('Invalid message context');
    }
    return message;
  }
}
