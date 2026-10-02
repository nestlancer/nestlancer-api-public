import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { getEventsExchange } from '@nestlancer/outbox';
import { QueuePublisherService } from '@nestlancer/queue';

import { OutboxEvent } from '../../../src/interfaces/outbox-event.interface';
import { OutboxPublisherService } from '../../../src/services/outbox-publisher.service';

describe('OutboxPublisherService', () => {
  let service: OutboxPublisherService;
  let queuePublisher: jest.Mocked<QueuePublisherService>;

  const originalEvents = process.env.RABBITMQ_EXCHANGE_EVENTS;
  const originalEventsAlias = process.env.RABBITMQ_EVENTS_EXCHANGE;

  beforeEach(async () => {
    delete process.env.RABBITMQ_EXCHANGE_EVENTS;
    delete process.env.RABBITMQ_EVENTS_EXCHANGE;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxPublisherService,
        {
          provide: QueuePublisherService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<OutboxPublisherService>(OutboxPublisherService);
    queuePublisher = module.get(QueuePublisherService);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (originalEvents === undefined) delete process.env.RABBITMQ_EXCHANGE_EVENTS;
    else process.env.RABBITMQ_EXCHANGE_EVENTS = originalEvents;
    if (originalEventsAlias === undefined) delete process.env.RABBITMQ_EVENTS_EXCHANGE;
    else process.env.RABBITMQ_EVENTS_EXCHANGE = originalEventsAlias;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publish', () => {
    it('should correctly map eventType to exchange and routing key', async () => {
      const event: OutboxEvent = {
        id: 'evt-1',
        eventType: 'payment.success',
        payload: { test: true },
        aggregateId: 'agg-1',
        aggregateType: 'Payment',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
      };

      await service.publish(event);

      expect(queuePublisher.publish).toHaveBeenCalledWith(
        'nestlancer.payments',
        'payment.success',
        { test: true },
        {
          messageId: 'evt-1',
          timestamp: expect.any(Number),
          persistent: true,
        },
      );
    });

    it('should map notifications to notifications exchange', async () => {
      const event = {
        id: 'evt-2',
        eventType: 'notification.created',
        payload: {},
        createdAt: new Date(),
      } as OutboxEvent;
      await service.publish(event);
      expect(queuePublisher.publish).toHaveBeenCalledWith(
        'nestlancer.notifications',
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should map PAYMENT_COMPLETED to payment.payment.completed on events exchange', async () => {
      const event = {
        id: 'evt-pay',
        eventType: 'PAYMENT_COMPLETED',
        payload: { paymentId: 'p1', projectId: 'proj-1' },
        createdAt: new Date(),
      } as OutboxEvent;
      await service.publish(event);
      expect(queuePublisher.publish).toHaveBeenCalledWith(
        getEventsExchange(),
        'payment.payment.completed',
        event.payload,
        expect.any(Object),
      );
    });

    it('should map unmapped event types to default events exchange', async () => {
      const event = {
        id: 'evt-3',
        eventType: 'custom.event',
        payload: {},
        createdAt: new Date(),
      } as OutboxEvent;
      await service.publish(event);
      expect(queuePublisher.publish).toHaveBeenCalledWith(
        getEventsExchange(),
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });
});
