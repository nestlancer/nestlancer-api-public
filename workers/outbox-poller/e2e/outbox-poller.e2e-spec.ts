import {
  setupApp,
  teardownApp,
  getApp,
  getQueuePublishMock,
  getOutboxFindManyMock,
  getOutboxUpdateMock,
  getLeaderAcquireLockMock,
} from './setup';
import { OutboxPollerService } from '../src/services/outbox-poller.service';
import { OutboxPublisherService } from '../src/services/outbox-publisher.service';
import { LeaderElectionService } from '../src/services/leader-election.service';
import { StaleEventMonitorService } from '../src/services/stale-event-monitor.service';
import { OutboxEventStatus } from '../src/interfaces/outbox-event.interface';

/** Minimal outbox event shape as returned by findMany and consumed by publisher (id, eventType, payload, status, retries, createdAt). */
function makePendingEvent(
  overrides: {
    id?: string;
    eventType?: string;
    payload?: unknown;
    retries?: number;
  } = {},
) {
  return {
    id: 'evt-e2e-1',
    type: 'payment.succeeded',
    aggregateType: 'Payment',
    aggregateId: 'pay-1',
    eventType: 'payment.succeeded',
    payload: { amount: 1000, currency: 'INR' },
    status: OutboxEventStatus.PENDING,
    retries: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('Outbox Poller - E2E', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('should bootstrap worker and resolve key services', () => {
      const app = getApp();
      expect(app).toBeDefined();
      expect(app.get(OutboxPollerService)).toBeDefined();
      expect(app.get(OutboxPublisherService)).toBeDefined();
      expect(app.get(LeaderElectionService)).toBeDefined();
      expect(app.get(StaleEventMonitorService)).toBeDefined();
    });
  });

  describe('OutboxPollerService - poll and processBatch (E2E)', () => {
    let poller: OutboxPollerService;
    const findManyMock = getOutboxFindManyMock();
    const updateMock = getOutboxUpdateMock();
    const publishMock = getQueuePublishMock();
    const acquireLockMock = getLeaderAcquireLockMock();

    beforeEach(() => {
      poller = getApp().get(OutboxPollerService);
      findManyMock.mockReset();
      findManyMock.mockResolvedValue([]);
      updateMock.mockReset();
      updateMock.mockResolvedValue(undefined);
      publishMock.mockClear();
      publishMock.mockResolvedValue(undefined);
      acquireLockMock.mockReset();
      acquireLockMock.mockResolvedValue(true);
    });

    it('when leader and pending events exist, poll runs processBatch and publishes then marks events PUBLISHED', async () => {
      const event = makePendingEvent({ id: 'evt-1', eventType: 'payment.succeeded' });
      findManyMock.mockResolvedValueOnce([event]);

      await poller.poll();

      expect(acquireLockMock).toHaveBeenCalledTimes(1);
      expect(findManyMock).toHaveBeenCalledTimes(1);
      expect(publishMock).toHaveBeenCalledTimes(1);
      expect(publishMock).toHaveBeenCalledWith(
        'nestlancer.payments',
        'payment.succeeded',
        event.payload,
        expect.objectContaining({
          messageId: event.id,
          persistent: true,
        }),
      );
      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: event.id },
        data: expect.objectContaining({
          status: OutboxEventStatus.PUBLISHED,
        }),
      });
      expect(updateMock.mock.calls[0][0].data.publishedAt).toBeDefined();
    });

    it('when leader and no pending events, poll does not call publish or update', async () => {
      findManyMock.mockResolvedValueOnce([]);

      await poller.poll();

      expect(acquireLockMock).toHaveBeenCalledTimes(1);
      expect(findManyMock).toHaveBeenCalledTimes(1);
      expect(publishMock).not.toHaveBeenCalled();
      expect(updateMock).not.toHaveBeenCalled();
    });

    it('when not leader, poll does not call findMany or publish', async () => {
      acquireLockMock.mockResolvedValueOnce(false);
      findManyMock.mockResolvedValueOnce([makePendingEvent()]);

      await poller.poll();

      expect(acquireLockMock).toHaveBeenCalledTimes(1);
      expect(findManyMock).not.toHaveBeenCalled();
      expect(publishMock).not.toHaveBeenCalled();
      expect(updateMock).not.toHaveBeenCalled();
    });

    it('when publish throws, poll updates event with incremented retries and PENDING when below max retries', async () => {
      // .env.e2e sets OUTBOX_MAX_RETRIES=3; newRetries must stay < maxRetries to remain PENDING.
      const event = makePendingEvent({ id: 'evt-fail', retries: 0 });
      findManyMock.mockResolvedValueOnce([event]);
      publishMock.mockRejectedValueOnce(new Error('Broker unavailable'));

      await poller.poll();

      expect(publishMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: event.id },
        data: expect.objectContaining({
          retries: 1,
          error: 'Broker unavailable',
          status: OutboxEventStatus.PENDING,
          nextRetryAt: expect.any(Date),
        }),
      });
    });

    it('when publish throws and incremented retries reach max retries, poll marks event FAILED', async () => {
      const event = makePendingEvent({ id: 'evt-fail-max', retries: 2 });
      findManyMock.mockResolvedValueOnce([event]);
      publishMock.mockRejectedValueOnce(new Error('Broker unavailable'));

      await poller.poll();

      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: event.id },
        data: expect.objectContaining({
          retries: 3,
          error: 'Broker unavailable',
          status: OutboxEventStatus.FAILED,
          nextRetryAt: null,
        }),
      });
    });
  });

  describe('OutboxPublisherService - publish exchange and routing (E2E)', () => {
    let publisher: OutboxPublisherService;
    const publishMock = getQueuePublishMock();

    beforeEach(() => {
      publisher = getApp().get(OutboxPublisherService);
      publishMock.mockClear();
      publishMock.mockResolvedValue(undefined);
    });

    it('publish maps payment.* eventType to nestlancer.payments exchange and correct routing key', async () => {
      const event = makePendingEvent({ eventType: 'payment.succeeded', id: 'pay-evt-1' });
      await publisher.publish(event as any);

      expect(publishMock).toHaveBeenCalledTimes(1);
      expect(publishMock).toHaveBeenCalledWith(
        'nestlancer.payments',
        'payment.succeeded',
        event.payload,
        expect.any(Object),
      );
    });

    it('publish maps notification.* eventType to nestlancer.notifications exchange', async () => {
      const event = makePendingEvent({ eventType: 'notification.created', id: 'not-evt-1' });
      await publisher.publish(event as any);

      expect(publishMock).toHaveBeenCalledWith(
        'nestlancer.notifications',
        'notification.created',
        event.payload,
        expect.any(Object),
      );
    });

    it('publish maps email.* eventType to nestlancer.email exchange', async () => {
      const event = makePendingEvent({ eventType: 'email.sent', id: 'em-evt-1' });
      await publisher.publish(event as any);

      expect(publishMock).toHaveBeenCalledWith(
        'nestlancer.email',
        'email.sent',
        event.payload,
        expect.any(Object),
      );
    });

    it('publish maps unknown eventType to default nestlancer.events exchange', async () => {
      const event = makePendingEvent({ eventType: 'system.health', id: 'sys-evt-1' });
      await publisher.publish(event as any);

      expect(publishMock).toHaveBeenCalledWith(
        'nestlancer.events',
        'system.health',
        event.payload,
        expect.any(Object),
      );
    });
  });
});
