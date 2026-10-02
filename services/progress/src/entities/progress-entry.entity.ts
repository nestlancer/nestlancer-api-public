import { ProgressEntryType, Visibility } from '../interfaces/progress.interface';

export class ProgressEntryEntity {
  id: string;
  projectId: string;
  type: ProgressEntryType;
  title: string;
  description: string;
  milestoneId?: string;
  visibility: Visibility;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  attachments?: any[]; // media entities
}
