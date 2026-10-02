export enum ProgressEntryType {
  UPDATE = 'UPDATE',
  MILESTONE_COMPLETE = 'MILESTONE_COMPLETE',
  DELIVERABLE_UPLOAD = 'DELIVERABLE_UPLOAD',
  STATUS_CHANGE = 'STATUS_CHANGE',
  INTERNAL_NOTE = 'INTERNAL_NOTE',
}

export enum Visibility {
  CLIENT_VISIBLE = 'CLIENT_VISIBLE',
  INTERNAL = 'INTERNAL',
}

export interface ProgressEntry {
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
}

export interface TimelineEntry {
  id: string;
  type: 'PROGRESS' | 'MILESTONE' | 'DELIVERABLE' | 'SYSTEM';
  title: string;
  description: string;
  date: Date;
  metadata?: any;
}

export interface ProgressStats {
  percentageComplete: number;
  currentPhase: string;
  daysRemaining?: number;
}
