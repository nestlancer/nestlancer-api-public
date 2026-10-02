import { DeliverableStatus } from '../interfaces/deliverable.interface';

export class DeliverableEntity {
  id: string;
  milestoneId: string;
  description?: string;
  mediaId: string;
  status: DeliverableStatus;
  version: number;
  reviewedAt?: Date;
  reviewedBy?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  media?: any;
}
