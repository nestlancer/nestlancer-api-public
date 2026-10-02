export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  FAILED_LOGIN = 'FAILED_LOGIN',
  STATUS_CHANGE = 'STATUS_CHANGE',
  IMPERSONATE = 'IMPERSONATE',
  EXPORT = 'EXPORT',
  DOWNLOAD = 'DOWNLOAD',
}

export interface AuditQuery {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  resourceType?: string;
  from?: string | Date;
  to?: string | Date;
}

export interface AuditExportResult {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  downloadUrl?: string;
  expiresAt?: Date;
}
