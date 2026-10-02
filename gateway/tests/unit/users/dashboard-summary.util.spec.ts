import {
  normalizeActivityList,
  normalizeNotificationsList,
  normalizeNotificationsUnread,
} from '../../../src/modules/users/dashboard-summary.util';

describe('dashboard-summary.util', () => {
  it('normalizeNotificationsList maps data + pagination correctly', () => {
    const result = normalizeNotificationsList({
      data: [{ id: 'n1' }],
      pagination: {
        page: 1,
        limit: 12,
        totalItems: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    expect(result).toEqual({
      items: [{ id: 'n1' }],
      total: 1,
      page: 1,
      pageSize: 12,
      hasMore: false,
    });
  });

  it('normalizeNotificationsUnread maps count field', () => {
    expect(normalizeNotificationsUnread({ count: 2 })).toEqual({ unread: 2 });
  });

  it('normalizeActivityList maps items array', () => {
    const result = normalizeActivityList({
      items: [{ id: 'a1' }],
      total: 1,
      page: 1,
      pageSize: 15,
      hasMore: false,
    });
    expect(result?.items).toHaveLength(1);
    expect(result?.page).toBe(1);
  });
});
