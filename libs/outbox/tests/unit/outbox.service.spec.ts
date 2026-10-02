import { Test, TestingModule } from '@nestjs/testing';
import { OutboxService } from '../../src/outbox.service';
import { OutboxRepository } from '../../src/outbox.repository';

describe('OutboxService', () => {
  let service: OutboxService;
  let repository: OutboxRepository;

  const mockRepository = {
    create: jest.fn().mockResolvedValue('event-id'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OutboxService, { provide: OutboxRepository, useValue: mockRepository }],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
    repository = module.get<OutboxRepository>(OutboxRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an outbox event', async () => {
    const event = {
      eventType: 'project.created',
      aggregateId: 'proj-1',
      aggregateType: 'PROJECT',
      payload: { name: 'Test' },
    };

    const id = await service.createEvent(event);

    expect(id).toBe('event-id');
    expect(mockRepository.create).toHaveBeenCalledWith(event, undefined);
  });

  it('should pass transaction client if provided', async () => {
    const event = {
      eventType: 'payment.completed',
      aggregateId: 'pay-1',
      aggregateType: 'PAYMENT',
      payload: { amount: 100 },
    };
    const mockTx = { outboxEvent: { create: jest.fn() } };

    await service.createEvent(event, mockTx);

    expect(mockRepository.create).toHaveBeenCalledWith(event, mockTx);
  });
});
