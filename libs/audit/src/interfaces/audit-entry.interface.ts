export interface AuditEntry {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldData?: unknown;
  newData?: unknown;
  changes?: unknown;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}
