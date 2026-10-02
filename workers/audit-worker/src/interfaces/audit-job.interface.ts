/**
 * Represents a single audit log entry describing a system action.
 */
export interface AuditEntry {
  /** The specific action performed (e.g., 'user.login', 'project.create') */
  action: string;
  /** High-level category for the audit entry */
  category: string;
  /** Human-readable description of the event */
  description: string;
  /** The type of resource affected by this action */
  resourceType?: string;
  /** Unique identifier of the affected resource */
  resourceId?: string;
  /** ID of the user who performed the action */
  userId?: string;
  /** Additional structured contextual information */
  metadata?: Record<string, any>;
  /** IP address of the requester */
  ip?: string;
  /** User agent of the requester's client */
  userAgent?: string;
  /** ID of the administrator if this was an impersonated action */
  impersonatedBy?: string;
  /** Timestamp of the event */
  createdAt?: string | Date;
}
