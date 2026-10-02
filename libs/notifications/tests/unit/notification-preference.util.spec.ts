import {
  isInQuietHours,
  resolvePreferenceCategory,
  shouldDeliverNotification,
} from '../../src/notification-preference.util';

describe('notification-preference.util', () => {
  it('resolves preference categories from notification types', () => {
    expect(resolvePreferenceCategory('quote.received')).toBe('quotes');
    expect(resolvePreferenceCategory('message.new')).toBe('messages');
  });

  it('detects quiet hours for same-day windows', () => {
    const now = new Date('2026-06-08T15:00:00.000Z');
    expect(isInQuietHours(now, '14:00', '16:00')).toBe(true);
    expect(isInQuietHours(now, '16:00', '18:00')).toBe(false);
  });

  it('evaluates quiet hours in the configured timezone', () => {
    // 15:00 UTC = 20:30 Asia/Kolkata — outside a 14:00–16:00 IST window.
    const now = new Date('2026-06-08T15:00:00.000Z');
    expect(isInQuietHours(now, '14:00', '16:00', 'Asia/Kolkata')).toBe(false);
    expect(isInQuietHours(now, '20:00', '21:00', 'Asia/Kolkata')).toBe(true);
  });

  it('blocks explicitly disabled notification types', () => {
    const allowed = shouldDeliverNotification({
      notificationType: 'quote.received',
      preference: {
        preferences: { disabledTypes: ['quote.received'] },
      },
    });
    expect(allowed).toBe(false);
  });

  it('blocks category-level in-app opt-out', () => {
    const allowed = shouldDeliverNotification({
      notificationType: 'quote.received',
      preference: {
        preferences: {
          quotes: { inApp: false },
        },
      },
    });
    expect(allowed).toBe(false);
  });

  it('allows critical notifications during quiet hours', () => {
    const now = new Date('2026-06-08T15:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    const allowed = shouldDeliverNotification({
      notificationType: 'account.forcePasswordReset',
      priority: 'CRITICAL',
      preference: {
        quietHoursStart: '14:00',
        quietHoursEnd: '16:00',
      },
    });
    expect(allowed).toBe(true);
    jest.useRealTimers();
  });
});
