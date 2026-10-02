import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BusinessLogicException, clientAccessibleProjectWhere } from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { ApproveDeliverableDto } from '../dto/approve-deliverable.dto';
import { RejectDeliverableDto } from '../dto/reject-deliverable.dto';
import { MilestoneApprovalService } from './milestone-approval.service';

@Injectable()
export class DeliverableReviewService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly milestoneApproval: MilestoneApprovalService,
  ) {}

  async approve(deliverableId: string, userId: string, dto: ApproveDeliverableDto) {
    const deliverable = await this.prismaRead.deliverable.findUnique({
      where: { id: deliverableId },
      include: { milestone: { select: { id: true, projectId: true, status: true } } },
    });
    if (!deliverable) throw new NotFoundException('Deliverable not found');
    await this.assertProjectOwner(deliverable.milestone?.projectId, userId);
    if (deliverable.status === 'APPROVED') {
      throw new BadRequestException('Deliverable is already approved');
    }

    // DEL-001: atomic claim — only one concurrent approver wins (updateMany + status guard).
    const claimed = await this.prismaWrite.deliverable.updateMany({
      where: { id: deliverableId, status: { not: 'APPROVED' } },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });
    if (claimed.count === 0) {
      throw new BadRequestException('Deliverable is already approved');
    }

    const updated = await this.prismaWrite.deliverable.findUniqueOrThrow({
      where: { id: deliverableId },
    });

    const milestone = deliverable.milestone;
    if (milestone?.projectId) {
      await this.prismaWrite.progressEntry.create({
        data: {
          projectId: milestone.projectId,
          milestoneId: milestone.id,
          type: 'UPDATE',
          title: 'Deliverable approved',
          description: dto.feedback || 'Client approved a deliverable',
          actorId: userId,
          visibility: 'CLIENT_VISIBLE',
        },
      });
      await this.prismaWrite.outbox.create({
        data: {
          type: 'DELIVERABLE_APPROVED',
          payload: {
            deliverableId,
            milestoneId: milestone.id,
            projectId: milestone.projectId,
            approvedBy: userId,
          },
        },
      });
    }

    // NL-BUG-DEL-001: cascade even when the parent is still PENDING/IN_PROGRESS/REVIEW
    // (admin-created deliverables often skip an explicit milestone complete).
    if (milestone) {
      await this.milestoneApproval.advanceIfDeliverablesClosed(
        milestone.id,
        userId,
        dto.feedback || 'Approved via deliverable acceptance',
      );
    }

    return updated;
  }

  async reject(deliverableId: string, userId: string, dto: RejectDeliverableDto) {
    const deliverable = await this.prismaRead.deliverable.findUnique({
      where: { id: deliverableId },
      include: { milestone: { select: { id: true, projectId: true } } },
    });
    if (!deliverable) throw new NotFoundException('Deliverable not found');
    await this.assertProjectOwner(deliverable.milestone?.projectId, userId);

    const updated = await this.prismaWrite.deliverable.update({
      where: { id: deliverableId },
      data: {
        status: 'REJECTED',
      },
    });

    const milestone = deliverable.milestone;
    if (milestone?.projectId) {
      await this.prismaWrite.progressEntry.create({
        data: {
          projectId: milestone.projectId,
          milestoneId: milestone.id,
          type: 'UPDATE',
          title: 'Deliverable revision requested',
          description: dto.reason,
          actorId: userId,
          visibility: 'CLIENT_VISIBLE',
        },
      });
    }

    return updated;
  }

  private async assertProjectOwner(projectId: string | null | undefined, userId: string) {
    if (!projectId) {
      throw new BusinessLogicException('Project not found', 'PROJECT_001');
    }
    const project = await this.prismaRead.project.findFirst({
      where: clientAccessibleProjectWhere(userId, projectId),
      select: { id: true },
    });
    if (!project) {
      throw new BusinessLogicException('Project not found', 'PROJECT_001');
    }
  }
}
