export class BackgroundJob {
  id: string;
  type: string;
  payload?: Record<string, any> | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  result?: Record<string, any> | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  error?: string | null;
  retryCount: number;
  createdAt: Date;
}
