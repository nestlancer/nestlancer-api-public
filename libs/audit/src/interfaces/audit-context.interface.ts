export interface AuditContext {
  userId: string;
  ipAddress: string;
  userAgent: string;
  correlationId: string;
}
