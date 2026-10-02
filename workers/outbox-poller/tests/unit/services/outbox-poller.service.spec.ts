import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaWriteService } from '@nestlancer/database';
import { MetricsService } from '@nestlancer/metrics';
import { QueuePublisherService } from '@nestlancer/queue';

import { OutboxEventStatus } from '../../../src/interfaces/outbox-event.interface';
import { LeaderElectionService } from '../../../src/services/leader-election.service';
import { OutboxPollerService } from '../../../src/services/outbox-poller.service';
import { OutboxPublisherService } from '../../../src/services/outbox-publisher.service';

const mockMetricsService = {
  createCounter: jest.fn(),
  createGauge: jest.fn(),
  incrementCounter: jest.fn(),
  setGauge: jest.fn(),
};

const mockConfigGet = jest.fn((key: string) => {
  const map: Record<string, number> = {
    'outbox.batchSize': 100,
    'outbox.maxRetries': 5,
    'outbox.retryBackoffMs': 1000,
    'outbox.retryBackoffMaxMs': 300000,
    'outbox.pollingIntervalMs': 5000,
  };
  return map[key] ?? 100;
});

describe('OutboxPollerService', () => {
  let service: OutboxPollerService;
  let prismaWrite: any;
  let leaderElection: jest.Mocked<LeaderElectionService>;
  let publisher: jest.Mocked<OutboxPublisherService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxPollerService,
        {
          provide: PrismaWriteService,
          useValue: {
            outbox: {
              findMany: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: LeaderElectionService,
          useValue: { acquireLock: jest.fn() },
        },
        {
          provide: OutboxPublisherService,
          useValue: { publish: jest.fn() },
        },
        {
          provide: QueuePublisherService,
          useValue: {
            isConnected: jest.fn().mockReturnValue(true),
            ensureChannel: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: mockConfigGet },
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<OutboxPollerService>(OutboxPollerService);
    prismaWrite = module.get(PrismaWriteService);
    leaderElection = module.get(LeaderElectionService);
    publisher = module.get(OutboxPublisherService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('poll', () => {
    it('should do nothing if already processing', async () => {
      (service as any).isProcessing = true;
      await service.poll();
      expect(leaderElection.acquireLock).not.toHaveBeenCalled();
    });

    it('should do nothing if not leader', async () => {
      leaderElection.acquireLock.mockResolvedValue(false);
      await service.poll();
      expect(prismaWrite.outbox.findMany).not.toHaveBeenCalled();
    });

    it('should process batch when leader', async () => {
      leaderElection.acquireLock.mockResolvedValue(true);
      const mockEvents = [
        {
          id: '1',
          type: 'user.created',
          payload: {},
          retries: 0,
          createdAt: new Date(),
          error: null,
          aggregateType: null,
          aggregateId: null,
          publishedAt: null,
          nextRetryAt: null,
        },
        {
          id: '2',
          type: 'payment.success',
          payload: {},
          retries: 0,
          createdAt: new Date(),
          error: null,
          aggregateType: null,
          aggregateId: null,
          publishedAt: null,
          nextRetryAt: null,
        },
      ];
      prismaWrite.outbox.findMany.mockResolvedValue(mockEvents);
      publisher.publish.mockResolvedValue();

      await service.poll();

      expect(prismaWrite.outbox.findMany).toHaveBeenCalledWith({
        where: {
          status: OutboxEventStatus.PENDING,
          OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: expect.any(Date) } }],
        },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });

      expect(publisher.publish).toHaveBeenCalledTimes(2);
      expect(prismaWrite.outbox.update).toHaveBeenCalledTimes(2);
      expect(prismaWrite.outbox.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          status: OutboxEventStatus.PUBLISHED,
          publishedAt: expect.any(Date),
          nextRetryAt: null,
        }),
      });
    });

    it('should handle publisher failure and set nextRetryAt for backoff', async () => {
      leaderElection.acquireLock.mockResolvedValue(true);
      const mockEvent = {
        id: '1',
        type: 'user.created',
        payload: {},
        retries: 0,
        createdAt: new Date(),
        error: null,
        aggregateType: null,
        aggregateId: null,
        publishedAt: null,
        nextRetryAt: null,
      };
      prismaWrite.outbox.findMany.mockResolvedValue([mockEvent]);

      publisher.publish.mockRejectedValue(new Error('Publish Failed'));

      await service.poll();

      expect(prismaWrite.outbox.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          retries: 1,
          error: 'Publish Failed',
          status: OutboxEventStatus.PENDING,
          nextRetryAt: expect.any(Date),
        }),
      });
    });

    it('should mark as FAILED after maxRetries and increment metric', async () => {
      leaderElection.acquireLock.mockResolvedValue(true);
      const mockEvent = {
        id: '1',
        type: 'user.created',
        payload: {},
        retries: 4,
        createdAt: new Date(),
        error: null,
        aggregateType: null,
        aggregateId: null,
        publishedAt: null,
        nextRetryAt: null,
      };
      prismaWrite.outbox.findMany.mockResolvedValue([mockEvent]);

      publisher.publish.mockRejectedValue(new Error('Publish Failed'));

      await service.poll();

      expect(prismaWrite.outbox.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          retries: 5,
          error: 'Publish Failed',
          status: OutboxEventStatus.FAILED,
          nextRetryAt: null,
        }),
      });
      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'outbox_events_marked_failed_total',
      );
    });

    it('should handle general errors safely resetting isProcessing', async () => {
      leaderElection.acquireLock.mockResolvedValue(true);
      prismaWrite.outbox.findMany.mockRejectedValue(new Error('DB connection lost'));

      await service.poll();

      expect((service as any).isProcessing).toBe(false);
    });
  });
});
