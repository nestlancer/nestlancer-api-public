import { Test, TestingModule } from '@nestjs/testing';
import { OutboxService } from '../../src/outbox.service';
import { OutboxRepository } from '../../src/outbox.repository';
import { OutboxPollerService } from '../../src/outbox-poller.service';
import { PrismaWriteService } from '@nestlancer/database';
import { QueuePublisherService } from '@nestlancer/queue';

describe('Outbox System (Integration)', () => {
  let outboxService: OutboxService;
  let repository: OutboxRepository;
  let poller: OutboxPollerService;
  let prisma: PrismaWriteService;
  let publisher: QueuePublisherService;

  const testExchange = 'events';

  let testEvents: any[] = [];
  const mockPrisma = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    outboxEvent: {
      create: jest.fn().mockImplementation(async (args) => {
        const event = { id: Date.now().toString(), createdAt: new Date(), ...args.data };
        testEvents.push(event);
        return event;
      }),
      findMany: jest.fn().mockImplementation(async (args) => {
        return [...testEvents];
      }),
      update: jest.fn().mockImplementation(async (args) => {
        const event = testEvents.find((e) => e.id === args.where.id);
        if (event) {
          Object.assign(event, args.data);
        }
        return event;
      }),
      findFirst: jest.fn().mockImplementation(async (args) => {
        // naive findFirst
        return testEvents.find((e) => !e.publishedAt) || null;
      }),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    testEvents = [];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        OutboxRepository,
        OutboxPollerService,
        {
          provide: PrismaWriteService,
          useValue: mockPrisma,
        },
        {
          provide: QueuePublisherService,
          useValue: {
            onModuleInit: jest.fn(),
            onModuleDestroy: jest.fn(),
            publish: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    outboxService = module.get<OutboxService>(OutboxService);
    repository = module.get<OutboxRepository>(OutboxRepository);
    poller = module.get<OutboxPollerService>(OutboxPollerService);
    prisma = module.get<PrismaWriteService>(PrismaWriteService);
    publisher = module.get<QueuePublisherService>(QueuePublisherService);

    (repository as any).prisma = prisma;
    poller.setQueuePublisher(publisher);
  });

  afterEach(async () => {
    // cleanup space
  });

  it('should create an outbox event and the poller should process it', async () => {
    const payload = {
      type: 'user.created',
      aggregateType: 'user',
      aggregateId: 'user-123',
      payload: { email: 'test@example.com' },
    };

    // 1. Create event
    await outboxService.createEvent(payload as any);

    // 2. Run poller iteration
    await (poller as any).poll();

    // 3. Verify event is marked as published in DB
    const events = await prisma.outboxEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0].publishedAt).not.toBeNull();
    expect(events[0].type).toBe(payload.type);

    // 4. Verify publisher was called
    expect(publisher.publish).toHaveBeenCalledWith(
      testExchange,
      payload.type,
      expect.objectContaining({
        type: payload.type,
        aggregateId: payload.aggregateId,
      }),
    );
  });

  it('should handle multiple events in order', async () => {
    await outboxService.createEvent({
      type: 'event.1',
      aggregateType: 'test',
      aggregateId: '1',
      payload: {},
    } as any);
    await outboxService.createEvent({
      type: 'event.2',
      aggregateType: 'test',
      aggregateId: '2',
      payload: {},
    } as any);

    await (poller as any).poll();

    const events = await prisma.outboxEvent.findMany({ orderBy: { createdAt: 'asc' } });
    expect(events).toHaveLength(2);
    expect(events[0].publishedAt).not.toBeNull();
    expect(events[1].publishedAt).not.toBeNull();
    expect(publisher.publish).toHaveBeenCalledTimes(2);
  });
});
