import { MilestoneStatus } from '../interfaces/milestone.interface';

export class MilestoneEntity {
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

  // Relations
  deliverables?: any[];
}
