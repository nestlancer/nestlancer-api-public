import {
  humanizeStatusLabel,
  isNotificationTypeAllowed,
  parseEnabledNotificationTypes,
  preferMapperCopyWhenSparse,
  renderNotificationTemplate,
} from '../../src/notification-template.util';

describe('notification-template.util', () => {
  it('renders {{variable}} placeholders', () => {
    expect(
      renderNotificationTemplate('Hello {{name}}, quote {{quoteId}}', {
        name: 'Jane',
        quoteId: 'q-1',
      }),
    ).toBe('Hello Jane, quote q-1');
  });

  it('collapses empty placeholder remnants', () => {
    expect(renderNotificationTemplate('You have a new message on {{projectTitle}}.', {})).toBe(
      'You have a new message.',
    );
    expect(renderNotificationTemplate('Status changed to {{status}}.', {})).toBe('Status changed.');
    expect(
      renderNotificationTemplate(
        'Your payment of {{amountLabel}} for {{projectTitle}} was received.',
        { amountLabel: '₹100', projectTitle: 'Acme' },
      ),
    ).toBe('Your payment of ₹100 for Acme was received.');
    expect(
      renderNotificationTemplate(
        'Your payment of {{amountLabel}} for {{projectTitle}} was received.',
        { amountLabel: '₹100' },
      ),
    ).toBe('Your payment of ₹100 was received.');
    expect(
      renderNotificationTemplate(
        '{{senderName}} sent a message in {{conversationLabel}}: "{{messagePreview}}"',
        { senderName: 'Admin User', conversationLabel: 'your Direct conversation' },
      ),
    ).toBe('Admin User sent a message in your Direct conversation.');
  });

  it('humanizes status enums', () => {
    expect(humanizeStatusLabel('UNDER_REVIEW')).toBe('Under Review');
  });

  it('prefers mapper copy when template vars are sparse', () => {
    expect(
      preferMapperCopyWhenSparse(
        'Your payment of {{amountLabel}} for {{projectTitle}} was received.',
        {},
        'Your payment was received.',
        'Your payment of ₹500 was received.',
      ),
    ).toBe('Your payment of ₹500 was received.');
  });

  it('prefers richer mapper copy when template has no placeholders', () => {
    expect(
      preferMapperCopyWhenSparse(
        'An offline payment was recorded on your account.',
        {},
        'An offline payment was recorded on your account.',
        'An offline payment of ₹2,000 was recorded on your account.',
      ),
    ).toBe('An offline payment of ₹2,000 was recorded on your account.');
  });

  it('parses enabled notification types from env string', () => {
    const allowlist = parseEnabledNotificationTypes('quote.received, message.new');
    expect(allowlist?.has('quote.received')).toBe(true);
    expect(allowlist?.has('payment.due')).toBe(false);
  });

  it('allows all types when allowlist is unset', () => {
    expect(isNotificationTypeAllowed('quote.received', null)).toBe(true);
  });

  it('blocks types outside allowlist', () => {
    const allowlist = parseEnabledNotificationTypes('quote.received');
    expect(isNotificationTypeAllowed('message.new', allowlist)).toBe(false);
  });
});
