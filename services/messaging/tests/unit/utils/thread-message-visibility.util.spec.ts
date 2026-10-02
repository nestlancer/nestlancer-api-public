import {
  buildMessageVisibilityWindows,
  resolveMembershipStatus,
  isMessageVisible,
} from '../../../src/utils/thread-message-visibility.util';

describe('thread-message-visibility.util', () => {
  const t0 = new Date('2026-01-01T10:00:00Z');
  const t1 = new Date('2026-01-01T11:00:00Z');
  const t2 = new Date('2026-01-01T12:00:00Z');
  const t3 = new Date('2026-01-01T13:00:00Z');
  const t4 = new Date('2026-01-01T14:00:00Z');
  const now = new Date('2026-01-01T16:00:00Z');

  it('shows full stint window while user has left (read-only history)', () => {
    const windows = buildMessageVisibilityWindows(
      [{ joinedAt: t0, leftAt: t2, userSentMessage: false }],
      now,
    );
    expect(windows).toEqual([{ from: t0, to: t2 }]);
  });

  it('on rejoin without prior sends, only shows messages from new stint', () => {
    const windows = buildMessageVisibilityWindows(
      [
        { joinedAt: t0, leftAt: t2, userSentMessage: false },
        { joinedAt: t3, leftAt: null, userSentMessage: false },
      ],
      now,
    );
    expect(windows).toEqual([{ from: t3, to: now }]);
    expect(
      isMessageVisible(
        t1,
        [
          { joinedAt: t0, leftAt: t2, userSentMessage: false },
          { joinedAt: t3, leftAt: null, userSentMessage: false },
        ],
        now,
      ),
    ).toBe(false);
  });

  it('on rejoin with prior sends, includes prior stint and current stint (not gap)', () => {
    const windows = buildMessageVisibilityWindows(
      [
        { joinedAt: t0, leftAt: t2, userSentMessage: true },
        { joinedAt: t3, leftAt: null, userSentMessage: false },
      ],
      now,
    );
    expect(windows).toEqual([
      { from: t0, to: t2 },
      { from: t3, to: now },
    ]);
    expect(
      isMessageVisible(
        new Date('2026-01-01T12:30:00Z'),
        [
          { joinedAt: t0, leftAt: t2, userSentMessage: true },
          { joinedAt: t3, leftAt: null, userSentMessage: false },
        ],
        now,
      ),
    ).toBe(false);
  });

  it('resolves membership status from latest stint', () => {
    expect(
      resolveMembershipStatus([
        { joinedAt: t0, leftAt: t2, userSentMessage: true, leftReason: 'LEFT' },
        { joinedAt: t3, leftAt: null, userSentMessage: false },
      ]),
    ).toBe('ACTIVE');
    expect(
      resolveMembershipStatus([
        { joinedAt: t0, leftAt: t2, userSentMessage: false, leftReason: 'REMOVED' },
      ]),
    ).toBe('REMOVED');
  });
});
