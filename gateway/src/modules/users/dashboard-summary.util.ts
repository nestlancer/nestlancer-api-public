/** Normalize upstream notification list for the client dashboard BFF. */
export function normalizeNotificationsList(payload: unknown): {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
} | null {
  if (!payload || typeof payload !== 'object') return null;
  const rec = payload as Record<string, unknown>;
  const items = Array.isArray(rec.data) ? rec.data : Array.isArray(rec.items) ? rec.items : [];
  const pag =
    rec.pagination && typeof rec.pagination === 'object'
      ? (rec.pagination as Record<string, unknown>)
      : null;
  const page = typeof pag?.page === 'number' ? pag.page : 1;
  const pageSize = typeof pag?.limit === 'number' ? pag.limit : 12;
  const total = typeof pag?.totalItems === 'number' ? pag.totalItems : items.length;
  const totalPages =
    typeof pag?.totalPages === 'number'
      ? pag.totalPages
      : Math.max(1, Math.ceil(total / (pageSize || 1)));
  return {
    items,
    total,
    page,
    pageSize,
    hasMore: typeof pag?.hasNextPage === 'boolean' ? pag.hasNextPage : page < totalPages,
  };
}

export function normalizeNotificationsUnread(payload: unknown): { unread: number } | null {
  if (!payload || typeof payload !== 'object') return null;
  const rec = payload as Record<string, unknown>;
  const unread =
    typeof rec.unread === 'number'
      ? rec.unread
      : typeof rec.count === 'number'
        ? rec.count
        : typeof rec.totalUnread === 'number'
          ? rec.totalUnread
          : 0;
  return { unread };
}

export function normalizeActivityList(payload: unknown): {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
} | null {
  if (!payload || typeof payload !== 'object') return null;
  const rec = payload as Record<string, unknown>;
  const items = Array.isArray(rec.items) ? rec.items : Array.isArray(rec.data) ? rec.data : [];
  const total = typeof rec.total === 'number' ? rec.total : items.length;
  const page = typeof rec.page === 'number' ? rec.page : 1;
  const pageSize =
    typeof rec.pageSize === 'number'
      ? rec.pageSize
      : typeof rec.limit === 'number'
        ? rec.limit
        : 15;
  const hasMore = typeof rec.hasMore === 'boolean' ? rec.hasMore : false;
  return { items, total, page, pageSize, hasMore };
}
