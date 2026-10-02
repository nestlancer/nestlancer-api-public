import { Test, TestingModule } from '@nestjs/testing';
import { OutboxPollerService } from '../../src/outbox-poller.service';
import { OutboxRepository } from '../../src/outbox.repository';

describe('OutboxPollerService', () => {
  let service: OutboxPollerService;

  const mockRepository = {
    findPending: jest.fn().mockResolvedValue([]),
    markPublished: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
  };

  const mockPublisher = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OutboxPollerService, { provide: OutboxRepository, useValue: mockRepository }],
    }).compile();

    service = module.get<OutboxPollerService>(OutboxPollerService);
    service.setQueuePublisher(mockPublisher);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should not start polling without a queue publisher', () => {
    const moduleWithoutPublisher = Test.createTestingModule({
      providers: [OutboxPollerService, { provide: OutboxRepository, useValue: mockRepository }],
    });
    return moduleWithoutPublisher.compile().then((mod) => {
      const poller = mod.get<OutboxPollerService>(OutboxPollerService);
      poller.onModuleInit();
      jest.advanceTimersByTime(5000);
      expect(mockRepository.findPending).not.toHaveBeenCalled();
      poller.onModuleDestroy();
    });
  });

  it('should poll and publish events', async () => {
    const events = [
      { id: '1', type: 'test', aggregateId: 'a1', aggregateType: 'T', payload: {}, retries: 0 },
    ];
    mockRepository.findPending.mockResolvedValue(events);

    // Initial poll
    service.onModuleInit();
    jest.advanceTimersByTime(5000);

    // Wait for async poll execution
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRepository.findPending).toHaveBeenCalled();
    expect(mockPublisher.publish).toHaveBeenCalledWith(
      process.env.OUTBOX_EXCHANGE || 'events',
      'test',
      expect.objectContaining({ type: 'test' }),
    );
    expect(mockRepository.markPublished).toHaveBeenCalledWith('1');
  });

  it('should mark as failed if publish fails', async () => {
    const events = [
      { id: '1', type: 'test', aggregateId: 'a1', aggregateType: 'T', payload: {}, retries: 0 },
    ];
    mockRepository.findPending.mockResolvedValue(events);
    mockPublisher.publish.mockRejectedValue(new Error('MQ Error'));

    service.onModuleInit();
    jest.advanceTimersByTime(5000);

    await Promise.resolve();
    await Promise.resolve();

    expect(mockRepository.markFailed).toHaveBeenCalledWith('1', 'MQ Error');
  });
});
