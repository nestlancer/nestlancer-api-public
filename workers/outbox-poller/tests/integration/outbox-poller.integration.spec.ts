import './integration.env';

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';

import { AppModule } from '../../src/app.module';
import { LeaderElectionService } from '../../src/services/leader-election.service';
import { OutboxPollerService } from '../../src/services/outbox-poller.service';
import { OutboxPublisherService } from '../../src/services/outbox-publisher.service';
import { StaleEventMonitorService } from '../../src/services/stale-event-monitor.service';

function loadDevEnv() {
  const envPath = resolve(__dirname, '../../../../.env.development');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...value] = trimmed.split('=');
      if (key) {
        process.env[key.trim()] = value
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  });
}

describe('Outbox Poller (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('QUEUE_OPTIONS')
      .useValue({ url: 'amqp://localhost:5672' })
      .overrideProvider(QueuePublisherService)
      .useValue({ publish: jest.fn() })
      .overrideProvider(QueueConsumerService)
      .useValue({ consume: jest.fn(), getChannel: jest.fn(), onModuleInit: jest.fn() })
      .overrideProvider(DlqService)
      .useValue({})
      .overrideProvider(PrismaWriteService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        outbox: { findMany: jest.fn(), update: jest.fn() },
        $transaction: jest.fn(),
      })
      .overrideProvider(PrismaReadService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        outboxEvent: { findMany: jest.fn(), findFirst: jest.fn() },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Module Initialization', () => {
    it('should initialize the outbox poller application context successfully', () => {
      expect(app).toBeDefined();
    });

    it('should resolve AppModule', () => {
      const appModule = app.get(AppModule);
      expect(appModule).toBeDefined();
    });
  });

  describe('Service Resolution', () => {
    it('should resolve OutboxPollerService', () => {
      const service = app.get(OutboxPollerService);
      expect(service).toBeDefined();
    });

    it('should resolve OutboxPublisherService', () => {
      const service = app.get(OutboxPublisherService);
      expect(service).toBeDefined();
    });

    it('should resolve LeaderElectionService', () => {
      const service = app.get(LeaderElectionService);
      expect(service).toBeDefined();
    });

    it('should resolve StaleEventMonitorService', () => {
      const service = app.get(StaleEventMonitorService);
      expect(service).toBeDefined();
    });
    describe('OutboxPollerService Logic', () => {
      let poller: OutboxPollerService;
      let leaderElection: LeaderElectionService;
      let publisher: OutboxPublisherService;
      let prisma: PrismaWriteService;

      beforeEach(() => {
        poller = app.get(OutboxPollerService);
        leaderElection = app.get(LeaderElectionService);
        publisher = app.get(OutboxPublisherService);
        prisma = app.get(PrismaWriteService);

        jest.spyOn(leaderElection, 'acquireLock').mockResolvedValue(true);
      });

      it('should skip polling if not leader', async () => {
        jest.spyOn(leaderElection, 'acquireLock').mockResolvedValue(false);
        (prisma as any).outbox = { findMany: jest.fn() };

        await poller.poll();

        expect((prisma as any).outbox.findMany).not.toHaveBeenCalled();
      });

      it('should poll pending events and publish successfully', async () => {
        const pendingEvents = [
          {
            id: 'evt-1',
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
        ];

        (prisma as any).outbox = {
          findMany: jest.fn().mockResolvedValue(pendingEvents),
          update: jest.fn().mockResolvedValue({}),
        };
        jest.spyOn(publisher, 'publish').mockResolvedValue(undefined);

        await poller.poll();

        expect(leaderElection.acquireLock).toHaveBeenCalled();
        expect((prisma as any).outbox.findMany).toHaveBeenCalled();
        expect(publisher.publish).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'evt-1',
            eventType: 'user.created',
            payload: {},
            retryCount: 0,
          }),
        );
        expect((prisma as any).outbox.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ status: 'PUBLISHED' }) }),
        );
      });
    });

    describe('OutboxPublisherService Logic', () => {
      let publisher: OutboxPublisherService;
      let queuePublisher: QueuePublisherService;

      beforeEach(() => {
        publisher = app.get(OutboxPublisherService);
        queuePublisher = app.get(QueuePublisherService);
        (queuePublisher.publish as jest.Mock).mockClear();
      });

      it('should route event to correct exchange based on prefix', async () => {
        const event: any = {
          id: 'evt-1',
          eventType: 'payment.succeeded',
          payload: { amount: 100 },
          createdAt: new Date(),
        };

        await publisher.publish(event);

        expect(queuePublisher.publish).toHaveBeenCalledWith(
          'nestlancer.payments',
          'payment.succeeded',
          { amount: 100 },
          expect.objectContaining({ messageId: 'evt-1' }),
        );
      });

      it('should route default events to generic exchange', async () => {
        const event: any = {
          id: 'evt-2',
          eventType: 'system.update',
          payload: {},
          createdAt: new Date(),
        };

        await publisher.publish(event);

        expect(queuePublisher.publish).toHaveBeenCalledWith(
          'nestlancer.events',
          'system.update',
          {},
          expect.any(Object),
        );
      });
    });
  });
});
