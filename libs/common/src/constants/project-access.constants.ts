/** Projects with this status are hidden from client-facing APIs. */
export const ARCHIVED_PROJECT_STATUS = 'ARCHIVED' as const;

export function clientAccessibleProjectWhere(clientId: string, projectId?: string) {
  return {
    clientId,
    deletedAt: null,
    status: { not: ARCHIVED_PROJECT_STATUS },
    ...(projectId ? { id: projectId } : {}),
  };
}
