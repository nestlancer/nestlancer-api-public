export class AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  changes?: { before: any; after: any } | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  impersonatedBy?: string | null; // Virtual field mapped to original admin if impersonating
}
