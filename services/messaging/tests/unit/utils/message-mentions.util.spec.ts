import {
  mergeMentionsIntoReactions,
  parseMentionsFromContent,
  readMentionUserIds,
} from '../../../src/utils/message-mentions.util';

describe('message-mentions.util', () => {
  const members = [
    {
      userId: 'user-1',
      user: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
    },
    {
      userId: 'user-2',
      user: { firstName: 'Bob', lastName: 'Lee', email: 'bob@example.com' },
    },
  ];

  it('parses @Full Name mentions', () => {
    const ids = parseMentionsFromContent('Hello @Jane Smith and @Bob Lee', members);
    expect(ids.sort()).toEqual(['user-1', 'user-2']);
  });

  it('parses @{userId} mentions', () => {
    const ids = parseMentionsFromContent('Ping @{user-2}', members);
    expect(ids).toEqual(['user-2']);
  });

  it('merges mentions into reactions blob', () => {
    const merged = mergeMentionsIntoReactions({ pinned: true }, ['user-1']);
    expect(merged).toEqual({ pinned: true, mentions: ['user-1'] });
  });

  it('reads mention ids from reactions', () => {
    expect(readMentionUserIds({ mentions: ['a', 'b'] })).toEqual(['a', 'b']);
  });
});
