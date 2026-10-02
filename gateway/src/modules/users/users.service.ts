import { Injectable, Logger } from '@nestjs/common';

import {
  normalizeActivityList,
  normalizeNotificationsList,
  normalizeNotificationsUnread,
} from './dashboard-summary.util';
import { HttpProxyService } from '../../proxy';

function unwrapServicePayload(payload: unknown): unknown {
  let cur = payload;
  for (let i = 0; i < 3; i++) {
    if (
      cur &&
      typeof cur === 'object' &&
      'status' in cur &&
      (cur as { status: unknown }).status === 'success' &&
      'data' in cur &&
      (cur as { data: unknown }).data !== undefined
    ) {
      cur = (cur as { data: unknown }).data;
      continue;
    }
    break;
  }
  return cur;
}

export interface ClientDashboardSummary {
  projects: unknown;
  requests: unknown;
  messages: unknown;
  payments: unknown;
  notifications: unknown;
  activity: unknown;
  quotes: unknown;
  notificationsUnread: unknown;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly proxy: HttpProxyService) {}

  /**
   * BFF: one round-trip from the browser; parallel upstream calls from the gateway.
   */
  async getDashboardSummary(authorization: string): Promise<ClientDashboardSummary> {
    const headers = { Authorization: authorization };
    const started = Date.now();
    const sliceTimeoutMs = Number(process.env.DASHBOARD_SUMMARY_SLICE_TIMEOUT_MS || 12_000);

    const fetchSlice = (service: string, method: string, path: string) =>
      this.proxy.request(service, method, path, undefined, headers, sliceTimeoutMs);

    const [
      projects,
      requests,
      messages,
      payments,
      notifications,
      activity,
      quotes,
      notificationsUnread,
    ] = await Promise.allSettled([
      fetchSlice('projects', 'GET', '/api/v1/projects/stats'),
      fetchSlice('requests', 'GET', '/api/v1/requests/stats'),
      fetchSlice('messaging', 'GET', '/api/v1/messages/unread-count'),
      fetchSlice('payments', 'GET', '/api/v1/payments/stats'),
      fetchSlice('notifications', 'GET', '/api/v1/notifications?page=1&limit=12'),
      fetchSlice('users', 'GET', '/api/v1/users/activity?page=1&limit=15'),
      fetchSlice('quotes', 'GET', '/api/v1/quotes/stats'),
      fetchSlice('notifications', 'GET', '/api/v1/notifications/unread-count'),
    ]);

    const pick = (result: PromiseSettledResult<unknown>) =>
      result.status === 'fulfilled' ? unwrapServicePayload(result.value) : null;

    const summary: ClientDashboardSummary = {
      projects: pick(projects),
      requests: pick(requests),
      messages: pick(messages),
      payments: pick(payments),
      notifications: normalizeNotificationsList(pick(notifications)),
      activity: normalizeActivityList(pick(activity)),
      quotes: pick(quotes),
      notificationsUnread: normalizeNotificationsUnread(pick(notificationsUnread)),
    };

    const failures = [
      projects,
      requests,
      messages,
      payments,
      notifications,
      activity,
      quotes,
      notificationsUnread,
    ].filter((r) => r.status === 'rejected').length;

    if (failures > 0) {
      this.logger.warn(
        `Dashboard summary: ${failures}/8 upstream slice(s) failed (${Date.now() - started}ms)`,
      );
    } else {
      this.logger.debug(`Dashboard summary assembled in ${Date.now() - started}ms`);
    }

    return summary;
  }
}
