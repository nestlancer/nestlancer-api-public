import { MilestoneStatus } from '@nestlancer/common';

export { MilestoneStatus };

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: MilestoneStatus;
  startDate: Date;
  endDate: Date;
  completedAt?: Date;
  approvedAt?: Date;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MilestoneWithDeliverables extends Milestone {
  deliverables: any[];
}

export const MILESTONE_STATUS_FLOW = {
  [MilestoneStatus.PENDING]: [MilestoneStatus.IN_PROGRESS],
  [MilestoneStatus.IN_PROGRESS]: [MilestoneStatus.COMPLETED, MilestoneStatus.REVIEW],
  [MilestoneStatus.COMPLETED]: [MilestoneStatus.APPROVED, MilestoneStatus.REVISION_REQUESTED],
  [MilestoneStatus.REVIEW]: [MilestoneStatus.APPROVED, MilestoneStatus.REVISION_REQUESTED],
  [MilestoneStatus.REVISION_REQUESTED]: [MilestoneStatus.COMPLETED, MilestoneStatus.REVIEW],
  [MilestoneStatus.APPROVED]: [],
  [MilestoneStatus.CANCELLED]: [],
};
