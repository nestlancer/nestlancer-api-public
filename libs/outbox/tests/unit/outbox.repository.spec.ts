import { Test, TestingModule } from '@nestjs/testing';
import { OutboxRepository } from '../../src/outbox.repository';

describe('OutboxRepository', () => {
  let repository: OutboxRepository;
  let mockPrisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OutboxRepository],
    }).compile();

    repository = module.get<OutboxRepository>(OutboxRepository);

    mockPrisma = {
      outbox: {
        create: jest.fn().mockResolvedValue({ id: 'new-id' }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 10 }),
      },
    };
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should throw error if prisma is not set', async () => {
    const event = {
      eventType: 'TEST',
      aggregateId: 'id',
      aggregateType: 'TYPE',
      payload: {},
    };
    await expect(repository.create(event)).rejects.toThrow('Database client not initialized');
  });

  it('should use prisma to create event', async () => {
    repository.setPrisma(mockPrisma);
    const event = {
      eventType: 'project.created',
      aggregateId: 'proj-1',
      aggregateType: 'PROJECT',
      payload: { name: 'Test' },
    };

    const id = await repository.create(event);

    expect(id).toBe('new-id');
    expect(mockPrisma.outbox.create).toHaveBeenCalled();
  });

  it('should find pending events', async () => {
    repository.setPrisma(mockPrisma);
    await repository.findPending(10);
    expect(mockPrisma.outbox.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        where: expect.objectContaining({ status: 'PENDING' }),
      }),
    );
  });

  it('should mark event as published', async () => {
    repository.setPrisma(mockPrisma);
    await repository.markPublished('event-1');
    expect(mockPrisma.outbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'event-1' },
        data: expect.objectContaining({ status: 'PUBLISHED' }),
      }),
    );
  });
});
