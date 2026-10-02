/** Write an audit log row inside an existing Prisma transaction. */
export async function writeAuditLog(
  tx: {
    auditLog: {
      create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    };
  },
  params: {
    userId?: string;
    action: string;
    category: string;
    description: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      category: params.category,
      description: params.description,
      resourceType: params.resourceType ?? null,
      resourceId: params.resourceId ?? null,
      metadata: params.metadata ?? undefined,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
    },
  });
}
