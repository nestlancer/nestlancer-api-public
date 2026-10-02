import { Test, TestingModule } from '@nestjs/testing';
import { OutboxModule } from '../../src/outbox.module';
import { OutboxService } from '../../src/outbox.service';
import { OutboxRepository } from '../../src/outbox.repository';
import { ConfigModule } from '@nestjs/config';

describe('OutboxModule (Integration)', () => {
  let module: TestingModule;
  let service: OutboxService;
  let repository: OutboxRepository;
  const mockCreate = jest.fn().mockResolvedValue('event-123');

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgres://localhost:5432/db';
    process.env.REDIS_CACHE_URL = 'redis://localhost:6379';
    process.env.RABBITMQ_URL = 'amqp://localhost';
    process.env.JWT_ACCESS_SECRET = 'secret1234567890';
    process.env.JWT_REFRESH_SECRET = 'secret1234567890';

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        OutboxModule.forRoot(),
      ],
    })
      .overrideProvider(OutboxRepository)
      .useValue({
        create: mockCreate,
      })
      .compile();

    service = module.get<OutboxService>(OutboxService);
    repository = module.get<OutboxRepository>(OutboxRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an outbox event and return its ID', async () => {
    const event = {
      eventType: 'USER_CREATED',
      aggregateType: 'USER',
      aggregateId: 'user-1',
      payload: { email: 'test@example.com' },
    };

    const id = await service.createEvent(event as any);

    expect(id).toBe('event-123');
    expect(mockCreate).toHaveBeenCalledWith(event, undefined);
  });

  it('should pass correct fields to repository.create', async () => {
    const event = {
      eventType: 'PROPOSAL_SUBMITTED',
      aggregateType: 'PROPOSAL',
      aggregateId: 'prop-42',
      payload: { createdById: 'admin-1', projectId: 'proj-1', amount: 5000 },
    };

    await service.createEvent(event as any);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PROPOSAL_SUBMITTED',
        aggregateType: 'PROPOSAL',
        aggregateId: 'prop-42',
        payload: expect.objectContaining({
          createdById: 'admin-1',
          projectId: 'proj-1',
          amount: 5000,
        }),
      }),
      undefined,
    );
  });

  it('should create multiple events sequentially', async () => {
    mockCreate.mockResolvedValueOnce('event-1').mockResolvedValueOnce('event-2');

    const id1 = await service.createEvent({
      eventType: 'ORDER_CREATED',
      aggregateType: 'ORDER',
      aggregateId: 'order-1',
      payload: {},
    } as any);

    const id2 = await service.createEvent({
      eventType: 'PAYMENT_PROCESSED',
      aggregateType: 'PAYMENT',
      aggregateId: 'pay-1',
      payload: {},
    } as any);

    expect(id1).toBe('event-1');
    expect(id2).toBe('event-2');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
