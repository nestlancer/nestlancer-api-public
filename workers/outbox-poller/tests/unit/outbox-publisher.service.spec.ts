import { Test, TestingModule } from '@nestjs/testing';

import { getEventsExchange } from '@nestlancer/outbox';
import { QueuePublisherService } from '@nestlancer/queue';

import { OutboxEvent, OutboxEventStatus } from '../../src/interfaces/outbox-event.interface';
import { OutboxPublisherService } from '../../src/services/outbox-publisher.service';

describe('OutboxPublisherService', () => {
  let service: OutboxPublisherService;
  let queuePublisher: QueuePublisherService;

  const mockQueuePublisher = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const originalEvents = process.env.RABBITMQ_EXCHANGE_EVENTS;
  const originalEventsAlias = process.env.RABBITMQ_EVENTS_EXCHANGE;

  beforeEach(async () => {
    delete process.env.RABBITMQ_EXCHANGE_EVENTS;
    delete process.env.RABBITMQ_EVENTS_EXCHANGE;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxPublisherService,
        { provide: QueuePublisherService, useValue: mockQueuePublisher },
      ],
    }).compile();

    service = module.get<OutboxPublisherService>(OutboxPublisherService);
    queuePublisher = module.get<QueuePublisherService>(QueuePublisherService);
  });

  afterEach(() => {
    if (originalEvents === undefined) delete process.env.RABBITMQ_EXCHANGE_EVENTS;
    else process.env.RABBITMQ_EXCHANGE_EVENTS = originalEvents;
    if (originalEventsAlias === undefined) delete process.env.RABBITMQ_EVENTS_EXCHANGE;
    else process.env.RABBITMQ_EVENTS_EXCHANGE = originalEventsAlias;
  });

  it('should map payment event to correct exchange', async () => {
    const event: OutboxEvent = {
      id: '1',
      aggregateType: 'Payment',
      aggregateId: 'p1',
      eventType: 'payment.created',
      payload: { amount: 100 },
      status: OutboxEventStatus.PENDING,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await service.publish(event);

    expect(queuePublisher.publish).toHaveBeenCalledWith(
      'nestlancer.payments',
      'payment.created',
      event.payload,
      expect.any(Object),
    );
  });

  it('should map notification event to correct exchange', async () => {
    const event: OutboxEvent = {
      id: '2',
      aggregateType: 'Notification',
      aggregateId: 'n1',
      eventType: 'notification.sent',
      payload: { userId: 'u1' },
      status: OutboxEventStatus.PENDING,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await service.publish(event);

    expect(queuePublisher.publish).toHaveBeenCalledWith(
      'nestlancer.notifications',
      'notification.sent',
      event.payload,
      expect.any(Object),
    );
  });

  it('should map PAYMENT_COMPLETED outbox type to payment.payment.completed', async () => {
    const event: OutboxEvent = {
      id: '4',
      aggregateType: 'Payment',
      aggregateId: 'p2',
      eventType: 'PAYMENT_COMPLETED',
      payload: { paymentId: 'pay-1', projectId: 'proj-1' },
      status: OutboxEventStatus.PENDING,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await service.publish(event);

    expect(queuePublisher.publish).toHaveBeenCalledWith(
      getEventsExchange(),
      'payment.payment.completed',
      event.payload,
      expect.any(Object),
    );
  });

  it('should use default exchange for unknown event types', async () => {
    const event: OutboxEvent = {
      id: '3',
      aggregateType: 'Unknown',
      aggregateId: 'x1',
      eventType: 'unknown.action',
      payload: {},
      status: OutboxEventStatus.PENDING,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await service.publish(event);

    expect(queuePublisher.publish).toHaveBeenCalledWith(
      getEventsExchange(),
      'unknown.action',
      event.payload,
      expect.any(Object),
    );
  });
});
