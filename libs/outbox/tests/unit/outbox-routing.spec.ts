import { OUTBOX_TYPE_TO_ROUTING_KEY, resolveOutboxRouting } from '../../src/outbox-routing';

describe('outbox-routing', () => {
  const originalEvents = process.env.RABBITMQ_EXCHANGE_EVENTS;
  const originalEventsAlias = process.env.RABBITMQ_EVENTS_EXCHANGE;

  beforeEach(() => {
    delete process.env.RABBITMQ_EXCHANGE_EVENTS;
    delete process.env.RABBITMQ_EVENTS_EXCHANGE;
  });

  afterEach(() => {
    if (originalEvents === undefined) delete process.env.RABBITMQ_EXCHANGE_EVENTS;
    else process.env.RABBITMQ_EXCHANGE_EVENTS = originalEvents;
    if (originalEventsAlias === undefined) delete process.env.RABBITMQ_EVENTS_EXCHANGE;
    else process.env.RABBITMQ_EVENTS_EXCHANGE = originalEventsAlias;
  });

  it('maps PAYMENT_COMPLETED to payment.payment.completed on nestlancer.events', () => {
    const target = resolveOutboxRouting('PAYMENT_COMPLETED');
    expect(target.routingKey).toBe('payment.payment.completed');
    expect(target.exchange).toBe('nestlancer.events');
  });

  it('maps QUOTE_ACCEPTED to quote.quote.accepted', () => {
    expect(OUTBOX_TYPE_TO_ROUTING_KEY.QUOTE_ACCEPTED).toBe('quote.quote.accepted');
    expect(resolveOutboxRouting('QUOTE_ACCEPTED').routingKey).toBe('quote.quote.accepted');
  });

  it('maps PROJECT_STATUS_CHANGED to project.status.changed', () => {
    expect(resolveOutboxRouting('PROJECT_STATUS_CHANGED').routingKey).toBe(
      'project.status.changed',
    );
  });

  it('maps QUOTE_REVISION_CREATED to document.quote.revised', () => {
    expect(OUTBOX_TYPE_TO_ROUTING_KEY.QUOTE_REVISION_CREATED).toBe('document.quote.revised');
    expect(resolveOutboxRouting('QUOTE_REVISION_CREATED').routingKey).toBe(
      'document.quote.revised',
    );
  });

  it('maps USER_DATA_EXPORT_REQUESTED to export.user.data', () => {
    expect(resolveOutboxRouting('USER_DATA_EXPORT_REQUESTED').routingKey).toBe('export.user.data');
  });
});
