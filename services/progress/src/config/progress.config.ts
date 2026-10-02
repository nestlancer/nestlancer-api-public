import { registerAs } from '@nestjs/config';

export default registerAs('progress', () => ({
  allowedProgressTypes: ['UPDATE', 'MILESTONE_COMPLETE', 'DELIVERABLE_UPLOAD', 'STATUS_CHANGE'],
  maxDeliverableSizeMb: parseInt(process.env.MAX_DELIVERABLE_SIZE_MB || '50', 10),
  approvalWindowDays: parseInt(process.env.APPROVAL_WINDOW_DAYS || '7', 10),
  maxRevisionsPerMilestone: parseInt(process.env.MAX_REVISIONS_PER_MILESTONE || '3', 10),
}));
