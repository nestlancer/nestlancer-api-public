/** Standard soft-delete where clause */
export const NOT_DELETED = { deletedAt: null };
/** Soft-delete data payload */
export const SOFT_DELETE = { deletedAt: new Date() };
